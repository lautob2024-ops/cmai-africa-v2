import { TRPCError } from "@trpc/server";

import { z } from "zod";
import { GENDERS, isStudentProfession } from "../shared/options";
import { UNIVERSITIES } from "../shared/universities";

import { clearCookieOptions, COOKIE_NAME, createSessionToken, hashPassword, sessionCookieOptions, verificationCode, verifyPassword } from "./auth";
import * as community from "./community";
import * as db from "./db";
import { ENV } from "./env";
import * as learning from "./learning";
import { attachmentFromKey, emailConfigured, emailSender, sendAdminMessage, sendCertificateEmail, sendResetEmail, sendStudentDecisionEmail, sendStudentReceivedEmail, sendVerificationEmail, sendWelcomeEmail } from "./mailer";
import { getPaymentGatewayStatus } from "./paymentGateway";
import * as payments from "./payments";
import { clearRateLimit, rateLimit } from "./rateLimit";
import { adminProcedure, protectedProcedure, publicProcedure, router, type Context } from "./trpc";

const MINUTES = 60 * 1000;
const CODE_TTL = 15 * MINUTES;
const email = z.string().trim().toLowerCase().email("adresse e-mail invalide").max(320);
const password = z.string().min(8, "8 caractères minimum").max(100);
const fileRef = z.object({ key: z.string().min(5).max(420), name: z.string().min(1).max(220), mime: z.string().max(120).optional() });
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "cours";

const NOT_VERIFIED = "E-mail non vérifié : saisissez le code reçu par e-mail (ou demandez-en un nouveau).";

async function startSession(ctx: Context, user: NonNullable<Context["user"]>) {
  let current = user;
  if (user.email && ENV.adminEmails.includes(user.email.toLowerCase()) && user.role !== "admin") current = (await db.updateUser(user.id, { role: "admin" })) ?? user;
  await db.updateUser(user.id, { lastSignedIn: new Date() });
  ctx.res.cookie(COOKIE_NAME, createSessionToken(current.id), sessionCookieOptions(ctx.req));
  return current;
}

const registerInput = z.object({
  firstName: z.string().trim().min(2, "au moins 2 caractères").max(80),
  lastName: z.string().trim().min(2, "au moins 2 caractères").max(80),
  email,
  gender: z.enum(GENDERS),
  country: z.string().trim().min(2, "pays obligatoire").max(100),
  city: z.string().trim().min(2, "ville obligatoire").max(100),
  phone: z.string().trim().min(8, "numéro trop court").max(40),
  profession: z.string().trim().min(2, "statut obligatoire").max(140),
  educationLevel: z.string().trim().max(120).optional().default(""),
  university: z.string().trim().max(240).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
  password,
}).superRefine((value, ctx) => {
  if (isStudentProfession(value.profession)) {
    if (!value.educationLevel) ctx.addIssue({ code: "custom", path: ["educationLevel"], message: "le niveau d'études est obligatoire pour un étudiant" });
    if (!value.university) ctx.addIssue({ code: "custom", path: ["university"], message: "l'établissement est obligatoire pour un étudiant" });
  }
});

