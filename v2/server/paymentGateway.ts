import { ENV } from "./env";

/* Passerelle FedaPay : MTN et Moov Bénin en « USSD Push » (sans redirection),
   Celtiis et cartes via la page de paiement hébergée FedaPay. */

export type GatewayMethod = "mtn" | "moov" | "celtiis" | "card";

const PUSH_MODES: Partial<Record<GatewayMethod, string>> = { mtn: "mtn_open", moov: "moov" };

export const gatewayConfigured = () => (process.env.PAYMENT_PROVIDER || "manual").toLowerCase() === "fedapay" && Boolean(process.env.FEDAPAY_SECRET_KEY);

export function getPaymentGatewayStatus() {
  return {
    provider: (process.env.PAYMENT_PROVIDER || "manual").toLowerCase(),
    configured: gatewayConfigured(),
    sandbox: process.env.FEDAPAY_ENV !== "live",
    pushMethods: Object.keys(PUSH_MODES) as GatewayMethod[],
  };
}

const apiBase = () => (process.env.FEDAPAY_ENV === "live" ? "https://api.fedapay.com/v1" : "https://sandbox-api.fedapay.com/v1");

async function call(pathname: string, init: { method?: string; body?: unknown } = {}) {
  const response = await fetch(`${apiBase()}${pathname}`, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${process.env.FEDAPAY_SECRET_KEY}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const detail = data?.message || data?.error || text.slice(0, 200);
    throw new Error(`La passerelle de paiement a refusé la demande (${response.status}). ${detail}`);
  }
  return data;
}

/** FedaPay enveloppe parfois l'objet sous « v1/transaction ». */
const unwrap = (data: any) => data?.["v1/transaction"] ?? data?.transaction ?? data;

/** Numéro béninois au format international. Ex. « 01 66 39 07 51 » → « +2290166390751 ». */
export function normalizeBeninPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("229")) digits = digits.slice(3);
  if (digits.length === 8) digits = `01${digits}`; // ancien format à 8 chiffres
  return { national: digits, international: `+229${digits}` };
}

export function chargedAmountXof(course: { priceCents: number; currency: string }) {
  const price = course.priceCents / 100;
  return Math.max(100, course.currency.toUpperCase() === "XOF" ? Math.round(price) : Math.round(price * ENV.usdToXof));
}

export type StartInput = { amountXof: number; phone: string; email?: string; name?: string; method: GatewayMethod; reference: string; courseTitle: string };
export type StartResult = { providerTransactionId: string; reference: string; mode: "push" | "redirect"; paymentUrl?: string; message: string };

export async function startGatewayPayment(input: StartInput): Promise<StartResult> {
  const [firstname, ...rest] = (input.name || "Membre CMAI").split(" ");
  const phone = normalizeBeninPhone(input.phone);
  const created = unwrap(await call("/transactions", {
    method: "POST",
    body: {
      description: `CMAI+Africa — ${input.courseTitle}`.slice(0, 200),
      amount: input.amountXof,
      currency: { iso: "XOF" },
      callback_url: `${ENV.baseUrl}/api/payments/webhook`,
      custom_metadata: { cmaiReference: input.reference },
      customer: {
        firstname,
        lastname: rest.join(" ") || "CMAI",
        ...(input.email ? { email: input.email } : {}),
        phone_number: { number: phone.international, country: "bj" },
      },
    },
  }));
  const id = created?.id;
  if (!id) throw new Error("La passerelle n'a pas retourné d'identifiant de transaction.");
  const tokenData = await call(`/transactions/${id}/token`, { method: "POST" });
  const token: string | undefined = tokenData?.token;
  if (!token) throw new Error("La passerelle n'a pas retourné de jeton de paiement.");

  const pushMode = PUSH_MODES[input.method];
  if (pushMode) {
    await call(`/${pushMode}`, { method: "POST", body: { token, phone_number: { number: phone.international, country: "bj" } } });
    return { providerTransactionId: String(id), reference: created?.reference || input.reference, mode: "push", message: "Une notification Mobile Money vient d'être envoyée sur votre téléphone. Saisissez votre code secret pour valider." };
  }
  return { providerTransactionId: String(id), reference: created?.reference || input.reference, mode: "redirect", paymentUrl: tokenData?.url, message: "Poursuivez le paiement sur la page sécurisée de FedaPay." };
}

export type ProviderStatus = "approved" | "pending" | "failed";

/** Interroge directement la passerelle : source de vérité, indépendante de toute notification reçue. */
export async function fetchGatewayStatus(providerTransactionId: string): Promise<ProviderStatus> {
  const tx = unwrap(await call(`/transactions/${encodeURIComponent(providerTransactionId)}`));
  const status = String(tx?.status || "").toLowerCase();
  if (status === "approved" || status === "transferred") return "approved";
  if (["declined", "canceled", "cancelled", "expired", "refunded"].includes(status)) return "failed";
  return "pending";
}
