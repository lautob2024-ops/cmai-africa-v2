import { PageShell } from "@/components/PageShell";
import { RichText } from "@/components/RichText";
import { formatDate } from "@/lib/format";
import { fileHref } from "@/lib/upload";
import { trpc } from "@/lib/trpc";
import { Award, Download, Landmark, Lightbulb, Loader2, Lock, Newspaper } from "lucide-react";
import { useState } from "react";

const LABELS: Record<string, string> = { article: "Article", challenge: "Défi scientifique", scholarship: "Bourse & aide", university_news: "Actualité universitaire" };
const ICONS = { article: Newspaper, challenge: Lightbulb, scholarship: Award, university_news: Landmark } as const;

export default function ContentHub() {
  const posts = trpc.posts.list.useQuery();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const list = posts.data?.filter(post => filter === "all" || post.type === filter) ?? [];
  return (
    <PageShell title="Articles & défis" kicker="Actualités" description="Défis scientifiques, bourses, opportunités et actualités universitaires publiés par l'équipe CMAI+Africa.">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les publications">
        {[["all", "Tout"], ...Object.entries(LABELS)].map(([key, label]) => (
          <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === key ? "border-[#193f36] bg-[#193f36] text-white" : "border-[#d9d6cf] bg-white text-[#3f4d46] hover:border-[#193f36]"}`}>{label}</button>
        ))}
      </div>
      {posts.isLoading && <Loader2 className="mt-8 h-6 w-6 animate-spin text-[#eb6a3d]" />}
      {!posts.isLoading && list.length === 0 && <p className="mt-8 rounded-2xl border border-dashed border-[#c9cec8] p-8 text-center text-[#718078]">Aucune publication pour le moment.</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {list.map(post => {
          const Icon = ICONS[post.type];
          const expanded = open === post.id;
          return (
            <article key={post.id} className="rounded-3xl border border-[#e2dfd5] bg-white p-6">
              <div className="flex items-center justify-between text-xs font-bold text-[#718078]">
                <span className="flex items-center gap-2 rounded-full bg-[#edf4ee] px-3 py-1 text-[#193f36]"><Icon className="h-3.5 w-3.5" /> {LABELS[post.type]}</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
              <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.04em] text-[#193f36]">{post.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#596961]">{post.excerpt}</p>
              {post.locked ? (
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#fff8f3] p-3 text-sm font-semibold text-[#b8431c]"><Lock className="h-4 w-4" /> Contenu réservé — contactez CMAI+Africa pour y accéder.</p>
              ) : (
                <>
                  <button onClick={() => setOpen(expanded ? null : post.id)} className="mt-4 text-sm font-semibold text-[#eb6a3d] hover:underline">{expanded ? "Réduire" : "Lire la suite"}</button>
                  {expanded && <div className="mt-4 border-t border-[#eeece4] pt-4"><RichText text={post.body} /></div>}
                  {expanded && post.attachments.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {post.attachments.map(file => (
                        <li key={file.id}><a href={fileHref(file.fileKey)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-[#e2dfd5] px-4 py-2 text-sm font-semibold text-[#193f36] hover:border-[#193f36]"><Download className="h-4 w-4" /> <span className="truncate">{file.fileName}</span></a></li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}