const authRouter = router({
  me: publicProcedure.query(({ ctx }) => (ctx.user ? db.toPublicUser(ctx.user) : null)),

  register: publicProcedure.input(registerInput).mutation(async ({ ctx, input }) => {
    rateLimit(`register:${ctx.req.ip}`, 10, 30 * MINUTES);
    const existing = await db.getUserByEmail(input.email);
    // Un compte déjà vérifié ne peut pas être réinscrit ; un compte jamais vérifié peut être repris.
    if (existing?.passwordHash && existing.emailVerified) throw new TRPCError({ code: "CONFLICT", message: "Cette adresse e-mail possède déjà un compte. Connectez-vous ou utilisez « Mot de passe oublié »." });
    const code = verificationCode();
    const values = {
      name: `${input.firstName} ${input.lastName}`, firstName: input.firstName, lastName: input.lastName, gender: input.gender,
      country: input.country, city: input.city, phone: input.phone, address: input.address || null, profession: input.profession,
      educationLevel: input.educationLevel || null, university: input.university || null,
      passwordHash: await hashPassword(input.password), verificationCode: code, verificationExpiresAt: new Date(Date.now() + CODE_TTL),
    };
    if (existing) await db.updateUser(existing.id, { ...values, emailVerified: 0, loginMethod: "password", isActive: 1 });
    else await db.createLocalUser({ ...values, email: input.email });
    const emailSent = await sendVerificationEmail(input.email, input.firstName, code);
    return { success: true, emailSent };
  }),

  resendCode: publicProcedure.input(z.object({ email })).mutation(async ({ ctx, input }) => {
    rateLimit(`resend:${input.email}`, 3, 10 * MINUTES, "Trop de demandes. Patientez quelques minutes avant de redemander un code.");
    const user = await db.getUserByEmail(input.email);
    if (user && user.passwordHash && !user.emailVerified && user.isActive) {
      const code = verificationCode();
      await db.updateUser(user.id, { verificationCode: code, verificationExpiresAt: new Date(Date.now() + CODE_TTL) });
      await sendVerificationEmail(input.email, user.firstName || user.name || "membre", code);
    }
    return { success: true };
  }),

  verifyEmail: publicProcedure.input(z.object({ email, code: z.string().regex(/^\d{6}$/, "6 chiffres attendus") })).mutation(async ({ ctx, input }) => {
    rateLimit(`verify:${input.email}`, 8, 15 * MINUTES);
    const user = await db.getUserByEmail(input.email);
    if (!user || !user.isActive || user.verificationCode !== input.code || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Code incorrect ou expiré. Vous pouvez en demander un nouveau." });
    }
    const verified = await db.updateUser(user.id, { emailVerified: 1, verificationCode: null, verificationExpiresAt: null });
    clearRateLimit(`verify:${input.email}`);
    await sendWelcomeEmail(input.email, user.firstName || user.name || "membre");
    if (verified) await startSession(ctx, verified);
    return { success: true };
  }),

  login: publicProcedure.input(z.object({ email, password: z.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
    const key = `login:${input.email}:${ctx.req.ip}`;
    rateLimit(key, 10, 15 * MINUTES, "Trop de tentatives de connexion. Réessayez dans 15 minutes ou utilisez « Mot de passe oublié ».");
    const user = await db.getUserByEmail(input.email);
    const wrong = new TRPCError({ code: "UNAUTHORIZED", message: "E-mail ou mot de passe incorrect." });
    if (!user || !user.isActive) throw wrong;
    if (!user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Ce compte n'a pas encore de mot de passe. Cliquez sur « Mot de passe oublié » pour en créer un." });
    if (!(await verifyPassword(input.password, user.passwordHash))) throw wrong;
    if (!user.emailVerified) throw new TRPCError({ code: "FORBIDDEN", message: NOT_VERIFIED });
    clearRateLimit(key);
    await startSession(ctx, user);
    return { success: true };
  }),

  requestReset: publicProcedure.input(z.object({ email })).mutation(async ({ ctx, input }) => {
    rateLimit(`reset-req:${input.email}`, 4, 15 * MINUTES, "Trop de demandes. Patientez quelques minutes.");
    const user = await db.getUserByEmail(input.email);
    if (user?.email && user.isActive) {
      const code = verificationCode();
      await db.updateUser(user.id, { resetCode: code, resetExpiresAt: new Date(Date.now() + CODE_TTL) });
      await sendResetEmail(user.email, code);
    }
    return { success: true }; // même réponse que le compte existe ou non
  }),

  resetPassword: publicProcedure.input(z.object({ email, code: z.string().regex(/^\d{6}$/, "6 chiffres attendus"), password })).mutation(async ({ ctx, input }) => {
    rateLimit(`reset:${input.email}`, 8, 15 * MINUTES);
    const user = await db.getUserByEmail(input.email);
    if (!user || !user.isActive || user.resetCode !== input.code || !user.resetExpiresAt || user.resetExpiresAt < new Date()) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Code incorrect ou expiré. Redemandez un code de réinitialisation." });
    }
    // Recevoir le code prouve que l'adresse e-mail appartient au titulaire : le compte est donc aussi marqué « vérifié »,
    // sinon la connexion échouerait juste après la réinitialisation. On connecte directement l'utilisateur.
    const updated = await db.updateUser(user.id, { passwordHash: await hashPassword(input.password), emailVerified: 1, verificationCode: null, verificationExpiresAt: null, resetCode: null, resetExpiresAt: null, loginMethod: "password" });
    clearRateLimit(`reset:${input.email}`);
    clearRateLimit(`login:${input.email}:${ctx.req.ip}`);
    if (updated) await startSession(ctx, updated);
    return { success: true };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME, clearCookieOptions(ctx.req));
    return { success: true };
  }),

  updateProfile: protectedProcedure.input(z.object({
    phone: z.string().trim().min(8).max(40).optional(), country: z.string().trim().max(100).optional(), city: z.string().trim().max(100).optional(),
    address: z.string().trim().max(240).optional(), profession: z.string().trim().max(140).optional(),
    educationLevel: z.string().trim().max(120).optional(), university: z.string().trim().max(240).optional(),
  })).mutation(async ({ ctx, input }) => {
    const updated = await db.updateUser(ctx.user.id, input);
    return updated ? db.toPublicUser(updated) : null;
  }),
});

