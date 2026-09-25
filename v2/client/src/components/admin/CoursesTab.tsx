import { trpc } from "@/lib/trpc";
import { fileHref, uploadFile } from "@/lib/upload";
import { formatPrice } from "@/lib/format";
import type { AppRouter } from "../../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { ChevronDown, ChevronUp, FileText, Loader2, Paperclip, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge, btn, btnDanger, btnGhost, btnOrange, Card, input, label } from "./kit";

type Detail = inferRouterOutputs<AppRouter>["courses"]["detail"];
type ChapterT = Detail["chapters"][number];

/* ───────── Fichiers (cours ou chapitre) ───────── */
function FilesEditor({ courseId, chapterId, files, onChange }: { courseId: number; chapterId?: number; files: Detail["files"]; onChange: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const add = trpc.courses.addFile.useMutation({ onSuccess: onChange, onError: error => toast.error(error.message) });
  const remove = trpc.courses.removeFile.useMutation({ onSuccess: onChange, onError: error => toast.error(error.message) });
  const scoped = files.filter(file => (chapterId ? file.chapterId === chapterId : !file.chapterId));
  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const uploaded = await uploadFile(file, "course");
        await add.mutateAsync({ courseId, chapterId, file: { key: uploaded.key, name: uploaded.name, mime: uploaded.mime } });
      }
      toast.success("Fichier(s) ajouté(s).");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Téléversement impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <span className={label}>{chapterId ? "Fichiers du chapitre" : "Fichiers du cours (visibles dans tous les chapitres)"}</span>
      <ul className="mt-2 space-y-2">
        {scoped.map(file => (
          <li key={file.id} className="flex items-center gap-2 rounded-xl bg-[#f6f5f0] px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0" /><a href={fileHref(file.fileKey)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-semibold text-[#193f36] hover:underline">{file.fileName}</a>
            <button type="button" aria-label={`Supprimer ${file.fileName}`} onClick={() => window.confirm("Retirer ce fichier ?") && remove.mutate({ id: file.id })}><X className="h-4 w-4 text-[#c94d36]" /></button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={busy} onClick={() => picker.current?.click()} className={btnGhost + " mt-2"}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Ajouter un fichier</button>
      <input ref={picker} type="file" multiple className="sr-only" onChange={event => { void upload(event.target.files); event.target.value = ""; }} />
    </div>
  );
}

/* ───────── Quiz d'un chapitre ───────── */
type Q = { question: string; options: string[]; correctOption: number };
function QuizEditor({ chapter, onSaved }: { chapter: ChapterT; onSaved: () => void }) {
  const [questions, setQuestions] = useState<Q[]>(() => chapter.quiz.map(item => ({ question: item.question, options: [...item.options], correctOption: (item as { correctOption?: number }).correctOption ?? 0 })));
  const save = trpc.courses.saveQuiz.useMutation({ onSuccess: () => { toast.success("Quiz enregistré."); onSaved(); }, onError: error => toast.error(error.message) });
  const patch = (index: number, change: Partial<Q>) => setQuestions(current => current.map((item, i) => (i === index ? { ...item, ...change } : item)));
  return (
    <div>
      <span className={label}>Quiz du chapitre (laisser vide = pas de quiz)</span>
      <div className="mt-2 space-y-4">
        {questions.map((item, qi) => (
          <div key={qi} className="rounded-2xl border border-[#e2dfd5] p-4">
            <div className="flex gap-2">
              <input className={input + " !mt-0"} placeholder={`Question ${qi + 1}`} value={item.question} onChange={event => patch(qi, { question: event.target.value })} />
              <button type="button" aria-label="Supprimer la question" onClick={() => setQuestions(current => current.filter((_, i) => i !== qi))} className={btnDanger}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-3 space-y-2">
              {item.options.map((option, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`c-${chapter.id}-${qi}`} aria-label={`Bonne réponse : option ${oi + 1}`} className="accent-[#193f36]" checked={item.correctOption === oi} onChange={() => patch(qi, { correctOption: oi })} />
                  <input className={input + " !mt-0 !h-10"} placeholder={`Option ${oi + 1}`} value={option} onChange={event => patch(qi, { options: item.options.map((o, i) => (i === oi ? event.target.value : o)) })} />
                  {item.options.length > 2 && <button type="button" aria-label="Retirer l'option" onClick={() => patch(qi, { options: item.options.filter((_, i) => i !== oi), correctOption: item.correctOption >= oi && item.correctOption > 0 ? item.correctOption - 1 : item.correctOption })}><X className="h-4 w-4 text-[#9aa49d]" /></button>}
                </div>
              ))}
              {item.options.length < 6 && <button type="button" onClick={() => patch(qi, { options: [...item.options, ""] })} className="text-xs font-semibold text-[#eb6a3d]">+ Ajouter une option</button>}
            </div>
            <p className="mt-2 text-xs text-[#718078]">Cochez le bouton radio de la bonne réponse.</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setQuestions(current => [...current, { question: "", options: ["", "", "", ""], correctOption: 0 }])} className={btnGhost}><Plus className="h-4 w-4" /> Ajouter une question</button>
        <button type="button" disabled={save.isPending} onClick={() => save.mutate({ chapterId: chapter.id, questions: questions.map(item => ({ ...item, options: item.options.map(option => option.trim()).filter(Boolean) })).filter(item => item.question.trim()) })} className={btn}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer le quiz</button>
      </div>
    </div>
  );
}

/* ───────── Chapitre ───────── */
function ChapterForm({ courseId, chapter, nextPosition, onSaved, onCancel }: { courseId: number; chapter?: ChapterT; nextPosition: number; onSaved: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState({ title: chapter?.title ?? "", description: chapter?.description ?? "", content: chapter?.content ?? "", position: chapter?.position ?? nextPosition, minutes: Math.max(0, Math.round((chapter?.requiredSeconds ?? 300) / 60)) });
  const save = trpc.courses.saveChapter.useMutation({
    onSuccess: () => { toast.success(chapter ? "Chapitre mis à jour." : "Chapitre ajouté."); if (!chapter) setForm({ title: "", description: "", content: "", position: nextPosition + 1, minutes: 5 }); onSaved(); },
    onError: error => toast.error(error.message),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate({ id: chapter?.id, courseId, title: form.title, description: form.description || undefined, content: form.content, position: form.position, requiredSeconds: Math.round(form.minutes * 60) }); };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_100px_140px]">
        <label className="block"><span className={label}>Titre du chapitre *</span><input className={input} required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
        <label className="block"><span className={label}>Ordre</span><input className={input} type="number" min={1} value={form.position} onChange={event => setForm({ ...form, position: Number(event.target.value) })} /></label>
        <label className="block"><span className={label}>Temps requis (min)</span><input className={input} type="number" min={0} value={form.minutes} onChange={event => setForm({ ...form, minutes: Number(event.target.value) })} /></label>
      </div>
      <label className="block"><span className={label}>Résumé (facultatif)</span><input className={input} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <label className="block"><span className={label}>Contenu du chapitre *</span><textarea className={input + " !h-auto py-3 font-mono text-[0.85rem]"} rows={10} required value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} placeholder={"# Titre\n\nParagraphe…\n\n- point 1\n- point 2\n\n**gras** pour insister."} /></label>
      <div className="flex gap-2">
        <button disabled={save.isPending} className={btn}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {chapter ? "Enregistrer" : "Ajouter le chapitre"}</button>
        {onCancel && <button type="button" onClick={onCancel} className={btnGhost}>Fermer</button>}
      </div>
    </form>
  );
}

function ChapterCard({ detail, chapter, onChange }: { detail: Detail; chapter: ChapterT; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const remove = trpc.courses.removeChapter.useMutation({ onSuccess: () => { toast.success("Chapitre supprimé."); onChange(); }, onError: error => toast.error(error.message) });
  return (
    <div className="rounded-2xl border border-[#e2dfd5]">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ee] text-sm font-bold text-[#193f36]">{chapter.position}</span>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#193f36]">{chapter.title}</p><p className="text-xs text-[#718078]">{Math.round(chapter.requiredSeconds / 60)} min · {chapter.quiz.length} question(s)</p></div>
        <button onClick={() => setOpen(!open)} className={btnGhost + " !px-3 !py-1.5 !text-xs"} aria-expanded={open}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Modifier</button>
        <button onClick={() => window.confirm(`Supprimer le chapitre « ${chapter.title} » et les progressions associées ?`) && remove.mutate({ id: chapter.id })} className={btnDanger} aria-label="Supprimer le chapitre"><Trash2 className="h-4 w-4" /></button>
      </div>
      {open && (
        <div className="space-y-6 border-t border-[#eeece4] p-4">
          <ChapterForm courseId={detail.course.id} chapter={chapter} nextPosition={chapter.position} onSaved={onChange} />
          <hr className="border-[#eeece4]" />
          <QuizEditor chapter={chapter} onSaved={onChange} />
          <hr className="border-[#eeece4]" />
          <FilesEditor courseId={detail.course.id} chapterId={chapter.id} files={detail.files} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/* ───────── Cours ───────── */
function CourseForm({ course, onSaved }: { course?: Detail["course"]; onSaved: (id?: number) => void }) {
  const [form, setForm] = useState({
    title: course?.title ?? "", level: course?.level ?? "Débutant", description: course?.description ?? "", content: course?.content ?? "",
    price: (course?.priceCents ?? 0) / 100, currency: (course?.currency as "USD" | "XOF") ?? "USD", minutes: Math.round((course?.requiredSeconds ?? 1800) / 60), passingScore: course?.passingScore ?? 70, isPublished: course ? Boolean(course.isPublished) : false,
  });
  const create = trpc.courses.create.useMutation({ onSuccess: data => { toast.success("Cours créé. Ajoutez maintenant ses chapitres."); onSaved(data.id); }, onError: error => toast.error(error.message) });
  const update = trpc.courses.update.useMutation({ onSuccess: () => { toast.success("Cours enregistré."); onSaved(); }, onError: error => toast.error(error.message) });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const payload = { title: form.title, level: form.level, description: form.description, content: form.content, price: form.price, currency: form.currency, requiredSeconds: Math.round(form.minutes * 60), passingScore: form.passingScore, isPublished: form.isPublished };
    if (course) update.mutate({ id: course.id, ...payload });
    else create.mutate(payload);
  };
  const busy = create.isPending || update.isPending;
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2"><span className={label}>Titre du cours *</span><input className={input} required minLength={2} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
        <label className="block"><span className={label}>Niveau *</span><input className={input} required value={form.level} onChange={event => setForm({ ...form, level: event.target.value })} /></label>
        <label className="block"><span className={label}>Prix (0 = gratuit) *</span>
          <div className="flex gap-2"><input className={input} type="number" min={0} step="any" required value={form.price} onChange={event => setForm({ ...form, price: Number(event.target.value) })} />
            <select className={input + " !w-28"} value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value as "USD" | "XOF" })}><option value="USD">USD ($)</option><option value="XOF">F CFA</option></select></div>
        </label>
        <label className="block"><span className={label}>Temps total requis (minutes)</span><input className={input} type="number" min={1} value={form.minutes} onChange={event => setForm({ ...form, minutes: Number(event.target.value) })} /><span className="mt-1 block text-xs text-[#718078]">Utilisé seulement si le cours n'a pas de chapitres.</span></label>
        <label className="block"><span className={label}>Score minimal aux quiz (%)</span><input className={input} type="number" min={0} max={100} value={form.passingScore} onChange={event => setForm({ ...form, passingScore: Number(event.target.value) })} /></label>
      </div>
      <label className="block"><span className={label}>Description (visible dans le catalogue) *</span><textarea className={input + " !h-auto py-3"} rows={3} required minLength={10} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
      <label className="block"><span className={label}>Contenu général (facultatif — pour un cours sans chapitres)</span><textarea className={input + " !h-auto py-3 font-mono text-[0.85rem]"} rows={5} value={form.content} onChange={event => setForm({ ...form, content: event.target.value })} /></label>
      <label className="flex items-center gap-3 text-sm font-semibold text-[#193f36]"><input type="checkbox" className="h-4 w-4 accent-[#193f36]" checked={form.isPublished} onChange={event => setForm({ ...form, isPublished: event.target.checked })} /> Publié (visible par les membres)</label>
      <button disabled={busy} className={btn}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {course ? "Enregistrer le cours" : "Créer le cours"}</button>
    </form>
  );
}

function CourseManager({ id, onRemoved, onListChanged }: { id: number; onRemoved: () => void; onListChanged: () => void }) {
  const detail = trpc.courses.detail.useQuery({ courseId: id });
  const refresh = () => { void detail.refetch(); onListChanged(); };
  const remove = trpc.courses.remove.useMutation({ onSuccess: () => { toast.success("Cours supprimé."); onRemoved(); }, onError: error => toast.error(error.message) });
  if (detail.isLoading || !detail.data) return <Loader2 className="h-6 w-6 animate-spin text-[#eb6a3d]" />;
  const data = detail.data;
  return (
    <div className="space-y-6">
      <Card title="Informations du cours" actions={<button onClick={() => window.confirm(`Supprimer définitivement « ${data.course.title} », ses chapitres et toutes les progressions ?`) && remove.mutate({ id })} className={btnDanger}><Trash2 className="h-4 w-4" /> Supprimer</button>}>
        <CourseForm key={data.course.updatedAt.toString()} course={data.course} onSaved={refresh} />
      </Card>
      <Card title={`Chapitres (${data.chapters.length})`} subtitle="Le pourcentage de progression des membres est calculé à partir des chapitres validés.">
        <div className="space-y-3">
          {data.chapters.map(chapter => <ChapterCard key={chapter.id} detail={data} chapter={chapter} onChange={refresh} />)}
        </div>
        <div className="mt-6 rounded-2xl border border-dashed border-[#c9cec8] p-4"><h3 className="mb-3 font-display text-lg font-semibold text-[#193f36]">Ajouter un chapitre</h3><ChapterForm courseId={id} nextPosition={data.chapters.length + 1} onSaved={refresh} /></div>
      </Card>
      <Card title="Fichiers du cours"><FilesEditor courseId={id} files={data.files} onChange={refresh} /></Card>
    </div>
  );
}

export function CoursesTab() {
  const list = trpc.courses.list.useQuery();
  const [selected, setSelected] = useState<number | "new" | null>(null);
  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card title="Cours" actions={<button onClick={() => setSelected("new")} className={btnOrange + " !px-3 !py-1.5"}><Plus className="h-4 w-4" /> Nouveau</button>}>
        {list.isLoading && <Loader2 className="h-5 w-5 animate-spin text-[#eb6a3d]" />}
        <ul className="space-y-2">
          {list.data?.map(course => (
            <li key={course.id}>
              <button onClick={() => setSelected(course.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selected === course.id ? "border-[#193f36] bg-[#edf4ee]" : "border-[#e2dfd5] hover:border-[#9fb5a8]"}`}>
                <span className="block font-semibold text-[#193f36]">{course.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#718078]">{formatPrice(course.priceCents, course.currency)} · {course.chapterCount} chapitre(s) {course.isPublished ? <Badge color="green">Publié</Badge> : <Badge color="orange">Brouillon</Badge>}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <div>
        {selected === "new" && <Card title="Nouveau cours"><CourseForm onSaved={id => { void list.refetch(); if (id) setSelected(id); }} /></Card>}
        {typeof selected === "number" && <CourseManager key={selected} id={selected} onRemoved={() => { setSelected(null); void list.refetch(); }} onListChanged={() => void list.refetch()} />}
        {selected === null && <p className="rounded-2xl border border-dashed border-[#c9cec8] p-10 text-center text-[#718078]">Sélectionnez un cours pour modifier son prix, son contenu, ses chapitres, ses quiz et ses fichiers, ou créez-en un nouveau.</p>}
      </div>
    </div>
  );
}
