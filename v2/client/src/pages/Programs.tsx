import { PageShell } from "@/components/PageShell";
import { ProgressBar } from "@/components/ProgressBar";
import { formatPrice, formatSeconds } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock, Loader2, Lock, PlayCircle } from "lucide-react";
import { Link } from "wouter";

export default function Programs() {
  const courses = trpc.courses.list.useQuery();
  return (
    <PageShell title="Programmes & cours" kicker="Apprendre" description="Chaque cours est divisé en chapitres. Votre progression se met à jour automatiquement : temps passé et quiz réussis valident les chapitres, sans aucun bouton à cliquer.">
      {courses.isLoading && <Loader2 className="h-6 w-6 animate-spin text-[#2f6fed]" />}
      {courses.data?.length === 0 && <p className="rounded-2xl border border-dashed border-[#c9cec8] p-8 text-center text-[#5b6b82]">Aucun cours n'est publié pour le moment.</p>}
      <div className="grid gap-5 md:grid-cols-2">
        {courses.data?.map(course => (
          <article key={course.id} className="flex flex-col rounded-3xl border border-[#dbe1ea] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-[#eef1f8] px-3 py-1 text-xs font-bold text-[#14213d]">{course.level}</span>
              {!course.isPublished && <span className="rounded-full bg-[#fff1e8] px-3 py-1 text-xs font-bold text-[#b8431c]">Brouillon</span>}
              {course.completed ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#2e7d56]"><CheckCircle2 className="h-4 w-4" /> Terminé</span>
              ) : !course.hasAccess ? (
                <span className="flex items-center gap-1 text-xs font-bold text-[#b8431c]"><Lock className="h-4 w-4" /> {formatPrice(course.priceCents, course.currency)}</span>
              ) : null}
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.04em] text-[#14213d]">{course.title}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#51617a]">{course.description}</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#5b6b82]">
              <span>{course.chapterCount ? `${course.chapterCount} chapitre${course.chapterCount > 1 ? "s" : ""}` : "Cours unique"}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatSeconds(course.requiredSeconds)}</span>
              <span>{formatPrice(course.priceCents, course.currency)}</span>
            </div>
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#3a4658]"><span>Progression</span><span>{course.percent} %</span></div>
              <ProgressBar value={course.percent} label={`Progression du cours ${course.title}`} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {course.hasAccess ? (
                <Link href={`/programmes/${course.id}`} className="inline-flex items-center gap-2 rounded-xl bg-[#14213d] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1f3163]">
                  <PlayCircle className="h-4 w-4" /> {course.percent > 0 && !course.completed ? "Continuer" : course.completed ? "Revoir" : "Commencer"}
                </Link>
              ) : (
                <>
                  <Link href={`/paiement?cours=${course.id}`} className="rounded-xl bg-[#2f6fed] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2657c9]">Payer pour accéder</Link>
                  <Link href={`/programmes/${course.id}`} className="rounded-xl border border-[#cfd6e2] px-5 py-3 text-sm font-semibold text-[#14213d] hover:border-[#14213d]">Voir le plan</Link>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