const memberInput = z.object({
  firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80), email,
  phone: z.string().trim().max(40).optional(), country: z.string().trim().min(2).max(100), city: z.string().trim().max(100).optional(),
  organization: z.string().trim().max(180).optional(), profileType: z.string().trim().min(2).max(80), educationLevel: z.string().trim().max(120).optional(),
  interests: z.string().trim().min(2).max(600), motivation: z.string().trim().max(2000).optional(), participationMode: z.string().trim().min(2).max(40),
  consent: z.literal(true),
});

const applicationInput = z.object({
  firstName: z.string().trim().min(2).max(80), lastName: z.string().trim().min(2).max(80), country: z.string().trim().min(2).max(100),
  schoolName: z.string().trim().min(2).max(220), schoolType: z.string().trim().min(2).max(80),
  schoolWebsite: z.string().trim().url().max(320).optional().or(z.literal("")), fieldOfStudy: z.string().trim().min(2).max(180),
  educationLevel: z.string().trim().min(2).max(120), motivation: z.string().trim().min(20).max(3000),
  studentProofKey: z.string().min(5).max(420).startsWith("student-applications/"),
  identityProofKey: z.string().min(5).max(420).startsWith("student-applications/"),
  additionalProofKey: z.string().max(420).startsWith("student-applications/").optional(),
});

const courseFields = {
  title: z.string().trim().min(2).max(220), level: z.string().trim().min(2).max(80), description: z.string().trim().min(10).max(2000),
  content: z.string().max(60000).optional(), price: z.number().min(0).max(10_000_000), currency: z.enum(["USD", "XOF"]),
  requiredSeconds: z.number().int().min(60).max(360000), passingScore: z.number().int().min(0).max(100), isPublished: z.boolean(),
};

