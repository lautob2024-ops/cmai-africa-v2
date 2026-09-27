import { PageShell } from "@/components/PageShell";
import { RichText } from "@/components/RichText";
import { formatDate, initials } from "@/lib/format";
import { fileHref } from "@/lib/upload";
import { trpc } from "@/lib/trpc";
import { Award, Download, Landmark, Lightbulb, Loader2, Lock, MessageCircle, Newspaper, Send, ShieldCheck, ThumbsUp } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const LABELS: Record<string, string> = { article: "Article", challenge: "Défi scientifique", scholarship: "Bourse & aide", university_news: "Actualité universitaire" };
const ICONS = { article: Newspaper, challenge: Lightbulb, scholarship: Award, university_news: Landmark } as const;

function ArticleComments({ postId }: { postId: number }) {
  const comments = trpc.posts.comments.useQuery({ postId });
  const [body, setBody] = useState("");
  const send = trpc.posts.comment.useMutation({ onSuccess: () => { setBody(""); void comments.refetch(); }, onError: error => toast.error(error.message) });
  return (
    <div className="mt-5 border-t border-[#e7ebf2] pt-4">
      <h4 className="flex items-center gap-2 text-sm font-bold text-[#14213d]"><MessageCircle className="h-4 w-4" /> Commentaires</h4>
      {comments.isLoading && <Loader2 className="mt-3 h-4 w-4 animate-spin text-[#2f6fed]" />}
      <ul className="mt-3 space-y-3">
        {comments.data?.map(comment => (
          <li key={comment.id} className="flex gap-3">
            <span className={`avatar-dot shrink-0 ${comment.isAdmin ? "bg-[#2f6fed]" : "bg-[#14213d]"}`}>{initials(comment.authorName)}</span>
            <div className={`rounded-2xl px-4 py-2 text-sm ${comment.isAdmin ? "bg-[#eef1ff] border border-[#c7d4f2]" : "bg-[#f6f8fb]"}`}>
              <p className="flex items-center gap-1.5 font-semibold text-[#14213d]">
                {comment.authorName} {comment.isAdmin && <span className="flex items-center gap-1 rounded-full bg-[#2f6fed] px-2 py-0.5 text-[0.65rem] font-bold text-white"><ShieldCheck className="h-3 w-3" /> Équipe CMAI+Africa</span>}
                <span className="text-xs font-normal text-[#8a96ab]">{formatDate(comment.createdAt, true)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[#26313f]">{comment.body}</p>
            </div>
          </li>
        ))}
        {comments.data?.length === 0 && <p className="text-sm text-[#8a96ab]">Aucun commentaire pour le moment — soyez le premier à réagir.</p>}
      </ul>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); if (body.trim()) send.mutate({ postId, body }); }} className="mt-3 flex gap-2">
        <input className="form-input !mt-0 !h-11" placeholder="Votre commentaire…" maxLength={2000} value={body} onChange={event => setBody(event.target.value)} />
        <button disabled={send.isPending || !body.trim()} className="rounded-xl bg-[#14213d] px-4 text-white disabled:opacity-50" aria-label="Envoyer"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

export default function ContentHub() {
  const posts = trpc.posts.list.useQuery();
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const like = trpc.posts.like.useMutation({
    onMutate: async input => {
      await utils.posts.list.cancel();
      const previous = utils.posts.list.getData();
      utils.posts.list.setData(undefined, current => current?.map(post => post.id === input.postId ? { ...post, likedByMe: !post.likedByMe, likeCount: post.likeCount + (post.likedByMe ? -1 : 1) } : post));
      return { previous };
    },
    onError: (error, _input, context) => { if (context?.previous) utils.posts.list.setData(undefined, context.previous); toast.error(error.message); },
    onSettled: () => void utils.posts.list.invalidate(),
  });
  const list = posts.data?.filter(post => filter === "all" || post.type === filter) ?? [];
  return (
    <PageShell title="Articles & défis" kicker="Actualités" description="Défis scientifiques, bourses, opportunités et actualités universitaires publiés par l'équipe CMAI+Africa.">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les publications">
        {[["all", "Tout"], ...Object.entries(LABELS)].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === key ? "border-[#14213d] bg-[#14213d] text-white" : "border-[#cfd6e2] bg-white text-[#3a4658] hover:border-[#14213d]"}`}>{label}</button>
        ))}
      </div>
      {posts.isLoading && <Loader2 className="mt-8 h-6 w-6 animate-spin text-[#2f6fed]" />}
      {!posts.isLoading && list.length === 0 && <p className="mt-8 rounded-2xl border border-dashed border-[#c9cec8] p-8 text-center text-[#5b6b82]">Aucune publication pour le moment.</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {list.map(post => {
          const Icon = ICONS[post.type];
          const expanded = open === post.id;
          return (
            <article key={post.id} className="rounded-3xl border border-[#dbe1ea] bg-white p-6">
              <div className="flex items-center justify-between text-xs font-bold text-[#5b6b82]">
                <span className="flex items-center gap-2 rounded-full bg-[#eef1f8] px-3 py-1 text-[#14213d]"><Icon className="h-3.5 w-3.5" /> {LABELS[post.type]}</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.04em] text-[#14213d]">{post.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#51617a]">{post.excerpt}</p>
              {post.locked ? (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff8f3] p-3 text-sm font-semibold text-[#b8431c]"><Lock className="h-4 w-4" /> Contenu réservé — contactez CMAI+Africa pour y accéder.</p>
              ) : (
                <>
                  <div className="mt-4 flex items-center gap-4">
                    <button onClick={() => like.mutate({ postId: post.id })} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${post.likedByMe ? "border-[#14213d] bg-[#14213d] text-white" : "border-[#dbe1ea] text-[#3a4658] hover:border-[#14213d]"}`}>
                      <ThumbsUp className={`h-3.5 w-3.5 ${post.likedByMe ? "fill-current" : ""}`} /> J'aime{post.likeCount > 0 ? ` · ${post.likeCount}` : ""}
                    </button>
                    <button onClick={() => setOpen(expanded ? null : post.id)} className="text-sm font-semibold text-[#2f6fed] hover:underline">{expanded ? "Réduire" : "Lire la suite"}</button>
                  </div>
                  {expanded && <div className="mt-4 border-t border-[#e7ebf2] pt-4"><RichText text={post.body} /></div>}
                  {expanded && post.attachments.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {post.attachments.map(file => (
                        <li key={file.id}><a href={fileHref(file.fileKey)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-[#dbe1ea] px-4 py-2 text-sm font-semibold text-[#14213d] hover:border-[#14213d]"><Download className="h-4 w-4" /> <span className="truncate">{file.fileName}</span></a></li>
                      ))}
                    </ul>
                  )}
                  {expanded && <ArticleComments postId={post.id} />}
                </>
              )}
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
