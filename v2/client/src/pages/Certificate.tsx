import { PageShell } from "@/components/PageShell";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Award, CheckCircle2, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const STATUS: Record<string, string> = { pending: "En cours de vérification", issued: "Délivré — envoyé par e-mail", rejected: "Refusé" };

export default function Certificate() {
  const courses = trpc.courses.list.useQuery();
  const requests = trpc.certificates.myRequests.useQuery();
  const [courseId, setCourseId] = useState("");
  const [message, setMessage] = useState("");
  const request = trpc.certificates.request.useMutation({
    onSuccess: () => { toast.success("Demande de certificat transmise pour vérification."); setMessage(""); void requests.refetch(); },
    onError: error => toast.error(error.message),
  });
  const started = courses.data?.filter(course => course.percent > 0 || course.completed) ?? [];
  const eligible = started.filter(course => course.completed);
  const submit = (event: FormEvent) => { event.preventDefault(); request.mutate({ courseId: Number(courseId), message }); };

  return (
    <PageShell title="Certificat" kicker="Reconnaissance" description="Un cours est terminé automatiquement lorsque tous ses chapitres sont validés (temps de lecture et quiz réussis). Vous pouvez alors demander votre certificat.">
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-[#dbe1ea] bg-white p-6">
          <h2 className="font-display text-xl font-semibold text-[#14213d]">Ma progression</h2>
          {courses.isLoading && <Loader2 className="mt-4 h-5 w-5 animate-spin text-[#2f6fed]" />}
          {started.length === 0 && !courses.isLoading && <p className="mt-4 text-sm text-[#5b6b82]">Vous n'avez pas encore commencé de cours.</p>}
          <ul className="mt-4 space-y-5">
            {started.map(course => (
              <li key={course.id}>
                <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#14213d]">
                  <span className="truncate">{course.title}</span>
                  {course.completed ? <span className="flex items-center gap-1 text-[#2e7d56]"><CheckCircle2 className="h-4 w-4" /> Terminé</span> : <span>{course.percent} %</span>}
                </div>
                <ProgressBar className="mt-2" value={course.percent} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-[#dbe1ea] bg-white p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-[#14213d]"><Award className="h-5 w-5 text-[#b47e00]" /> Demander un certificat</h2>
          {eligible.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-[#5b6b82]">Terminez d'abord un cours pour pouvoir demander son certificat.</p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-4">
              <select required className="form-input" value={courseId} onChange={event => setCourseId(event.target.value)}>
                <option value="">Choisir un cours terminé…</option>
                {eligible.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
              </select>
              <textarea required minLength={20} maxLength={1500} rows={4} className="form-input !h-auto py-3" placeholder="Décrivez brièvement ce que vous avez appris (20 caractères minimum)." value={message} onChange={event => setMessage(event.target.value)} />
              <button disabled={request.isPending} className="flex items-center gap-2 rounded-xl bg-[#14213d] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{request.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer la demande</button>
            </form>
          )}
          <ul className="mt-6 space-y-2">
            {requests.data?.map(item => (
              <li key={item.id} className="rounded-2xl border border-[#e7ebf2] p-4 text-sm">
                <p className="font-semibold text-[#14213d]">{item.courseTitle}</p>
                <p className="mt-1 text-xs text-[#5b6b82]">{formatDate(item.requestedAt)} · {STATUS[item.status]}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