const coursesRouter = router({
  list: publicProcedure.query(({ ctx }) => learning.listCoursesForUser(ctx.user)),
  detail: publicProcedure.input(z.object({ courseId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const detail = await learning.getCourseDetail(ctx.user, input.courseId);
    if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Cours introuvable." });
    return detail;
  }),
  create: adminProcedure.input(z.object(courseFields)).mutation(async ({ input }) => {
    const { price, ...rest } = input;
    const id = await learning.createCourse({ ...rest, content: rest.content || null, isPublished: rest.isPublished ? 1 : 0, priceCents: Math.round(price * 100), slug: `${slugify(input.title)}-${Date.now().toString(36)}` });
    return { success: true, id };
  }),
  update: adminProcedure.input(z.object({ id: z.number().int().positive() }).merge(z.object(courseFields).partial())).mutation(async ({ input }) => {
    const { id, price, isPublished, content, ...rest } = input;
    await learning.updateCourse(id, { ...rest, ...(content !== undefined ? { content: content || null } : {}), ...(price !== undefined ? { priceCents: Math.round(price * 100) } : {}), ...(isPublished !== undefined ? { isPublished: isPublished ? 1 : 0 } : {}) });
    return { success: true };
  }),
  remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await learning.deleteCourse(input.id);
    return { success: true };
  }),
  saveChapter: adminProcedure.input(z.object({
    id: z.number().int().positive().optional(), courseId: z.number().int().positive(), title: z.string().trim().min(2).max(220),
    description: z.string().trim().max(1000).optional(), content: z.string().trim().min(1).max(60000), position: z.number().int().min(1).max(500), requiredSeconds: z.number().int().min(0).max(36000),
  })).mutation(async ({ input }) => ({ success: true, id: await learning.upsertChapter({ ...input, description: input.description || null }) })),
  removeChapter: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await learning.deleteChapter(input.id);
    return { success: true };
  }),
  saveQuiz: adminProcedure.input(z.object({
    chapterId: z.number().int().positive(),
    questions: z.array(z.object({ question: z.string().trim().min(3).max(600), options: z.array(z.string().trim().min(1).max(300)).min(2).max(6), correctOption: z.number().int().min(0).max(5) }).refine(item => item.correctOption < item.options.length, "la bonne réponse doit correspondre à une option")).max(30),
  })).mutation(async ({ input }) => {
    await learning.replaceQuizzes(input.chapterId, input.questions);
    return { success: true };
  }),
  addFile: adminProcedure.input(z.object({ courseId: z.number().int().positive(), chapterId: z.number().int().positive().optional(), file: fileRef.extend({ key: z.string().startsWith("course-files/") }) })).mutation(async ({ input }) => {
    await learning.addCourseFile({ courseId: input.courseId, chapterId: input.chapterId ?? null, fileKey: input.file.key, fileName: input.file.name, mimeType: input.file.mime ?? null });
    return { success: true };
  }),
  removeFile: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await learning.removeCourseFile(input.id);
    return { success: true };
  }),
});

const learningRouter = router({
  chapterHeartbeat: protectedProcedure.input(z.object({ chapterId: z.number().int().positive(), seconds: z.number().int().min(1).max(60) })).mutation(async ({ ctx, input }) => {
    rateLimit(`hb:${ctx.user.id}`, 20, MINUTES); // au plus une mise à jour toutes les ~3 s
    const result = await learning.recordChapterTime(ctx.user, input.chapterId, input.seconds);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
    if (result.denied) throw new TRPCError({ code: "FORBIDDEN", message: "Ce cours est payant : réglez-le pour y accéder." });
    return result;
  }),
  courseHeartbeat: protectedProcedure.input(z.object({ courseId: z.number().int().positive(), seconds: z.number().int().min(1).max(60) })).mutation(async ({ ctx, input }) => {
    rateLimit(`hb:${ctx.user.id}`, 20, MINUTES);
    const result = await learning.recordLegacyCourseTime(ctx.user, input.courseId, input.seconds);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Cours introuvable." });
    if (result.denied) throw new TRPCError({ code: "FORBIDDEN", message: "Ce cours est payant : réglez-le pour y accéder." });
    return result;
  }),
  submitQuiz: protectedProcedure.input(z.object({ chapterId: z.number().int().positive(), answers: z.array(z.number().int().min(-1).max(5)).max(30) })).mutation(async ({ ctx, input }) => {
    rateLimit(`quiz:${ctx.user.id}`, 30, 10 * MINUTES);
    const result = await learning.submitChapterQuiz(ctx.user, input.chapterId, input.answers);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Chapitre introuvable." });
    if (result.denied) throw new TRPCError({ code: "FORBIDDEN", message: "Ce cours est payant : réglez-le pour y accéder." });
    return result;
  }),
});

