import { PageShell } from "@/components/PageShell";
import { formatDate, initials } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageSquare } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

function Thread({ discussionId }: { discussionId: number }) {
  const comments = trpc.community.comments.useQuery({ discussionId });
  const [body, setBody] = useState("");
  const send = trpc.community.createComment.useMutation({ onSuccess: () => { setBody(""); void comments.refetch(); }, onError: error => toast.error(error.message) });
  return (
    <div className="mt-4 border-t border-[#e7ebf2] pt-4">
      {comments.isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#2f6fed]" />}
      <ul className="space-y-3">
        {comments.data?.map(comment => (
          <li key={comment.id} className="flex gap-3">
            <span className="avatar-dot shrink-0 bg-[#14213d]">{initials(comment.authorName)}</span>
            <div className="rounded-2xl bg-[#eef1f7] px-4 py-2 text-sm"><p className="font-semibold text-[#14213d]">{comment.authorName} <span className="text-xs font-normal text-[#8a96ab]">{formatDate(comment.createdAt, true)}</span></p><p className="mt-1 whitespace-pre-wrap text-[#3a4658]">{comment.body}</p></div>
          </li>
        ))}
      </ul>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); send.mutate({ discussionId, body }); }} className="mt-4 flex gap-2">
        <input className="form-input !mt-0 !h-11" placeholder="Votre réponse…" minLength={2} maxLength={2000} required value={body} onChange={event => setBody(event.target.value)} />
        <button disabled={send.isPending} className="rounded-xl bg-[#14213d] px-5 text-sm font-semibold text-white disabled:opacity-60">Répondre</button>
      </form>
    </div>
  );
}

export default function Discussions() {
  const list = trpc.community.discussions.useQuery();
  const [form, setForm] = useState({ title: "", body: "" });
  const [open, setOpen] = useState<number | null>(null);
  const create = trpc.community.createDiscussion.useMutation({ onSuccess: () => { setForm({ title: "", body: "" }); void list.refetch(); toast.success("Discussion publiée."); }, onError: error => toast.error(error.message) });
  return (
    <PageShell title="Discussions" kicker="Échanger" description="Posez une question, partagez une idée ou répondez aux autres membres.">
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); create.mutate(form); }} className="rounded-3xl border border-[#dbe1ea] bg-white p-6">
        <h2 className="font-display text-xl font-semibold text-[#14213d]">Lancer une discussion</h2>
        <input className="form-input" placeholder="Titre (4 caractères minimum)" required minLength={4} maxLength={220} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} />
        <textarea className="form-input !h-auto py-3" rows={4} placeholder="Votre message…" required minLength={10} maxLength={3000} value={form.body} onChange={event => setForm({ ...form, body: event.target.value })} />
        <button disabled={create.isPending} className="mt-4 flex items-center gap-2 rounded-xl bg-[#2f6fed] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Publier</button>
      </form>
      <div className="mt-8 space-y-4">
        {list.isLoading && <Loader2 className="h-6 w-6 animate-spin text-[#2f6fed]" />}
        {list.data?.map(item => (
          <article key={item.id} className="rounded-3xl border border-[#dbe1ea] bg-white p-6">
            <p className="text-xs text-[#5b6b82]">{item.authorName} · {formatDate(item.createdAt, true)}</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-[#14213d]">{item.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#3a4658]">{item.body}</p>
            <button onClick={() => setOpen(open === item.id ? null : item.id)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2f6fed]"><MessageSquare className="h-4 w-4" /> {open === item.id ? "Masquer les réponses" : "Voir / répondre"}</button>
            {open === item.id && <Thread discussionId={item.id} />}
          </article>
        ))}
      </div>
    </PageShell>
  );
}
