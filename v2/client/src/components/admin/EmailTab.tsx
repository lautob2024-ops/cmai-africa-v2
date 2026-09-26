import { trpc } from "@/lib/trpc";
import { uploadFile, type UploadedFile } from "@/lib/upload";
import { AlertTriangle, FileText, Loader2, Paperclip, Send, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { btn, btnGhost, Card, input, label, splitName } from "./kit";

export function EmailTab({ presetTo }: { presetTo: string }) {
  const status = trpc.admin.emailStatus.useQuery();
  const users = trpc.admin.users.useQuery();
  const [mode, setMode] = useState<"all" | "one">("one");
  const [to, setTo] = useState(presetTo);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => { if (presetTo) { setMode("one"); setTo(presetTo); } }, [presetTo]);

  const send = trpc.admin.sendEmail.useMutation({
    onSuccess: result => {
      if (!result.configured) toast.error("Le serveur d'e-mails n'est pas configuré (SMTP_PASS manquant).");
      else if (result.failed) toast.warning(`${result.sent} e-mail(s) envoyé(s), ${result.failed} échec(s) sur ${result.total}.`);
      else toast.success(`${result.sent} e-mail(s) envoyé(s).`);
      if (!result.failed) { setSubject(""); setMessage(""); setFiles([]); }
    },
    onError: error => toast.error(error.message),
  });

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of Array.from(list)) uploaded.push(await uploadFile(file, "mail"));
      setFiles(current => [...current, ...uploaded].slice(0, 5));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléversement impossible.");
    } finally {
      setUploading(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "all" && !window.confirm(`Envoyer cet e-mail à TOUS les membres (${users.data?.filter(item => item.isActive).length ?? 0}+) ?`)) return;
    send.mutate({ to: mode === "all" ? "all" : to.split(/[,;\s]+/).filter(Boolean), subject, message, attachments: files.map(file => ({ key: file.key, name: file.name, mime: file.mime })) });
  };

  return (
    <Card title="Envoyer un e-mail" subtitle="Écrivez à un membre en particulier ou à toute la communauté, avec des pièces jointes.">
      {status.data && !status.data.configured && (
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-[#fff1e8] p-4 text-sm text-[#b8431c]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> L'envoi d'e-mails n'est pas encore configuré sur le serveur (variable SMTP_PASS). Les messages ne partiront pas tant qu'elle n'est pas renseignée.</p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2" role="radiogroup" aria-label="Destinataires">
          <button type="button" role="radio" aria-checked={mode === "one"} onClick={() => setMode("one")} className={mode === "one" ? btn : btnGhost}>Un membre</button>
          <button type="button" role="radio" aria-checked={mode === "all"} onClick={() => setMode("all")} className={mode === "all" ? btn : btnGhost}>Tous les membres</button>
        </div>
        {mode === "one" && (
          <label className="block">
            <span className={label}>Destinataire(s) *</span>
            <input className={input} list="member-emails" required placeholder="Choisissez un membre ou saisissez une adresse e-mail" value={to} onChange={event => setTo(event.target.value)} />
            <datalist id="member-emails">
              {users.data?.filter(item => item.email && item.isActive).map(item => { const n = splitName(item); return <option key={item.id} value={item.email as string}>{`${n.first} ${n.last}`.trim()}</option>; })}
            </datalist>
            <span className="mt-1 block text-xs text-[#5b6b82]">Plusieurs adresses possibles, séparées par des virgules.</span>
          </label>
        )}
        <label className="block"><span className={label}>Objet *</span><input className={input} required minLength={3} maxLength={180} value={subject} onChange={event => setSubject(event.target.value)} /></label>
        <label className="block"><span className={label}>Message *</span><textarea className={input + " !h-auto py-3"} rows={8} required minLength={5} value={message} onChange={event => setMessage(event.target.value)} /></label>
        <div>
          <span className={label}>Pièces jointes (5 maximum · PDF, images, Word, Excel, PowerPoint, ZIP · 20 Mo)</span>
          <ul className="mt-2 space-y-2">
            {files.map(file => (
              <li key={file.key} className="flex items-center gap-2 rounded-xl bg-[#eef1f7] px-3 py-2 text-sm"><FileText className="h-4 w-4" /><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" aria-label={`Retirer ${file.name}`} onClick={() => setFiles(current => current.filter(item => item.key !== file.key))}><X className="h-4 w-4" /></button></li>
            ))}
          </ul>
          <button type="button" disabled={uploading || files.length >= 5} onClick={() => picker.current?.click()} className={btnGhost + " mt-2"}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Ajouter un fichier</button>
          <input ref={picker} type="file" multiple className="sr-only" onChange={event => { void addFiles(event.target.files); event.target.value = ""; }} />
        </div>
        <button disabled={send.isPending || uploading} className={btn}>{send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Envoyer</button>
      </form>
    </Card>
  );
}