const paymentsRouter = router({
  gatewayStatus: publicProcedure.query(() => getPaymentGatewayStatus()),
  create: protectedProcedure.input(z.object({
    courseId: z.number().int().positive(), method: z.enum(["mtn", "moov", "celtiis", "card"]),
    payerPhone: z.string().trim().min(8, "numéro trop court").max(40), manualReference: z.string().trim().max(180).optional(),
  })).mutation(({ ctx, input }) => {
    rateLimit(`pay:${ctx.user.id}`, 8, 30 * MINUTES);
    return payments.createPayment(ctx.user, input);
  }),
  status: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const payment = await payments.syncPayment(input.id, ctx.user.id);
    if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Paiement introuvable." });
    return { id: payment.id, status: payment.status, receiptKey: payment.receiptKey, paymentUrl: payment.paymentUrl };
  }),
  mine: protectedProcedure.query(({ ctx }) => payments.listMyPayments(ctx.user.id)),
  list: adminProcedure.query(() => payments.listPaymentsAdmin()),
  review: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["confirmed", "rejected"]) })).mutation(async ({ input }) => {
    const result = await payments.settlePayment(input.id, input.status === "confirmed");
    if (!result.changed) throw new TRPCError({ code: "CONFLICT", message: "Ce paiement a déjà été traité." });
    return { success: true };
  }),
});

const postsRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const rows = await db.listPosts(ctx.user?.role === "admin");
    return rows.map(row => {
      const locked = Boolean(row.isPremium) && ctx.user?.role !== "admin";
      return { ...row, body: locked ? "" : row.body, locked, attachments: !ctx.user || locked ? [] : row.attachments };
    });
  }),
  create: adminProcedure.input(z.object({
    title: z.string().trim().min(2).max(220), type: z.enum(["article", "challenge", "scholarship", "university_news"]), excerpt: z.string().trim().min(10).max(500),
    body: z.string().trim().min(20).max(60000), isPremium: z.boolean().default(false), price: z.number().min(0).default(0), currency: z.enum(["USD", "XOF"]).default("USD"),
    attachments: z.array(fileRef.extend({ key: z.string().startsWith("posts/") })).max(10).default([]),
  })).mutation(async ({ ctx, input }) => {
    const id = await db.createPost({
      slug: `${slugify(input.title)}-${Date.now().toString(36)}`, title: input.title, type: input.type, excerpt: input.excerpt, body: input.body,
      isPremium: input.isPremium ? 1 : 0, priceCents: Math.round(input.price * 100), currency: input.currency, authorId: ctx.user.id,
    }, input.attachments.map(file => ({ fileKey: file.key, fileName: file.name, mimeType: file.mime ?? null })));
    return { success: true, id };
  }),
  setPublished: adminProcedure.input(z.object({ id: z.number().int().positive(), published: z.boolean() })).mutation(async ({ input }) => {
    await db.setPostPublished(input.id, input.published);
    return { success: true };
  }),
  remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    await db.deletePost(input.id);
    return { success: true };
  }),
});

