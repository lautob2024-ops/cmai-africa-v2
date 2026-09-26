import { useAuth } from "@/_core/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { formatDate, initials } from "@/lib/format";
import { fileHref, uploadFile, type UploadedFile } from "@/lib/upload";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Loader2, MessageCircle, Paperclip, Search, Send, Trash2, UserCheck, UserPlus, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Tab = "feed" | "members" | "messages";
const REACTIONS = [{ id: "like", emoji: "👍", label: "J'aime" }, { id: "bravo", emoji: "👏", label: "Bravo" }, { id: "idea", emoji: "💡", label: "Idée" }] as const;

const Avatar = ({ name }: { name: string }) => <span className="avatar-dot shrink-0 bg-[#14213d]" aria-hidden="true">{initials(name)}</span>;

function Comments({ postId, onChange }: { postId: number; onChange: () => void }) {
  const comments = trpc.community.postComments.useQuery({ postId });
  const [body, setBody] = useState("");
  const send = trpc.community.commentPost.useMutation({ onSuccess: () => { setBody(""); void comments.refetch(); onChange(); }, onError: error => toast.error(error.message) });
  return (
    <div className="mt-4 border-t border-[#e7ebf2] pt-4">
      {comments.isLoading && <Loader2 className="h-4 w-4 animate-spin text-[#2f6fed]" />}
      <ul className="space-y-3">
        {comments.data?.map(comment => (
          <li key={comment.id} className="flex gap-3">
            <Avatar name={comment.authorName} />
            <div className="rounded-2xl bg-[#eef1f7] px-4 py-2 text-sm"><p className="font-semibold text-[#14213d]">{comment.authorName} <span className="text-xs font-normal text-[#8a96ab]">{formatDate(comment.createdAt, true)}</span></p><p className="mt-1 whitespace-pre-wrap text-[#3a4658]">{comment.body}</p></div>
          </li>
        ))}
      </ul>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); send.mutate({ postId, body }); }} className="mt-3 flex gap-2">
        <input className="form-input !mt-0 !h-11" placeholder="Écrire un commentaire…" required maxLength={2000} value={body} onChange={event => setBody(event.target.value)} />
        <button disabled={send.isPending} className="rounded-xl bg-[#14213d] px-4 text-sm font-semibold text-white disabled:opacity-60" aria-label="Envoyer le commentaire"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function Feed() {
  const { user } = useAuth();
  const feed = trpc.community.feed.useQuery(undefined, { refetchInterval: 30_000 });
  const [body, setBody] = useState("");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const publish = trpc.community.publish.useMutation({ onSuccess: () => { setBody(""); setFile(null); void feed.refetch(); toast.success("Publication envoyée."); }, onError: error => toast.error(error.message) });
  const react = trpc.community.react.useMutation({ onSuccess: () => void feed.refetch(), onError: error => toast.error(error.message) });
  const remove = trpc.community.deletePost.useMutation({ onSuccess: () => void feed.refetch(), onError: error => toast.error(error.message) });

  const pick = async (selected?: File) => {
    if (!selected) return;
    setUploading(true);
    try { setFile(await uploadFile(selected, "media")); } catch (error) { toast.error(error instanceof Error ? error.message : "Téléversement impossible."); } finally { setUploading(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); publish.mutate({ body, attachment: file ? { key: file.key, name: file.name, mime: file.mime } : undefined }); }} className="rounded-3xl border border-[#dbe1ea] bg-white p-5">
        <div className="flex gap-3">
          <Avatar name={user?.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user?.name ?? "Moi"} />
          <textarea className="min-h-[88px] w-full resize-y rounded-2xl border border-[#dbe1ea] p-3 text-sm outline-none focus:border-[#2f6fed]" placeholder="Partagez une idée, une question, une ressource…" required minLength={2} maxLength={5000} value={body} onChange={event => setBody(event.target.value)} />
        </div>
        {file && <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#eef1f7] px-3 py-2 text-xs font-semibold text-[#14213d]"><FileText className="h-4 w-4" /> <span className="truncate">{file.name}</span><button type="button" onClick={() => setFile(null)} aria-label="Retirer le fichier" className="ml-auto"><X className="h-4 w-4" /></button></p>}
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => input.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 text-sm font-semibold text-[#51617a] hover:text-[#14213d]">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Photo ou PDF</button>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={event => { void pick(event.target.files?.[0]); event.target.value = ""; }} />
          <button disabled={publish.isPending} className="rounded-xl bg-[#2f6fed] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Publier</button>
        </div>
      </form>

      {feed.isLoading && <Loader2 className="mt-8 h-6 w-6 animate-spin text-[#2f6fed]" />}
      {feed.data?.length === 0 && <p className="mt-8 text-center text-sm text-[#5b6b82]">Soyez le premier à publier dans la communauté.</p>}
      <div className="mt-6 space-y-4">
        {feed.data?.map(post => {
          const totalReactions = Object.values(post.reactions).reduce((sum, value) => sum + value, 0);
          return (
            <article key={post.id} className="rounded-3xl border border-[#dbe1ea] bg-white p-5">
              <header className="flex items-start gap-3">
                <Avatar name={post.author.name} />
                <div className="min-w-0 flex-1"><p className="font-semibold text-[#14213d]">{post.author.name}</p><p className="truncate text-xs text-[#5b6b82]">{post.author.profession ? `${post.author.profession} · ` : ""}{formatDate(post.createdAt, true)}</p></div>
                {(post.isMine || user?.role === "admin") && <button onClick={() => window.confirm("Supprimer cette publication ?") && remove.mutate({ postId: post.id })} aria-label="Supprimer la publication" className="text-[#8a96ab] hover:text-[#c94d36]"><Trash2 className="h-4 w-4" /></button>}
              </header>
              <p className="mt-4 whitespace-pre-wrap text-[0.95rem] leading-7 text-[#26313f]">{post.body}</p>
              {post.attachment && (/^image\//.test(post.attachment.mime)
                ? <img src={fileHref(post.attachment.key)} alt={post.attachment.name} loading="lazy" className="mt-4 max-h-[420px] w-full rounded-2xl object-cover" />
                : <a href={fileHref(post.attachment.key)} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 rounded-xl border border-[#dbe1ea] px-4 py-3 text-sm font-semibold text-[#14213d]"><FileText className="h-4 w-4" /> {post.attachment.name}</a>)}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e7ebf2] pt-3">
                {REACTIONS.map(item => (
                  <button key={item.id} onClick={() => react.mutate({ postId: post.id, reaction: item.id })} aria-pressed={post.myReaction === item.id} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${post.myReaction === item.id ? "border-[#14213d] bg-[#14213d] text-white" : "border-[#dbe1ea] text-[#3a4658] hover:border-[#14213d]"}`}>
                    <span aria-hidden="true">{item.emoji}</span> {item.label}{post.reactions[item.id] ? ` · ${post.reactions[item.id]}` : ""}
                  </button>
                ))}
                <button onClick={() => setOpen(open === post.id ? null : post.id)} className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#2f6fed]"><MessageCircle className="h-4 w-4" /> {post.commentCount} commentaire{post.commentCount > 1 ? "s" : ""}</button>
              </div>
              {totalReactions > 0 && <p className="mt-2 text-xs text-[#8a96ab]">{totalReactions} réaction{totalReactions > 1 ? "s" : ""}</p>}
              {open === post.id && <Comments postId={post.id} onChange={() => void feed.refetch()} />}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Members({ onOpenConversation }: { onOpenConversation: (id: number) => void }) {
  const directory = trpc.community.directory.useQuery();
  const invitations = trpc.community.invitations.useQuery();
  const [search, setSearch] = useState("");
  const refresh = () => { void directory.refetch(); void invitations.refetch(); };
  const invite = trpc.community.invite.useMutation({ onSuccess: () => { toast.success("Invitation envoyée."); refresh(); }, onError: error => toast.error(error.message) });
  const respond = trpc.community.respondInvite.useMutation({ onSuccess: () => refresh(), onError: error => toast.error(error.message) });
  const start = trpc.community.startConversation.useMutation({ onSuccess: data => onOpenConversation(data.conversationId), onError: error => toast.error(error.message) });
  const needle = search.trim().toLowerCase();
  const list = (directory.data ?? []).filter(member => !needle || [member.name, member.university, member.city, member.profession].some(value => value?.toLowerCase().includes(needle)));

  return (
    <div className="mx-auto max-w-3xl">
      {invitations.data && invitations.data.length > 0 && (
        <section className="mb-6 rounded-3xl border border-[#f0d9a5] bg-[#fff8df] p-5">
          <h2 className="font-display text-lg font-semibold text-[#8a5a00]">Invitations reçues</h2>
          <ul className="mt-3 space-y-3">
            {invitations.data.map(item => (
              <li key={item.id} className="flex flex-wrap items-center gap-3">
                <Avatar name={item.senderName} />
                <div className="min-w-0 flex-1"><p className="font-semibold text-[#14213d]">{item.senderName}</p><p className="truncate text-xs text-[#5b6b82]">{item.senderProfession ?? "Membre"}</p></div>
                <button onClick={() => respond.mutate({ id: item.id, status: "accepted" })} className="rounded-xl bg-[#14213d] px-4 py-2 text-xs font-semibold text-white">Accepter</button>
                <button onClick={() => respond.mutate({ id: item.id, status: "rejected" })} className="rounded-xl border border-[#cfd6e2] px-4 py-2 text-xs font-semibold text-[#3a4658]">Refuser</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a96ab]" />
        <input className="form-input !mt-0 pl-11" placeholder="Rechercher un membre (nom, ville, université…)" value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      {directory.isLoading && <Loader2 className="mt-6 h-6 w-6 animate-spin text-[#2f6fed]" />}
      <ul className="mt-5 space-y-3">
        {list.map(member => {
          const link = member.connection;
          return (
            <li key={member.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#dbe1ea] bg-white p-4">
              <Avatar name={member.name} />
              <div className="min-w-0 flex-1"><p className="font-semibold text-[#14213d]">{member.name}</p><p className="truncate text-xs text-[#5b6b82]">{[member.profession, member.university, member.city].filter(Boolean).join(" · ") || "Membre CMAI+Africa"}</p></div>
              {!link && <button onClick={() => invite.mutate({ recipientId: member.id })} disabled={invite.isPending} className="inline-flex items-center gap-2 rounded-xl border border-[#14213d] px-4 py-2 text-xs font-semibold text-[#14213d] hover:bg-[#14213d] hover:text-white"><UserPlus className="h-4 w-4" /> Inviter</button>}
              {link?.status === "pending" && link.direction === "sent" && <span className="text-xs font-semibold text-[#8a5a00]">Invitation envoyée</span>}
              {link?.status === "pending" && link.direction === "received" && <button onClick={() => respond.mutate({ id: link.id, status: "accepted" })} className="rounded-xl bg-[#14213d] px-4 py-2 text-xs font-semibold text-white">Accepter l'invitation</button>}
              {link?.status === "accepted" && <button onClick={() => start.mutate({ recipientId: member.id })} className="inline-flex items-center gap-2 rounded-xl bg-[#14213d] px-4 py-2 text-xs font-semibold text-white"><UserCheck className="h-4 w-4" /> Écrire</button>}
              {link?.status === "rejected" && <span className="text-xs text-[#8a96ab]">Invitation refusée</span>}
            </li>
          );
        })}
      </ul>
      {!directory.isLoading && list.length === 0 && <p className="mt-8 text-center text-sm text-[#5b6b82]">Aucun membre trouvé.</p>}
    </div>
  );
}

function Messages({ initial }: { initial: number | null }) {
  const conversations = trpc.community.conversations.useQuery(undefined, { refetchInterval: 15_000 });
  const [active, setActive] = useState<number | null>(initial);
  const [body, setBody] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { if (initial) setActive(initial); }, [initial]);
  const thread = trpc.community.messages.useQuery({ conversationId: active ?? 0 }, { enabled: Boolean(active), refetchInterval: 5000 });
  const send = trpc.community.sendMessage.useMutation({ onSuccess: () => { setBody(""); void thread.refetch(); void conversations.refetch(); }, onError: error => toast.error(error.message) });
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.data?.length]);
  const current = conversations.data?.find(item => item.conversationId === active);

  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[280px_1fr]">
      <aside className={`rounded-3xl border border-[#dbe1ea] bg-white p-3 ${active ? "hidden md:block" : ""}`}>
        {conversations.isLoading && <Loader2 className="m-3 h-5 w-5 animate-spin text-[#2f6fed]" />}
        {conversations.data?.length === 0 && <p className="p-4 text-sm leading-6 text-[#5b6b82]">Aucune conversation. Invitez un membre depuis l'onglet « Membres » : dès qu'il accepte, vous pouvez discuter en privé.</p>}
        <ul>
          {conversations.data?.map(item => (
            <li key={item.conversationId}>
              <button onClick={() => setActive(item.conversationId)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${active === item.conversationId ? "bg-[#eef1f8]" : "hover:bg-[#eef1f7]"}`}>
                <Avatar name={item.withName} />
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-[#14213d]">{item.withName}</span><span className="block truncate text-xs text-[#5b6b82]">{item.lastMessage ?? "Nouvelle conversation"}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className={`flex h-[70vh] min-h-[420px] flex-col rounded-3xl border border-[#dbe1ea] bg-white ${active ? "" : "hidden md:flex"}`}>
        {!active ? <p className="m-auto text-sm text-[#5b6b82]">Sélectionnez une conversation.</p> : (
          <>
            <header className="flex items-center gap-3 border-b border-[#e7ebf2] p-4">
              <button onClick={() => setActive(null)} className="md:hidden" aria-label="Retour aux conversations"><ArrowLeft className="h-5 w-5" /></button>
              <Avatar name={current?.withName ?? "Membre"} /><p className="font-semibold text-[#14213d]">{current?.withName ?? "Conversation"}</p>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {thread.data?.map(message => (
                <div key={message.id} className={`flex ${message.mine ? "justify-end" : ""}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${message.mine ? "bg-[#14213d] text-white" : "bg-[#e9edf4] text-[#26313f]"}`}>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <p className={`mt-1 text-[0.65rem] ${message.mine ? "text-white/60" : "text-[#8a96ab]"}`}>{formatDate(message.createdAt, true)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottom} />
            </div>
            <form onSubmit={(event: FormEvent) => { event.preventDefault(); if (body.trim()) send.mutate({ conversationId: active, body }); }} className="flex gap-2 border-t border-[#e7ebf2] p-3">
              <input className="form-input !mt-0 !h-11" placeholder="Écrire un message…" maxLength={5000} value={body} onChange={event => setBody(event.target.value)} />
              <button disabled={send.isPending || !body.trim()} className="rounded-xl bg-[#14213d] px-4 text-white disabled:opacity-50" aria-label="Envoyer"><Send className="h-4 w-4" /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default function Community() {
  const [tab, setTab] = useState<Tab>("feed");
  const [conversation, setConversation] = useState<number | null>(null);
  const invitations = trpc.community.invitations.useQuery();
  const pending = invitations.data?.length ?? 0;
  const tabs: [Tab, string][] = [["feed", "Publications"], ["members", "Membres"], ["messages", "Messages privés"]];
  return (
    <PageShell title="Communauté" kicker="Échanger" description="Publiez, réagissez et commentez. Invitez un membre : une fois l'invitation acceptée, vous pouvez discuter avec lui en privé." wide>
      <div className="mb-8 flex flex-wrap justify-center gap-2" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`relative rounded-full border px-5 py-2.5 text-sm font-semibold transition ${tab === key ? "border-[#14213d] bg-[#14213d] text-white" : "border-[#cfd6e2] bg-white text-[#3a4658] hover:border-[#14213d]"}`}>
            {label}
            {key === "members" && pending > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2f6fed] px-1 text-[0.65rem] text-white">{pending}</span>}
          </button>
        ))}
      </div>
      {tab === "feed" && <Feed />}
      {tab === "members" && <Members onOpenConversation={id => { setConversation(id); setTab("messages"); }} />}
      {tab === "messages" && <Messages initial={conversation} />}
    </PageShell>
  );
}
