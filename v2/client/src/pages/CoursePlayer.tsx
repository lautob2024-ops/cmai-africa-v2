import { PageShell } from "@/components/PageShell";
import { ProgressBar } from "@/components/ProgressBar";
import { RichText } from "@/components/RichText";
import { fileHref } from "@/lib/upload";
import { formatPrice, formatSeconds } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "../../../server/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowLeft, Award, CheckCircle2, Circle, Clock, Download, FileText, Loader2, Lock, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";

type Detail = inferRouterOutputs<AppRouter>["courses"]["detail"];
type Chapter = Detail["chapters"][number];

/** Compte uniquement le temps réel de présence : onglet visible + activité récente (souris, clavier, défilement, toucher). */
function useActiveTimer(enabled: boolean, initial: number, flush: (seconds: number) => Promise<number | null>) {
  const [seconds, setSeconds] = useState(initial);
  const pending = useRef(0);
  const busy = useRef(false);
  const lastActivity = useRef(Date.now());
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const send = useCallback(async () => {
    if (busy.current || pending.current <= 0) return;
    busy.current = true;
    const amount = pending.current;
    try {
      const server = await flushRef.current(amount);
      pending.current = Math.max(0, pending.current - amount);
      if (server !== null) setSeconds(current => Math.max(current, server));
    } catch {
      /* on réessaiera au prochain cycle */
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const touch = () => { lastActivity.current = Date.now(); };
    const events = ["mousemove", "keydown", "scroll", "touchstart", "click"] as const;
    events.forEach(name => window.addEventListener(name, touch, { passive: true }));
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastActivity.current > 90_000) return;
      pending.current += 1;
      setSeconds(current => current + 1);
      if (pending.current >= 15) void send();
    }, 1000);
    const onHide = () => { if (document.visibilityState === "hidden") void send(); };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      events.forEach(name => window.removeEventListener(name, touch));
      document.removeEventListener("visibilitychange", onHide);
      window.clearInterval(tick);
      void send();
    };
  }, [enabled, send]);

  return seconds;
}