const communityRouter = router({
  directory: protectedProcedure.query(({ ctx }) => community.communityDirectory(ctx.user.id)),
  invitations: protectedProcedure.query(({ ctx }) => community.listReceivedInvitations(ctx.user.id)),
  invite: protectedProcedure.input(z.object({ recipientId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    rateLimit(`invite:${ctx.user.id}`, 30, 60 * MINUTES);
    await community.createConnection(ctx.user.id, input.recipientId);
    return { success: true };
  }),
  respondInvite: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["accepted", "rejected"]) })).mutation(async ({ ctx, input }) => ({ success: await community.respondConnection(input.id, ctx.user.id, input.status) })),
  startConversation: protectedProcedure.input(z.object({ recipientId: z.number().int().positive() })).mutation(async ({ ctx, input }) => ({ conversationId: await community.openConversation(ctx.user.id, input.recipientId) })),
  conversations: protectedProcedure.query(({ ctx }) => community.listConversations(ctx.user.id)),
  messages: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).query(({ ctx, input }) => community.listPrivateMessages(input.conversationId, ctx.user.id)),
  sendMessage: protectedProcedure.input(z.object({ conversationId: z.number().int().positive(), body: z.string().trim().min(1).max(5000) })).mutation(async ({ ctx, input }) => {
    rateLimit(`msg:${ctx.user.id}`, 60, MINUTES);
    await community.createPrivateMessage(input.conversationId, ctx.user.id, input.body);
    return { success: true };
  }),
  feed: protectedProcedure.query(({ ctx }) => community.listFeed(ctx.user.id)),
  publish: protectedProcedure.input(z.object({ body: z.string().trim().min(2).max(5000), attachment: fileRef.extend({ key: z.string().startsWith("media/") }).optional() })).mutation(async ({ ctx, input }) => {
    rateLimit(`post:${ctx.user.id}`, 20, 60 * MINUTES);
    await community.createCommunityPost(ctx.user.id, input.body, input.attachment ? { key: input.attachment.key, name: input.attachment.name, mime: input.attachment.mime ?? "" } : undefined);
    return { success: true };
  }),
  deletePost: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await community.deleteCommunityPost(ctx.user.id, input.postId, ctx.user.role === "admin");
    return { success: true };
  }),
  react: protectedProcedure.input(z.object({ postId: z.number().int().positive(), reaction: z.enum(community.REACTIONS) })).mutation(async ({ ctx, input }) => {
    await community.toggleReaction(ctx.user.id, input.postId, input.reaction);
    return { success: true };
  }),
  postComments: protectedProcedure.input(z.object({ postId: z.number().int().positive() })).query(({ input }) => community.listPostComments(input.postId)),
  commentPost: protectedProcedure.input(z.object({ postId: z.number().int().positive(), body: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
    rateLimit(`comment:${ctx.user.id}`, 40, 60 * MINUTES);
    await community.createPostComment(ctx.user.id, input.postId, input.body);
    return { success: true };
  }),
  discussions: protectedProcedure.query(async () => (await db.listDiscussions()).map(row => ({ ...row, authorName: [row.authorFirstName, row.authorLastName].filter(Boolean).join(" ") || row.authorName || "Membre CMAI+Africa" }))),
  comments: protectedProcedure.input(z.object({ discussionId: z.number().int().positive() })).query(async ({ input }) => (await db.listDiscussionComments(input.discussionId)).map(row => ({ ...row, authorName: [row.authorFirstName, row.authorLastName].filter(Boolean).join(" ") || row.authorName || "Membre CMAI+Africa" }))),
  createDiscussion: protectedProcedure.input(z.object({ title: z.string().trim().min(4).max(220), body: z.string().trim().min(10).max(3000) })).mutation(async ({ ctx, input }) => {
    rateLimit(`disc:${ctx.user.id}`, 10, 60 * MINUTES);
    await db.createDiscussion({ ...input, userId: ctx.user.id });
    return { success: true };
  }),
  createComment: protectedProcedure.input(z.object({ discussionId: z.number().int().positive(), body: z.string().trim().min(2).max(2000) })).mutation(async ({ ctx, input }) => {
    rateLimit(`comment:${ctx.user.id}`, 40, 60 * MINUTES);
    await db.createDiscussionComment({ ...input, userId: ctx.user.id });
    return { success: true };
  }),
});

