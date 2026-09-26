import { useAuth } from "@/_core/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { uploadFile } from "@/lib/upload";
import { CheckCircle2, FileUp, Loader2, LockKeyhole, UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const LEVELS = ["Prépa 1", "Prépa 2", "Bac +1", "Bac +2", "Bac +3 / Licence", "Bac +4", "Bac +5 / Master", "Doctorat", "Autre"];
const empty = { firstName: "", lastName: "", country: "", schoolName: "", schoolType: "", schoolWebsite: "", fieldOfStudy: "", educationLevel: "", motivation: "" };
type Keys = { studentProofKey: string; identityProofKey: string; additionalProofKey: string };

function FileField({ label, hint, required, onUploaded }: { label: string; hint: string; required?: boolean; onUploaded: (key: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const handle = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadFile(file, "student");
      setName(uploaded.name);
      onUploaded(uploaded.key);
      toast.success(`${label} téléversé.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléversement impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <label className="block cursor-pointer">
      <span className="form-label">{label} {required && "*"}</span>
      <span className="mt-2 flex min-h-[96px] items-center gap-4 rounded-2xl border border-dashed border-[#c9cec8] bg-[#f6f8fb] p-4 transition hover:border-[#2f6fed]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef1f8] text-[#14213d]">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : name ? <CheckCircle2 className="h-5 w-5 text-[#2e7d56]" /> : <UploadCloud className="h-5 w-5" />}</span>
        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#14213d]">{name || "Choisir un fichier ou prendre une photo"}</span><span className="mt-1 block text-xs text-[#8a96ab]">{hint}</span></span>
      </span>
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" className="sr-only" disabled={busy} onChange={event => void handle(event.target.files?.[0])} />
    </label>
  );
}

export default function StudentApplication() {
  const { user } = useAuth();
  const application = trpc.student.myApplication.useQuery();
  const [form, setForm] = useState(empty);
  const [keys, setKeys] = useState<Keys>({ studentProofKey: "", identityProofKey: "", additionalProofKey: "" });
  const [done, setDone] = useState(false);
  const institutions = trpc.institutions.search.useQuery({ query: form.schoolName }, { enabled: form.schoolName.length > 1 });
  const submit = trpc.student.submit.useMutation({ onSuccess: () => { setDone(true); void application.refetch(); toast.success("Votre demande a été envoyée."); }, onError: error => toast.error(error.message) });
  const set = (key: keyof typeof empty, value: string) => setForm(current => ({ ...current, [key]: value }));
  const prefill = useMemo(() => user && ({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", country: user.country ?? "", schoolName: user.university ?? "" }), [user]);
  useEffect(() => { if (prefill) setForm(current => ({ ...current, firstName: current.firstName || prefill.firstName, lastName: current.lastName || prefill.lastName, country: current.country || prefill.country, schoolName: current.schoolName || prefill.schoolName })); }, [prefill]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!keys.studentProofKey || !keys.identityProofKey) return void toast.error("Ajoutez les deux justificatifs obligatoires.");
    submit.mutate({ ...form, ...keys, additionalProofKey: keys.additionalProofKey || undefined });
  };

  return (
    <PageShell title="Demande étudiant" kicker="Accès gratuit" description="Cette aide est réservée aux étudiants. Remplissez vos informations scolaires et téléversez des justificatifs lisibles (fichier ou photo prise depuis votre téléphone).">
      {application.data || done ? (
        <div className="mx-auto max-w-lg rounded-3xl border border-[#bdd9c5] bg-[#eef1f8] p-9 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[#14213d]" />
          <h2 className="mt-5 font-display text-3xl font-semibold text-[#14213d]">{done && !application.data ? "Dossier transmis" : "Demande déjà envoyée"}</h2>
          <p className="mt-4 leading-7 text-[#51617a]">Votre dossier est {application.data?.status === "approved" ? "validé : vous avez accès gratuitement à tous les cours" : application.data?.status === "rejected" ? "refusé après examen" : "en cours d'examen. Vous serez informé par e-mail"}. Une seule demande est autorisée par compte.</p>
          <Link href="/home" className="mt-7 inline-block rounded-xl bg-[#14213d] px-5 py-3 text-sm font-semibold text-white">Retour à l'espace membre</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="max-w-4xl space-y-8 rounded-3xl border border-[#dbe1ea] bg-white p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block"><span className="form-label">Prénom *</span><input required className="form-input" value={form.firstName} onChange={event => set("firstName", event.target.value)} /></label>
            <label className="block"><span className="form-label">Nom *</span><input required className="form-input" value={form.lastName} onChange={event => set("lastName", event.target.value)} /></label>
            <label className="block"><span className="form-label">Pays *</span><input required className="form-input" value={form.country} onChange={event => set("country", event.target.value)} /></label>
            <label className="block"><span className="form-label">Type d'établissement *</span>
              <select required className="form-input" value={form.schoolType} onChange={event => set("schoolType", event.target.value)}>
                <option value="">Sélectionner…</option>{["Université", "École supérieure", "Lycée", "Classe préparatoire", "Centre de formation"].map(item => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="block md:col-span-2"><span className="form-label">École ou université *</span>
              <input required list="institutions" className="form-input" value={form.schoolName} onChange={event => set("schoolName", event.target.value)} placeholder="Commencez à saisir pour voir les suggestions" />
              <datalist id="institutions">{institutions.data?.map(item => <option key={item.name} value={item.name} />)}</datalist>
              <span className="mt-1 block text-xs text-[#5b6b82]">Vous pouvez aussi saisir un établissement absent de la liste.</span>
            </label>
            <label className="block"><span className="form-label">Site de l'établissement</span><input type="url" className="form-input" placeholder="https://…" value={form.schoolWebsite} onChange={event => set("schoolWebsite", event.target.value)} /></label>
            <label className="block"><span className="form-label">Filière / spécialité *</span><input required className="form-input" placeholder="Mathématiques, informatique…" value={form.fieldOfStudy} onChange={event => set("fieldOfStudy", event.target.value)} /></label>
            <label className="block"><span className="form-label">Niveau d'études *</span>
              <select required className="form-input" value={form.educationLevel} onChange={event => set("educationLevel", event.target.value)}>
                <option value="">Sélectionner…</option>{LEVELS.map(item => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <label className="block"><span className="form-label">Pourquoi souhaitez-vous suivre les cours gratuitement ? *</span><textarea required minLength={20} maxLength={3000} rows={4} className="form-input !h-auto py-3" value={form.motivation} onChange={event => set("motivation", event.target.value)} /></label>
          <div>
            <div className="flex items-center gap-3"><FileUp className="h-5 w-5 text-[#14213d]" /><div><h3 className="font-display text-lg font-semibold text-[#14213d]">Pièces justificatives</h3><p className="text-xs text-[#5b6b82]">PDF, JPG, PNG ou WEBP · 8 Mo maximum par fichier.</p></div></div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <FileField required label="Preuve de scolarité" hint="Carte étudiant, certificat ou fiche d'inscription" onUploaded={key => setKeys(current => ({ ...current, studentProofKey: key }))} />
              <FileField required label="Pièce d'identité" hint="Carte d'identité ou passeport lisible" onUploaded={key => setKeys(current => ({ ...current, identityProofKey: key }))} />
              <FileField label="Justificatif complémentaire" hint="Tout autre document utile" onUploaded={key => setKeys(current => ({ ...current, additionalProofKey: key }))} />
            </div>
          </div>
          <p className="flex items-center gap-2 rounded-xl bg-[#eef1f7] p-4 text-xs leading-5 text-[#51617a]"><LockKeyhole className="h-4 w-4 shrink-0" /> Vos documents sont stockés de façon privée : seuls vous et l'équipe chargée d'étudier les demandes peuvent les consulter.</p>
          <button disabled={submit.isPending} className="flex items-center gap-2 rounded-xl bg-[#14213d] px-7 py-4 text-sm font-semibold text-white disabled:opacity-60">{submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer ma demande</button>
        </form>
      )}
    </PageShell>
  );
}
