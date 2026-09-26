import { PageShell } from "@/components/PageShell";
import { fileHref } from "@/lib/upload";
import { formatDate, formatPrice } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Download, Loader2, MessageCircle, Smartphone, XCircle } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

type Method = "mtn" | "moov" | "celtiis";
const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: "mtn", label: "MTN Mobile Money", hint: "Notification USSD sur votre téléphone" },
  { id: "moov", label: "Moov Money", hint: "Notification USSD sur votre téléphone" },
  { id: "celtiis", label: "Celtiis Cash", hint: "Page de paiement sécurisée" },
];
const MANUAL_NUMBERS = { mtn: "0166390751", celtiis: "0149056852", whatsapp: "22990166390751" };
const STATUS_LABEL: Record<string, string> = { pending: "En attente", confirmed: "Confirmé", rejected: "Refusé", expired: "Expiré" };

type Waiting = { id: number; message: string; startedAt: number };

export default function Payment() {
  const { user } = useAuth();
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const courses = trpc.courses.list.useQuery();
  const gateway = trpc.payments.gatewayStatus.useQuery();
  const history = trpc.payments.mine.useQuery();
  const [courseId, setCourseId] = useState<number | "">("");
  const [method, setMethod] = useState<Method>("mtn");
  const [phone, setPhone] = useState("");
  const [manualRef, setManualRef] = useState("");
  const [waiting, setWaiting] = useState<Waiting | null>(null);
  const [outcome, setOutcome] = useState<{ status: string; receiptKey?: string | null } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const payable = courses.data?.filter(course => course.priceCents > 0 && !course.hasAccess) ?? [];
  const selected = payable.find(course => course.id === courseId);
  const live = Boolean(gateway.data?.configured);

  useEffect(() => {
    const wanted = Number(new URLSearchParams(window.location.search).get("cours"));
    if (wanted && courseId === "" && payable.some(course => course.id === wanted)) setCourseId(wanted);
    else if (courseId === "" && payable.length === 1) setCourseId(payable[0].id);
  }, [payable, courseId, location]);
  useEffect(() => { if (user?.phone && !phone) setPhone(user.phone); }, [user, phone]);
  useEffect(() => () => window.clearInterval(timer.current), []);

  // Interrogation régulière de la passerelle jusqu'à confirmation (l'utilisateur valide sur son téléphone).
  useEffect(() => {
    if (!waiting) return;
    const check = async () => {
      try {
        const status = await utils.payments.status.fetch({ id: waiting.id }, { staleTime: 0 });
        if (status.status !== "pending") {
          window.clearInterval(timer.current);
          setWaiting(null);
          setOutcome({ status: status.status, receiptKey: status.receiptKey });
          void utils.courses.list.invalidate();
          void history.refetch();
          if (status.status === "confirmed") toast.success("Paiement confirmé. Votre quittance PDF vous est envoyée par e-mail.");
          else toast.error("Le paiement n'a pas abouti.");
        } else if (Date.now() - waiting.startedAt > 4 * 60 * 1000) {
          window.clearInterval(timer.current);
          setWaiting(null);
          toast.message("Nous n'avons pas reçu de confirmation. Si vous avez validé, votre paiement apparaîtra dans l'historique dans quelques instants.");
          void history.refetch();
        }
      } catch { /* nouvelle tentative au prochain cycle */ }
    };
    timer.current = window.setInterval(check, 4000);
    void check();
    return () => window.clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting?.id]);

  const create = trpc.payments.create.useMutation({
    onSuccess: data => {
      setOutcome(null);
      if (data.mode === "redirect" && data.paymentUrl) { window.location.href = data.paymentUrl; return; }
      if (data.mode === "push") setWaiting({ id: data.id, message: data.message, startedAt: Date.now() });
      else { toast.success(data.message); void history.refetch(); }
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return void toast.error("Choisissez un cours.");
    create.mutate({ courseId: selected.id, method, payerPhone: phone, manualReference: manualRef || undefined });
  };

  return (
    <PageShell title="Paiement" kicker="Règlement" description="Payez votre cours par Mobile Money. Vous recevez ensuite automatiquement une quittance PDF par e-mail.">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-[#dbe1ea] bg-white p-6 md:p-8">
          {outcome?.status === "confirmed" && (
            <div className="mb-6 rounded-2xl border border-[#bdd9c5] bg-[#eef1f8] p-5">
              <p className="flex items-center gap-2 font-semibold text-[#14213d]"><CheckCircle2 className="h-5 w-5 text-[#2e7d56]" /> Paiement confirmé — le cours est débloqué.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href="/programmes" className="rounded-xl bg-[#14213d] px-4 py-2 text-sm font-semibold text-white">Commencer le cours</Link>
                {outcome.receiptKey && <a href={fileHref(outcome.receiptKey)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#14213d] px-4 py-2 text-sm font-semibold text-[#14213d]"><Download className="h-4 w-4" /> Quittance PDF</a>}
              </div>
            </div>
          )}
          {outcome && outcome.status !== "confirmed" && <p className="mb-6 flex items-center gap-2 rounded-2xl bg-[#fff1e8] p-4 text-sm font-semibold text-[#b8431c]"><XCircle className="h-5 w-5" /> Le paiement n'a pas abouti ({STATUS_LABEL[outcome.status] ?? outcome.status}). Vous pouvez réessayer.</p>}

          {waiting ? (
            <div className="py-10 text-center" role="status" aria-live="polite">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#2f6fed]" />
              <h2 className="mt-5 font-display text-2xl font-semibold text-[#14213d]">En attente de votre validation</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#51617a]">{waiting.message}</p>
              <p className="mt-2 text-xs text-[#5b6b82]">Ne fermez pas cette page. Elle se met à jour dès que le paiement est confirmé.</p>
            </div>
          ) : payable.length === 0 && !courses.isLoading ? (
            <p className="py-8 text-center text-[#51617a]">Aucun cours à payer pour le moment : vous avez déjà accès à tous les cours disponibles.</p>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <label className="block">
                <span className="form-label">Cours *</span>
                <select required className="form-input" value={courseId} onChange={event => setCourseId(event.target.value ? Number(event.target.value) : "")}>
                  <option value="">Choisir un cours…</option>
                  {payable.map(course => <option key={course.id} value={course.id}>{course.title} — {formatPrice(course.priceCents, course.currency)}</option>)}
                </select>
              </label>
              <fieldset>
                <legend className="form-label">Moyen de paiement *</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {METHODS.map(item => (
                    <label key={item.id} className={`cursor-pointer rounded-2xl border p-4 text-sm transition ${method === item.id ? "border-[#14213d] bg-[#eef1f8]" : "border-[#dbe1ea] hover:border-[#9db3d6]"}`}>
                      <input type="radio" name="method" className="sr-only" checked={method === item.id} onChange={() => setMethod(item.id)} />
                      <Smartphone className="h-5 w-5 text-[#14213d]" />
                      <span className="mt-2 block font-semibold text-[#14213d]">{item.label}</span>
                      <span className="mt-1 block text-xs text-[#5b6b82]">{live ? item.hint : "Paiement manuel"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="block">
                <span className="form-label">Numéro Mobile Money à débiter *</span>
                <input required type="tel" inputMode="tel" className="form-input" placeholder="Ex. 01 66 39 07 51" value={phone} onChange={event => setPhone(event.target.value)} />
              </label>
              {live ? (
                <p className="rounded-xl bg-[#eef1f7] p-4 text-sm leading-6 text-[#51617a]">Après avoir cliqué, {method === "celtiis" ? "vous serez redirigé vers la page de paiement sécurisée." : "une notification s'ouvre automatiquement sur votre téléphone : saisissez votre code secret pour valider, sans revenir sur le site."}</p>
              ) : (
                <div className="rounded-2xl bg-[#14213d] p-5 text-sm text-white/90">
                  <p className="font-semibold text-white">Paiement manuel</p>
                  <p className="mt-2">MTN Mobile Money : <strong className="text-white">{MANUAL_NUMBERS.mtn}</strong></p>
                  <p>Celtiis Cash : <strong className="text-white">{MANUAL_NUMBERS.celtiis}</strong></p>
                  <p className="mt-2 text-white/70">Effectuez le transfert puis indiquez la référence reçue par SMS. L'équipe confirme votre paiement et vous envoie la quittance.</p>
                  <input className="form-input mt-3 !text-[#0f1b2d]" placeholder="Référence de la transaction" value={manualRef} onChange={event => setManualRef(event.target.value)} />
                  <a href={`https://wa.me/${MANUAL_NUMBERS.whatsapp}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-white underline"><MessageCircle className="h-4 w-4" /> Écrire sur WhatsApp</a>
                </div>
              )}
              <button disabled={create.isPending || !selected} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2f6fed] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#2657c9] disabled:opacity-60">
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {selected ? `Payer ${formatPrice(selected.priceCents, selected.currency)}` : "Payer"}
              </button>
              {selected && selected.currency !== "XOF" && live && <p className="text-center text-xs text-[#5b6b82]">Le prélèvement Mobile Money est effectué en francs CFA (XOF), converti au taux du jour configuré par CMAI+Africa.</p>}
            </form>
          )}
        </section>

        <aside className="rounded-3xl border border-[#dbe1ea] bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-[#14213d]">Mes paiements</h2>
          {history.data?.length === 0 && <p className="mt-4 text-sm text-[#5b6b82]">Aucun paiement pour le moment.</p>}
          <ul className="mt-4 space-y-3">
            {history.data?.map(item => (
              <li key={item.id} className="rounded-2xl border border-[#e7ebf2] p-4 text-sm">
                <p className="font-semibold text-[#14213d]">{item.courseTitle ?? `Cours n°${item.courseId}`}</p>
                <p className="mt-1 text-xs text-[#5b6b82]">{formatDate(item.paidAt ?? item.createdAt, true)} · {item.method.toUpperCase()}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "confirmed" ? "bg-[#eef1f8] text-[#2e7d56]" : item.status === "pending" ? "bg-[#fff8df] text-[#8a5a00]" : "bg-[#fff1e8] text-[#b8431c]"}`}>{STATUS_LABEL[item.status]}</span>
                  {item.receiptKey && <a href={fileHref(item.receiptKey)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#14213d] hover:underline"><Download className="h-3.5 w-3.5" /> Quittance</a>}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