const adminRouter = router({
  emailStatus: adminProcedure.query(() => ({ configured: emailConfigured(), from: emailSender() })),
  stats: adminProcedure.query(async () => {
    const [allUsers, apps, pays] = await Promise.all([db.listUsers(), db.listStudentApplications(), payments.listPaymentsAdmin()]);
    const confirmed = pays.filter(item => item.status === "confirmed");
    return {
      users: allUsers.length, active: allUsers.filter(item => item.isActive).length, students: allUsers.filter(item => item.studentAccessGranted).length,
      pendingApplications: apps.filter(item => item.status === "pending").length, confirmedPayments: confirmed.length,
      revenueXof: confirmed.reduce((sum, item) => sum + (item.chargedAmount ?? 0), 0),
    };
  }),
  users: adminProcedure.query(() => db.listUsers()),
  setActive: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (input.id === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas désactiver votre propre compte." });
    const target = await db.getUserById(input.id);
    if (target?.role === "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas être retiré." });
    await db.updateUser(input.id, { isActive: input.active ? 1 : 0 });
    return { success: true };
  }),
  deleteUser: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const target = await db.getUserById(input.id);
    if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Membre introuvable." });
    if (target.role === "admin" || input.id === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas être supprimé." });
    await db.deleteUserPermanently(input.id);
    return { success: true };
  }),
  updateMember: adminProcedure.input(z.object({
    id: z.number().int().positive(), phone: z.string().max(40).optional(), country: z.string().max(100).optional(), city: z.string().max(100).optional(),
    address: z.string().max(240).optional(), profession: z.string().max(140).optional(), educationLevel: z.string().max(120).optional(), university: z.string().max(240).optional(),
  })).mutation(async ({ input }) => {
    const { id, ...values } = input;
    await db.updateUser(id, values);
    return { success: true };
  }),
  sendEmail: adminProcedure.input(z.object({
    to: z.union([z.literal("all"), z.array(email).min(1).max(500)]),
    subject: z.string().trim().min(3).max(180), message: z.string().trim().min(5).max(20000),
    attachments: z.array(fileRef.extend({ key: z.string().startsWith("admin-files/") })).max(5).default([]),
  })).mutation(async ({ input }) => {
    let recipients: string[];
    if (input.to === "all") {
      const active = (await db.listUsers()).filter(item => item.isActive && item.email).map(item => item.email as string);
      const legacy = (await db.listMembers()).map(item => item.email);
      recipients = [...new Set([...active, ...legacy].map(item => item.toLowerCase()))];
    } else recipients = [...new Set(input.to)];
    const files = (await Promise.all(input.attachments.map(file => attachmentFromKey(file.key, file.name)))).filter(Boolean) as NonNullable<Awaited<ReturnType<typeof attachmentFromKey>>>[];
    if (input.attachments.length && files.length !== input.attachments.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Une pièce jointe est introuvable sur le serveur. Téléversez-la à nouveau." });
    let sent = 0;
    for (let index = 0; index < recipients.length; index += 3) {
      const results = await Promise.all(recipients.slice(index, index + 3).map(address => sendAdminMessage(address, input.subject, input.message, files)));
      sent += results.filter(Boolean).length;
    }
    return { sent, failed: recipients.length - sent, total: recipients.length, configured: emailConfigured() };
  }),
});