function Quiz({ chapter, passing, onDone }: { chapter: Chapter; passing: number; onDone: () => void }) {
  const [answers, setAnswers] = useState<number[]>(() => chapter.quiz.map(() => -1));
  const [results, setResults] = useState<boolean[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const submit = trpc.learning.submitQuiz.useMutation({
    onSuccess: data => {
      setResults(data.results);
      setScore(data.score);
      if (data.passed) toast.success(`Quiz réussi : ${data.score} %`);
      else toast.error(`Score ${data.score} % — ${passing} % requis. Relisez le chapitre et réessayez.`);
      onDone();
    },
    onError: error => toast.error(error.message),
  });
  return (
    <section className="mt-10 rounded-3xl border border-[#dbe1ea] bg-white p-6">
      <h3 className="font-display text-2xl font-semibold text-[#14213d]">Quiz du chapitre</h3>
      <p className="mt-1 text-sm text-[#5b6b82]">Score minimum requis : {passing} %. {chapter.quizScore !== null && `Votre meilleur score : ${chapter.quizScore} %.`}</p>
      <div className="mt-6 space-y-7">
        {chapter.quiz.map((question, qi) => (
          <fieldset key={question.id}>
            <legend className="flex items-start gap-2 font-semibold text-[#14213d]">
              {results && (results[qi] ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2e7d56]" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#c94d36]" />)}
              <span>{qi + 1}. {question.question}</span>
            </legend>
            <div className="mt-3 space-y-2">
              {question.options.map((option, oi) => (
                <label key={oi} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${answers[qi] === oi ? "border-[#14213d] bg-[#eef1f8]" : "border-[#dbe1ea] hover:border-[#9db3d6]"}`}>
                  <input type="radio" name={`q-${question.id}`} className="accent-[#14213d]" checked={answers[qi] === oi} onChange={() => { setResults(null); setAnswers(current => current.map((value, index) => (index === qi ? oi : value))); }} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <button disabled={submit.isPending || answers.some(value => value < 0)} onClick={() => submit.mutate({ chapterId: chapter.id, answers })} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#14213d] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Valider mes réponses
      </button>
      {score !== null && <p className="mt-3 text-sm font-semibold text-[#3a4658]">Dernier résultat : {score} %</p>}
    </section>
  );
}

function ChapterView({ course, chapter, files, onChange }: { course: Detail["course"]; chapter: Chapter; files: Detail["files"]; onChange: () => void }) {
  const heartbeat = trpc.learning.chapterHeartbeat.useMutation();
  const [done, setDone] = useState(Boolean(chapter.completedAt));
  useEffect(() => { if (chapter.completedAt) setDone(true); }, [chapter.completedAt]);
  const seconds = useActiveTimer(!done && !chapter.locked, chapter.secondsWatched, async amount => {
    const result = await heartbeat.mutateAsync({ chapterId: chapter.id, seconds: amount });
    if (result.completed && !done) {
      setDone(true);
      toast.success("Chapitre validé automatiquement. Bravo !");
      onChange();
    }
    return result.secondsWatched;
  });
  const remaining = Math.max(0, chapter.requiredSeconds - seconds);
  const hasQuiz = chapter.quiz.length > 0;
  const quizPassed = !hasQuiz || (chapter.quizScore ?? 0) >= course.passingScore;

  return (
    <div>
      <div className="rounded-2xl border border-[#dbe1ea] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-[#3a4658]">
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Temps : {formatSeconds(Math.min(seconds, chapter.requiredSeconds))} / {formatSeconds(chapter.requiredSeconds)}</span>
          {done ? <span className="flex items-center gap-1 text-[#2e7d56]"><CheckCircle2 className="h-4 w-4" /> Chapitre validé</span> : <span className="text-[#5b6b82]">Validation automatique</span>}
        </div>
        <ProgressBar className="mt-3" value={(Math.min(seconds, chapter.requiredSeconds) / Math.max(chapter.requiredSeconds, 1)) * 100} label="Temps passé sur le chapitre" />
        {!done && (
          <p className="mt-3 text-xs leading-5 text-[#5b6b82]">
            {remaining > 0 ? `Encore ${formatSeconds(remaining)} de lecture active` : "Temps requis atteint"}
            {hasQuiz ? (quizPassed ? " · quiz réussi." : ` · et un score d'au moins ${course.passingScore} % au quiz.`) : "."} Le chapitre se valide tout seul dès que les conditions sont réunies. Le chronomètre s'arrête si vous quittez la page ou restez inactif.
          </p>
        )}
      </div>

      <article className="mt-8">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-[#14213d]">{chapter.title}</h2>
        {chapter.description && <p className="mt-2 text-[#5b6b82]">{chapter.description}</p>}
        <div className="mt-6"><RichText text={chapter.content ?? ""} /></div>
      </article>

      {files.length > 0 && (
        <section className="mt-8">
          <h3 className="font-display text-xl font-semibold text-[#14213d]">Fichiers du cours</h3>
          <ul className="mt-3 space-y-2">
            {files.map(file => (
              <li key={file.id}>
                <a href={fileHref(file.fileKey)} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-[#dbe1ea] bg-white px-4 py-3 text-sm font-semibold text-[#14213d] hover:border-[#14213d]">
                  <FileText className="h-4 w-4" /> <span className="min-w-0 flex-1 truncate">{file.fileName}</span> <Download className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasQuiz && <Quiz key={chapter.id} chapter={chapter} passing={course.passingScore} onDone={onChange} />}
    </div>
  );
}

/** Cours sans chapitres : le contenu est lu d'un seul tenant, la validation est automatique au temps requis. */
function LegacyCourse({ detail, onChange }: { detail: Detail; onChange: () => void }) {
  const heartbeat = trpc.learning.courseHeartbeat.useMutation();
  const [done, setDone] = useState(Boolean(detail.legacyProgress?.completedAt));
  const seconds = useActiveTimer(!done, detail.legacyProgress?.secondsWatched ?? 0, async amount => {
    const result = await heartbeat.mutateAsync({ courseId: detail.course.id, seconds: amount });
    if (result.useChapters) return null;
    if (result.completed && !done) {
      setDone(true);
      toast.success("Cours terminé automatiquement. Bravo !");
      onChange();
    }
    return result.secondsWatched ?? null;
  });
  const required = detail.course.requiredSeconds;
  return (
    <div>
      <div className="rounded-2xl border border-[#dbe1ea] bg-white p-5">
        <div className="flex justify-between text-sm font-semibold text-[#3a4658]"><span>Temps : {formatSeconds(Math.min(seconds, required))} / {formatSeconds(required)}</span><span>{done ? "Cours terminé" : "Validation automatique"}</span></div>
        <ProgressBar className="mt-3" value={(Math.min(seconds, required) / Math.max(required, 1)) * 100} />
      </div>
      <div className="mt-8"><RichText text={detail.course.content ?? detail.course.description} /></div>
    </div>
  );
}

export default function CoursePlayer() {
  const [, params] = useRoute("/programmes/:id");
  const courseId = Number(params?.id);
  const detailQuery = trpc.courses.detail.useQuery({ courseId }, { enabled: Number.isInteger(courseId) && courseId > 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const detail = detailQuery.data;

  useEffect(() => {
    if (detail && selected === null && detail.chapters.length) {
      setSelected((detail.chapters.find(item => !item.completedAt) ?? detail.chapters[0]).id);
    }
  }, [detail, selected]);

  const refresh = useCallback(() => { void detailQuery.refetch(); }, [detailQuery]);
  const chapter = detail?.chapters.find(item => item.id === selected);

  return (
    <PageShell title={detail?.course.title ?? "Cours"} kicker="Programme" wide>
      <Link href="/programmes" className="-mt-4 mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#14213d]"><ArrowLeft className="h-4 w-4" /> Tous les cours</Link>
      {detailQuery.isLoading && <Loader2 className="h-6 w-6 animate-spin text-[#2f6fed]" />}
      {detailQuery.error && <p className="rounded-2xl border border-[#f0c9b8] bg-[#fff1e8] p-6 text-[#b8431c]">{detailQuery.error.message}</p>}
      {detail && (
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <aside className="h-fit rounded-3xl border border-[#dbe1ea] bg-white p-5 lg:sticky lg:top-24">
            <div className="flex justify-between text-sm font-semibold text-[#3a4658]"><span>Progression du cours</span><span>{detail.percent} %</span></div>
            <ProgressBar className="mt-2" value={detail.percent} label="Progression du cours" />
            {detail.percent === 100 && (
              <Link href="/certificat" className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff8df] px-4 py-3 text-sm font-semibold text-[#8a5a00]"><Award className="h-4 w-4" /> Demander mon certificat</Link>
            )}
            <ol className="mt-5 space-y-1">
              {detail.chapters.map((item, index) => (
                <li key={item.id}>
                  <button disabled={item.locked} onClick={() => setSelected(item.id)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${selected === item.id ? "bg-[#14213d] text-white" : "hover:bg-[#eef1f7]"} disabled:cursor-not-allowed disabled:opacity-60`}>
                    <span className="mt-0.5 shrink-0">
                      {item.locked ? <Lock className="h-4 w-4" /> : item.completedAt ? <CheckCircle2 className={`h-4 w-4 ${selected === item.id ? "text-[#b9c4d6]" : "text-[#2e7d56]"}`} /> : <Circle className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0"><span className="block font-semibold">{index + 1}. {item.title}</span><span className={`text-xs ${selected === item.id ? "text-white/70" : "text-[#5b6b82]"}`}>{formatSeconds(item.requiredSeconds)}{item.quiz.length ? " · quiz" : ""}</span></span>
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <div className="min-w-0">
            {!detail.hasAccess ? (
              <div className="rounded-3xl border border-[#f0c9b8] bg-[#fff8f3] p-8">
                <Lock className="h-8 w-8 text-[#2f6fed]" />
                <h2 className="mt-4 font-display text-3xl font-semibold text-[#14213d]">Ce cours est payant</h2>
                <p className="mt-2 text-[#51617a]">{detail.course.description}</p>
                <p className="mt-4 font-semibold text-[#14213d]">Tarif : {formatPrice(detail.course.priceCents, detail.course.currency)}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/paiement?cours=${detail.course.id}`} className="rounded-xl bg-[#2f6fed] px-6 py-3 text-sm font-semibold text-white">Payer par Mobile Money</Link>
                  <Link href="/demande-etudiant" className="rounded-xl border border-[#cfd6e2] px-6 py-3 text-sm font-semibold text-[#14213d]">Je suis étudiant</Link>
                </div>
              </div>
            ) : detail.chapters.length === 0 ? (
              <LegacyCourse detail={detail} onChange={refresh} />
            ) : chapter ? (
              <>
                <ChapterView key={chapter.id} course={detail.course} chapter={chapter} files={detail.files.filter(file => !file.chapterId || file.chapterId === chapter.id)} onChange={refresh} />
              </>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
