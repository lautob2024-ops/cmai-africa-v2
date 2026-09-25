import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { courses, paymentRequests, users } from "../drizzle/schema";
import type { User } from "../drizzle/schema";
import { affectedRows, displayName, getDb, getUserById, insertId, requireDb } from "./db";
import { hasCourseAccess, getCourseById } from "./learning";
import { chargedAmountXof, fetchGatewayStatus, gatewayConfigured, startGatewayPayment, type GatewayMethod } from "./paymentGateway";
import { generateReceipt, receiptNumber } from "./receipts";
import { sendReceiptEmail } from "./mailer";
import { sendSms } from "./sms";

const fmtXof = (value: number) => `${value.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} XOF`;
const fmtPrice = (priceCents: number, currency: string) => `${(priceCents / 100).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} ${currency}`;
const newReference = () => `CMAI-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export async function createPayment(user: User, input: { courseId: number; method: GatewayMethod; payerPhone: string; manualReference?: string }) {
  const db = await requireDb();
  const course = await getCourseById(input.courseId);
  if (!course || !course.isPublished) throw new TRPCError({ code: "NOT_FOUND", message: "Cours introuvable." });
  if (course.priceCents <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Ce cours est gratuit." });
  if (await hasCourseAccess(user, course)) throw new TRPCError({ code: "CONFLICT", message: "Vous avez déjà accès à ce cours." });

  const recent = await db.select().from(paymentRequests).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.courseId, course.id), eq(paymentRequests.status, "pending"))).orderBy(desc(paymentRequests.createdAt)).limit(1);
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < 10 * 60 * 1000) {
    throw new TRPCError({ code: "CONFLICT", message: "Un paiement est déjà en cours pour ce cours. Validez la notification reçue ou patientez quelques minutes." });
  }

  const amountXof = chargedAmountXof(course);
  const reference = newReference();
  let gateway: Awaited<ReturnType<typeof startGatewayPayment>> | undefined;
  if (gatewayConfigured()) {
    try {
      gateway = await startGatewayPayment({ amountXof, phone: input.payerPhone, email: user.email ?? undefined, name: displayName(user), method: input.method, reference, courseTitle: course.title });
    } catch (error) {
      console.error("[Payments] Passerelle :", error);
      throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "La passerelle de paiement est indisponible." });
    }
  } else if (input.method === "card") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Le paiement par carte n'est pas encore activé." });
  }

  const id = insertId(await db.insert(paymentRequests).values({
    userId: user.id, courseId: course.id, amountCents: course.priceCents, currency: course.currency,
    chargedAmount: amountXof, chargedCurrency: "XOF", method: input.method, payerPhone: input.payerPhone,
    providerTransactionId: gateway?.providerTransactionId, transactionReference: gateway?.reference ?? (input.manualReference || reference),
    paymentUrl: gateway?.paymentUrl, status: "pending",
  }));

  const smsSent = await sendSms(input.payerPhone, `CMAI+Africa : demande de paiement de ${fmtXof(amountXof)} pour « ${course.title} ». Réf. ${gateway?.reference ?? reference}.`);
  if (smsSent) await db.update(paymentRequests).set({ smsStatus: "sent" }).where(eq(paymentRequests.id, id));

  return {
    id,
    mode: gateway?.mode ?? ("manual" as const),
    paymentUrl: gateway?.paymentUrl,
    reference: gateway?.reference ?? reference,
    amountXof,
    message: gateway?.message ?? "Demande enregistrée. Effectuez le transfert Mobile Money aux numéros indiqués : l'équipe confirmera votre paiement et vous enverra la quittance.",
  };
}

/** Passe un paiement en « confirmé » une seule fois, puis génère et envoie la quittance PDF. */
export async function settlePayment(paymentId: number, success: boolean) {
  const db = await requireDb();
  const now = new Date();
  const update = await db.update(paymentRequests)
    .set(success ? { status: "confirmed", paidAt: now, reviewedAt: now } : { status: "rejected", reviewedAt: now })
    .where(and(eq(paymentRequests.id, paymentId), inArray(paymentRequests.status, ["pending", "expired"])));
  if (affectedRows(update) === 0) return { changed: false };
  if (!success) return { changed: true };

  try {
    const payment = (await db.select().from(paymentRequests).where(eq(paymentRequests.id, paymentId)).limit(1))[0];
    const member = payment ? await getUserById(payment.userId) : undefined;
    const course = payment ? await getCourseById(payment.courseId) : undefined;
    if (payment && member?.email) {
      const paidAt = payment.paidAt ?? now;
      const receiptInput = {
        paymentId: payment.id, userId: member.id, name: displayName(member), email: member.email, phone: member.phone || payment.payerPhone,
        course: course?.title ?? `Cours n°${payment.courseId}`,
        amount: payment.chargedAmount ? fmtXof(payment.chargedAmount) : fmtPrice(payment.amountCents, payment.currency),
        listPrice: payment.chargedCurrency && payment.chargedCurrency !== payment.currency ? fmtPrice(payment.amountCents, payment.currency) : undefined,
        method: payment.method, reference: payment.transactionReference || payment.providerTransactionId || "—", paidAt,
      };
      const receipt = await generateReceipt(receiptInput);
      await db.update(paymentRequests).set({ receiptKey: receipt.key }).where(eq(paymentRequests.id, payment.id));
      const sent = await sendReceiptEmail({ to: member.email, name: receiptInput.name, course: receiptInput.course, amount: receiptInput.amount, method: payment.method, phone: receiptInput.phone, reference: receiptInput.reference, pdf: receipt.pdf, number: receiptNumber(payment.id, paidAt) });
      if (sent) await db.update(paymentRequests).set({ receiptSentAt: new Date() }).where(eq(paymentRequests.id, payment.id));
    }
  } catch (error) {
    console.error("[Payments] Paiement confirmé mais quittance non générée :", error);
  }
  return { changed: true };
}

/** Vérifie auprès de la passerelle et règle le paiement si le statut a changé. */
export async function syncPayment(paymentId: number, requesterId?: number) {
  const db = await requireDb();
  let payment = (await db.select().from(paymentRequests).where(eq(paymentRequests.id, paymentId)).limit(1))[0];
  if (!payment || (requesterId && payment.userId !== requesterId)) return undefined;
  if (payment.status === "pending" && payment.providerTransactionId && gatewayConfigured()) {
    try {
      const status = await fetchGatewayStatus(payment.providerTransactionId);
      if (status === "approved") await settlePayment(payment.id, true);
      else if (status === "failed") await settlePayment(payment.id, false);
    } catch (error) {
      console.warn("[Payments] Statut indisponible :", error instanceof Error ? error.message : error);
    }
    payment = (await db.select().from(paymentRequests).where(eq(paymentRequests.id, paymentId)).limit(1))[0];
  }
  return payment;
}

export async function syncByProviderId(providerTransactionId: string) {
  const db = await requireDb();
  const payment = (await db.select().from(paymentRequests).where(eq(paymentRequests.providerTransactionId, providerTransactionId)).limit(1))[0];
  if (payment) await syncPayment(payment.id);
}

export async function listPaymentsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: paymentRequests.id, userId: paymentRequests.userId, courseId: paymentRequests.courseId, amountCents: paymentRequests.amountCents,
      currency: paymentRequests.currency, chargedAmount: paymentRequests.chargedAmount, chargedCurrency: paymentRequests.chargedCurrency,
      method: paymentRequests.method, payerPhone: paymentRequests.payerPhone, transactionReference: paymentRequests.transactionReference,
      status: paymentRequests.status, smsStatus: paymentRequests.smsStatus, receiptKey: paymentRequests.receiptKey, paidAt: paymentRequests.paidAt,
      createdAt: paymentRequests.createdAt, userName: users.name, userEmail: users.email, courseTitle: courses.title,
    })
    .from(paymentRequests)
    .leftJoin(users, eq(users.id, paymentRequests.userId))
    .leftJoin(courses, eq(courses.id, paymentRequests.courseId))
    .orderBy(desc(paymentRequests.createdAt))
    .limit(300);
}

export async function listMyPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: paymentRequests.id, courseId: paymentRequests.courseId, courseTitle: courses.title, status: paymentRequests.status,
      chargedAmount: paymentRequests.chargedAmount, amountCents: paymentRequests.amountCents, currency: paymentRequests.currency,
      method: paymentRequests.method, receiptKey: paymentRequests.receiptKey, createdAt: paymentRequests.createdAt, paidAt: paymentRequests.paidAt,
    })
    .from(paymentRequests)
    .leftJoin(courses, eq(courses.id, paymentRequests.courseId))
    .where(eq(paymentRequests.userId, userId))
    .orderBy(desc(paymentRequests.createdAt))
    .limit(50);
}