export const appRouter = router({
  auth: authRouter,
  members: router({
    register: publicProcedure.input(memberInput).mutation(async ({ ctx, input }) => {
      rateLimit(`member:${ctx.req.ip}`, 10, 30 * MINUTES);
      if (await db.getMemberByEmail(input.email)) throw new TRPCError({ code: "CONFLICT", message: "Cette adresse e-mail est déjà inscrite." });
      const member = await db.createMember({ ...input, phone: input.phone || null, city: input.city || null, organization: input.organization || null, educationLevel: input.educationLevel || null, motivation: input.motivation || null, consent: 1 });
      await sendWelcomeEmail(input.email, input.firstName);
      return { success: true, memberId: member?.id };
    }),
    count: publicProcedure.query(() => db.countMembers()),
    list: adminProcedure.query(() => db.listMembers()),
  }),
  student: router({
    myApplication: protectedProcedure.query(({ ctx }) => db.getStudentApplicationByUser(ctx.user.id)),
    submit: protectedProcedure.input(applicationInput).mutation(async ({ ctx, input }) => {
      if (await db.getStudentApplicationByUser(ctx.user.id)) throw new TRPCError({ code: "CONFLICT", message: "Une seule demande étudiant est autorisée par compte." });
      await db.createStudentApplication({ ...input, userId: ctx.user.id, email: ctx.user.email ?? "", schoolWebsite: input.schoolWebsite || null, additionalProofKey: input.additionalProofKey || null });
      if (ctx.user.email) await sendStudentReceivedEmail(ctx.user.email, input.firstName);
      return { success: true };
    }),
    list: adminProcedure.query(() => db.listStudentApplications()),
    review: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["approved", "rejected"]) })).mutation(async ({ input }) => {
      const application = await db.reviewStudentApplication(input.id, input.status);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Dossier introuvable." });
      await sendStudentDecisionEmail(application.email, application.firstName, input.status === "approved");
      return { success: true };
    }),
  }),
  courses: coursesRouter,
  learning: learningRouter,
  progress: router({
    mine: protectedProcedure.query(({ ctx }) => learning.getUserCourseProgress(ctx.user.id)),
    list: adminProcedure.query(() => learning.listProgressAdmin()),
  }),
  posts: postsRouter,
  payments: paymentsRouter,
  certificates: router({
    myRequests: protectedProcedure.query(async ({ ctx }) => {
      const [rows, titles] = await Promise.all([db.listCertificateRequests(ctx.user.id), learning.courseTitles()]);
      return rows.map(row => ({ ...row, certificateKey: undefined, courseTitle: titles.get(row.courseId) ?? `Cours n°${row.courseId}` }));
    }),
    request: protectedProcedure.input(z.object({ courseId: z.number().int().positive(), message: z.string().trim().min(20).max(1500) })).mutation(async ({ ctx, input }) => {
      const progress = (await learning.getUserCourseProgress(ctx.user.id)).find(item => item.courseId === input.courseId);
      if (!progress?.completedAt) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Le cours doit être terminé (chapitres, temps requis et quiz validés) avant de demander le certificat." });
      const existing = (await db.listCertificateRequests(ctx.user.id)).find(item => item.courseId === input.courseId && item.status !== "rejected");
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Une demande existe déjà pour ce cours." });
      await db.createCertificateRequest({ ...input, userId: ctx.user.id });
      return { success: true };
    }),
    list: adminProcedure.query(async () => {
      const [rows, titles, people] = await Promise.all([db.listCertificateRequests(), learning.courseTitles(), db.listUsers()]);
      return rows.map(row => {
        const person = people.find(item => item.id === row.userId);
        return { ...row, courseTitle: titles.get(row.courseId) ?? `Cours n°${row.courseId}`, userName: [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.name || `Membre n°${row.userId}`, userEmail: person?.email ?? null };
      });
    }),
    review: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["issued", "rejected"]), certificateKey: z.string().max(420).startsWith("admin-files/").optional() })).mutation(async ({ input }) => {
      await db.reviewCertificateRequest(input.id, input.status, input.certificateKey);
      if (input.status === "issued") {
        const request = await db.getCertificateRequest(input.id);
        const recipient = request ? await db.getUserById(request.userId) : undefined;
        const course = request ? await learning.getCourseById(request.courseId) : undefined;
        if (recipient?.email) await sendCertificateEmail(recipient.email, db.displayName(recipient), course?.title ?? "votre cours", input.certificateKey ? await attachmentFromKey(input.certificateKey, "certificat-cmai-africa.pdf") : undefined);
      }
      return { success: true };
    }),
  }),
  institutions: router({
    search: publicProcedure.input(z.object({ query: z.string().max(100).optional() }).optional()).query(async ({ input }) => {
      const needle = (input?.query || "").toLowerCase();
      const fromDb = (await db.listInstitutions(input?.query)).map(row => row.name);
      const builtIn = UNIVERSITIES.filter(name => !needle || name.toLowerCase().includes(needle));
      return [...new Set([...builtIn, ...fromDb])].slice(0, 40).map(name => ({ name }));
    }),
  }),
  community: communityRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
