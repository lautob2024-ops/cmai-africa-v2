import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/format";
import { fileHref, uploadFile, type UploadedFile } from "@/lib/upload";
import { Award, Banknote, CheckCircle2, Download, FileText, GraduationCap, Loader2, Paperclip, Plus, Users, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge, btn, btnDanger, btnGhost, btnOrange, Card, DataTable, input, label, Td } from "./kit";

/* ───────── Vue d'ensemble ───────── */
export function OverviewTab({ go }: { go: (tab: string) => void }) {
  const stats = trpc.admin.stats.useQuery();
  const items = stats.data
    ? [
        { icon: Users, label: "Membres inscrits", value: stats.data.users, sub: `${stats.data.active} actifs`, tab: "members" },
        { icon: GraduationCap, label: "Accès étudiants", value: stats.data.students, sub: `${stats.data.pendingApplications} dossier(s) à examiner`, tab: "students" },
        { icon: Banknote, label: "Paiements confirmés", value: stats.data.confirmedPayments, sub: `${stats.data.revenueXof.toLocaleString("fr-FR")} XOF encaissés`, tab: "payments" },
      ]
    : [];
  return (
    <div className="space-y-6">
      {stats.isLoading && <Loader2 className="h-6 w-6 animate-spin text-[#eb6a3d]" />}
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(item => (
          <button key={item.label} onClick={() => go(item.tab)} className="rounded-3xl border border-[#e2dfd5] bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-[#193f36]">
            <item.icon className="h-6 w-6 text-[#eb6a3d]" />
            <p className="mt-4 font-display text-4xl font-semibold text-[#193f36]">{item.value}</p>
            <p className="mt-1 text-sm font-semibold text-[#3f4d46]">{item.label}</p>
            <p className="text-xs text-[#718078]">{item.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Publications ───────── */
const TYPES: Record<string, string> = { article: "Article", challenge: "Défi scientifique", scholarship: "Bourse & aide", university_news: "Actualité universitaire" };

export function PostsTab() {
  const posts = trpc.posts.list.useQuery();
  const [form, setForm] = useState({ title: "", type: "challenge" as keyof typeof TYPES, excerpt: "", body: "", isPremium: false, price: 0, currency: "USD" as "USD" | "XOF" });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const create = trpc.posts.create.useMutation({
    onSuccess: () => { toast.success("Publication en ligne."); setForm({ ...form, title: "", excerpt: "", body: "", isPremium: false, price: 0 }); setFiles([]); void posts.refetch(); },
    onError: error => toast.error(error.message),
  });
  const toggle = trpc.posts.setPublished.useMutation({ onSuccess: () => void posts.refetch(), onError: error => toast.error(error.message) });
  const remove = trpc.posts.remove.useMutation({ onSuccess: () => void posts.refetch(), onError: error => toast.error(error.message) });

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of Array.from(list)) uploaded.push(await uploadFile(file, "post"));
      setFiles(current => [...current, ...uploaded].slice(0, 10));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Téléversement impossible."); } finally { setBusy(false); }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); create.mutate({ ...form, type: form.type as any, attachments: files.map(file => ({ key: file.key, name: file.name, mime: file.mime })) }); };

  return (
    <div className="space-y-6">
      <Card title="Publier sur le site" subtitle="Articles, défis scientifiques, bourses et actualités, avec fichiers joints (PDF, images, documents).">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className={label}>Titre *</span><input className={input} required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
            <label className="block"><span className={label}>Type *</span><select className={input} value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>{Object.entries(TYPES).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>
          </div>
          <label className="block"><span className={label}>Résumé (10 caractères minimum) *</span><input className={input} required minLength={10} maxLength={500} value={form.excerpt} onChange={event => setForm({ ...form, excerpt: event.target.value })} /></label>
          <label className="block"><span className={label}>Contenu (20 caractères minimum) *</span><textarea className={input + " !h-auto py-3"} rows={7} required minLength={20} value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} /></label>
          <label className="flex items-center gap-3 text-sm font-semibold text-[#193f36]"><input type="checkbox" className="h-4 w-4 accent-[#193f36]" checked={form.isPremium} onChange={event => setForm({ ...form, isPremium: event.target.checked })} /> Contenu réservé (le corps du texte est masqué aux membres)</label>
          <div>
            <span className={label}>Fichiers joints</span>
            <ul className="mt-2 space-y-2">{files.map(file => <li key={file.key} className="flex items-center gap-2 rounded-xl bg-[#f6f5f0] px-3 py-2 text-sm"><FileText className="h-4 w-4" /><span className="flex-1 truncate">{file.name}</span><button type="button" aria-label="Retirer" onClick={() => setFiles(current => current.filter(item => item.key !== file.key))}><X className="h-4 w-4" /></button></li>)}</ul>
            <button type="button" disabled={busy} onClick={() => picker.current?.click()} className={btnGhost + " mt-2"}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Ajouter un fichier</button>
            <input ref={picker} type="file" multiple className="sr-only" onChange={event => { void addFiles(event.target.files); event.target.value = ""; }} />
          </div>
          <button disabled={create.isPending || busy} className={btnOrange}>{create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publier</button>
        </form>
      </Card>
      <Card title={`Publications (${posts.data?.length ?? 0})`}>
        <DataTable head={["Titre", "Type", "Fichiers", "Date", "État", "Actions"]} empty={posts.data?.length === 0 ? "Aucune publication." : undefined}>
          {posts.data?.map(post => (
            <tr key={post.id}><Td className="font-semibold text-[#193f36]">{post.title}</Td><Td>{TYPES[post.type]}</Td><Td>{post.attachments.length}</Td><Td>{formatDate(post.createdAt)}</Td>
              <Td>{post.isPublished ? <Badge color="green">En ligne</Badge> : <Badge color="orange">Masquée</Badge>}</Td>
              <Td><div className="flex gap-2"><button className={btnGhost + " !px-3 !py-1.5 !text-xs"} onClick={() => toggle.mutate({ id: post.id, published: !post.isPublished })}>{post.isPublished ? "Masquer" : "Publier"}</button><button className={btnDanger} onClick={() => window.confirm("Supprimer cette publication ?") && remove.mutate({ id: post.id })}>Supprimer</button></div></Td></tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}

/* ───────── Paiements ───────── */
const PAY_BADGE = { confirmed: ["green", "Confirmé"], pending: ["gold", "En attente"], rejected: ["orange", "Refusé"], expired: ["gray", "Expiré"] } as const;

export function PaymentsTab() {
  const payments = trpc.payments.list.useQuery(undefined, { refetchInterval: 20_000 });
  const review = trpc.payments.review.useMutation({ onSuccess: () => { toast.success("Paiement mis à jour."); void payments.refetch(); }, onError: error => toast.error(error.message) });
  return (
    <Card title="Paiements" subtitle="Les paiements Mobile Money sont confirmés automatiquement. La confirmation manuelle sert aux virements hors passerelle ; elle déclenche la quittance PDF et l'e-mail.">
      <DataTable head={["Date", "Membre", "Cours", "Montant", "Moyen", "Téléphone", "Référence", "État", "Actions"]} empty={payments.data?.length === 0 ? "Aucun paiement." : undefined}>
        {payments.data?.map(item => {
          const [color, text] = PAY_BADGE[item.status];
          return (
            <tr key={item.id}>
              <Td className="whitespace-nowrap">{formatDate(item.paidAt ?? item.createdAt, true)}</Td>
              <Td><span className="font-semibold text-[#193f36]">{item.userName ?? "—"}</span><br /><span className="text-xs">{item.userEmail}</span></Td>
              <Td>{item.courseTitle ?? `#${item.courseId}`}</Td>
              <Td className="whitespace-nowrap">{item.chargedAmount ? `${item.chargedAmount.toLocaleString("fr-FR")} XOF` : `${(item.amountCents / 100).toLocaleString("fr-FR")} ${item.currency}`}</Td>
              <Td>{item.method.toUpperCase()}</Td><Td className="whitespace-nowrap">{item.payerPhone}</Td><Td className="text-xs">{item.transactionReference ?? "—"}</Td>
              <Td><Badge color={color}>{text}</Badge></Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  {item.status === "pending" && <><button className={btn + " !px-3 !py-1.5 !text-xs"} onClick={() => window.confirm("Confirmer ce paiement ? La quittance sera envoyée.") && review.mutate({ id: item.id, status: "confirmed" })}><CheckCircle2 className="h-3.5 w-3.5" /> Confirmer</button><button className={btnDanger} onClick={() => review.mutate({ id: item.id, status: "rejected" })}>Refuser</button></>}
                  {item.receiptKey && <a href={fileHref(item.receiptKey)} target="_blank" rel="noreferrer" className={btnGhost + " !px-3 !py-1.5 !text-xs"}><Download className="h-3.5 w-3.5" /> Quittance</a>}
                </div>
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </Card>
  );
}

/* ───────── Progression ───────── */
export function ProgressTab() {
  const progress = trpc.progress.list.useQuery();
  const minutes = (seconds: number) => `${Math.floor(seconds / 60)} min`;
  return (
    <Card title="Progression des membres" subtitle="Le temps est compté automatiquement lorsque le membre lit activement un chapitre ; un chapitre est validé quand le temps requis et le quiz sont atteints.">
      <DataTable head={["Membre", "Cours n°", "Chapitres", "Progression", "Temps passé", "Score moyen quiz", "Terminé le"]} empty={progress.data?.length === 0 ? "Aucune activité pour le moment." : undefined}>
        {progress.data?.map(item => (
          <tr key={item.id}>
            <Td><span className="font-semibold text-[#193f36]">{item.userName}</span><br /><span className="text-xs">{item.userEmail}</span></Td>
            <Td>{item.courseId}</Td>
            <Td>{item.chapterCount ? `${item.completedChapters} / ${item.chapterCount}` : "—"}</Td>
            <Td><Badge color={item.percent >= 100 ? "green" : "gold"}>{item.percent} %</Badge></Td>
            <Td>{minutes(item.secondsWatched)}</Td><Td>{item.quizScore ?? "—"} %</Td><Td>{formatDate(item.completedAt)}</Td>
          </tr>
        ))}
      </DataTable>
    </Card>
  );
}

/* ───────── Certificats ───────── */
export function CertificatesTab() {
  const requests = trpc.certificates.list.useQuery();
  const [uploading, setUploading] = useState<number | null>(null);
  const review = trpc.certificates.review.useMutation({ onSuccess: () => { toast.success("Demande traitée."); void requests.refetch(); }, onError: error => toast.error(error.message) });
  const issue = async (id: number, file?: File) => {
    if (!file) return;
    setUploading(id);
    try {
      const uploaded = await uploadFile(file, "mail");
      review.mutate({ id, status: "issued", certificateKey: uploaded.key });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Téléversement impossible."); } finally { setUploading(null); }
  };
  return (
    <Card title="Demandes de certificat" subtitle="Téléversez le certificat (PDF) pour l'envoyer automatiquement par e-mail au membre.">
      <DataTable head={["Date", "Membre", "Cours", "Message", "État", "Actions"]} empty={requests.data?.length === 0 ? "Aucune demande." : undefined}>
        {requests.data?.map(item => (
          <tr key={item.id}>
            <Td className="whitespace-nowrap">{formatDate(item.requestedAt)}</Td>
            <Td><span className="font-semibold text-[#193f36]">{item.userName}</span><br /><span className="text-xs">{item.userEmail}</span></Td>
            <Td>{item.courseTitle}</Td><Td className="max-w-[260px]">{item.message}</Td>
            <Td><Badge color={item.status === "issued" ? "green" : item.status === "pending" ? "gold" : "orange"}>{item.status === "issued" ? "Délivré" : item.status === "pending" ? "À traiter" : "Refusé"}</Badge></Td>
            <Td>
              {item.status === "pending" && (
                <div className="flex flex-wrap gap-2">
                  <label className={btn + " cursor-pointer !px-3 !py-1.5 !text-xs"}>{uploading === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Award className="h-3.5 w-3.5" />} Délivrer (PDF)<input type="file" accept="application/pdf,image/*" className="sr-only" onChange={event => { void issue(item.id, event.target.files?.[0]); event.target.value = ""; }} /></label>
                  <button className={btnGhost + " !px-3 !py-1.5 !text-xs"} onClick={() => window.confirm("Délivrer sans pièce jointe ? Le membre recevra un e-mail de notification.") && review.mutate({ id: item.id, status: "issued" })}>Délivrer sans fichier</button>
                  <button className={btnDanger} onClick={() => review.mutate({ id: item.id, status: "rejected" })}>Refuser</button>
                </div>
              )}
            </Td>
          </tr>
        ))}
      </DataTable>
    </Card>
  );
}

/* ───────── Dossiers étudiants ───────── */
export function StudentsTab() {
  const apps = trpc.student.list.useQuery();
  const review = trpc.student.review.useMutation({ onSuccess: () => { toast.success("Décision enregistrée et envoyée au membre."); void apps.refetch(); }, onError: error => toast.error(error.message) });
  const doc = (key: string | null, text: string) => key ? <a key={text} href={fileHref(key)} target="_blank" rel="noreferrer" className="block font-semibold text-[#eb6a3d] hover:underline">{text}</a> : null;
  return (
    <Card title="Demandes d'accès étudiant" subtitle="Les justificatifs sont privés : seuls les administrateurs peuvent les ouvrir.">
      <DataTable head={["Date", "Étudiant", "Établissement", "Filière / niveau", "Motivation", "Documents", "État", "Actions"]} empty={apps.data?.length === 0 ? "Aucune demande." : undefined}>
        {apps.data?.map(item => (
          <tr key={item.id}>
            <Td className="whitespace-nowrap">{formatDate(item.createdAt)}</Td>
            <Td><span className="font-semibold text-[#193f36]">{item.firstName} {item.lastName}</span><br /><span className="text-xs">{item.email} · {item.country}</span></Td>
            <Td>{item.schoolName}<br /><span className="text-xs">{item.schoolType}</span></Td><Td>{item.fieldOfStudy}<br /><span className="text-xs">{item.educationLevel}</span></Td>
            <Td className="max-w-[240px] text-xs">{item.motivation}</Td>
            <Td>{doc(item.studentProofKey, "Preuve de scolarité")}{doc(item.identityProofKey, "Pièce d'identité")}{doc(item.additionalProofKey, "Complément")}</Td>
            <Td><Badge color={item.status === "approved" ? "green" : item.status === "pending" ? "gold" : "orange"}>{item.status === "approved" ? "Approuvé" : item.status === "pending" ? "À examiner" : "Refusé"}</Badge></Td>
            <Td>{item.status === "pending" && <div className="flex gap-2"><button className={btn + " !px-3 !py-1.5 !text-xs"} onClick={() => review.mutate({ id: item.id, status: "approved" })}>Approuver</button><button className={btnDanger} onClick={() => review.mutate({ id: item.id, status: "rejected" })}>Refuser</button></div>}</Td>
          </tr>
        ))}
      </DataTable>
    </Card>
  );
}
