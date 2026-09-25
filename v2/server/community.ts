import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { connectionRequests, conversationMembers, conversations, messages, postComments, postReactions, userPosts, users } from "../drizzle/schema";
import { getDb, insertId, requireDb } from "./db";

export const REACTIONS = ["like", "bravo", "idea"] as const;
const authorColumns = { authorId: users.id, authorName: users.name, authorFirstName: users.firstName, authorLastName: users.lastName, authorProfession: users.profession };

export const fullName = (row: { authorName?: string | null; authorFirstName?: string | null; authorLastName?: string | null }) =>
  [row.authorFirstName, row.authorLastName].filter(Boolean).join(" ") || row.authorName || "Membre CMAI+Africa";

/* ───────────── Connexions (invitations) ───────────── */

export async function findConnection(a: number, b: number) {
  const db = await requireDb();
  const rows = await db.select().from(connectionRequests).where(or(
    and(eq(connectionRequests.senderId, a), eq(connectionRequests.recipientId, b)),
    and(eq(connectionRequests.senderId, b), eq(connectionRequests.recipientId, a)),
  )).limit(1);
  return rows[0];
}

export async function communityDirectory(currentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const list = await db
    .select({ id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName, profession: users.profession, university: users.university, city: users.city, country: users.country })
    .from(users)
    .where(and(eq(users.isActive, 1), eq(users.emailVerified, 1), ne(users.id, currentUserId)))
    .orderBy(users.name)
    .limit(500);
  const links = await db.select().from(connectionRequests).where(or(eq(connectionRequests.senderId, currentUserId), eq(connectionRequests.recipientId, currentUserId)));
  return list.map(member => {
    const link = links.find(item => item.senderId === member.id || item.recipientId === member.id);
    return {
      id: member.id,
      name: [member.firstName, member.lastName].filter(Boolean).join(" ") || member.name || "Membre CMAI+Africa",
      profession: member.profession, university: member.university, city: member.city, country: member.country,
      connection: link ? { id: link.id, status: link.status, direction: link.senderId === currentUserId ? ("sent" as const) : ("received" as const) } : null,
    };
  });
}

export async function createConnection(senderId: number, recipientId: number) {
  const db = await requireDb();
  if (senderId === recipientId) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas vous inviter vous-même." });
  const target = (await db.select({ id: users.id, isActive: users.isActive }).from(users).where(eq(users.id, recipientId)).limit(1))[0];
  if (!target?.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "Membre introuvable." });
  const existing = await findConnection(senderId, recipientId);
  if (existing) {
    const message = existing.status === "accepted" ? "Vous êtes déjà connectés." : existing.status === "pending" ? "Une invitation est déjà en attente." : "Cette invitation a été refusée.";
    throw new TRPCError({ code: "CONFLICT", message });
  }
  await db.insert(connectionRequests).values({ senderId, recipientId, status: "pending" });
}

export async function respondConnection(id: number, userId: number, status: "accepted" | "rejected") {
  const db = await requireDb();
  const rows = await db.select().from(connectionRequests).where(and(eq(connectionRequests.id, id), eq(connectionRequests.recipientId, userId), eq(connectionRequests.status, "pending"))).limit(1);
  if (!rows[0]) return false;
  await db.update(connectionRequests).set({ status }).where(eq(connectionRequests.id, id));
  return true;
}

export async function listReceivedInvitations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: connectionRequests.id, createdAt: connectionRequests.createdAt, ...authorColumns })
    .from(connectionRequests)
    .innerJoin(users, eq(users.id, connectionRequests.senderId))
    .where(and(eq(connectionRequests.recipientId, userId), eq(connectionRequests.status, "pending")))
    .orderBy(desc(connectionRequests.createdAt));
  return rows.map(row => ({ id: row.id, createdAt: row.createdAt, senderId: row.authorId, senderName: fullName(row), senderProfession: row.authorProfession }));
}

/* ───────────── Messagerie privée ───────────── */

export async function openConversation(userA: number, userB: number) {
  const db = await requireDb();
  const link = await findConnection(userA, userB);
  if (link?.status !== "accepted") throw new TRPCError({ code: "FORBIDDEN", message: "Vous pouvez écrire à un membre uniquement après l'acceptation de votre invitation." });
  const mine = await db.select({ id: conversationMembers.conversationId }).from(conversationMembers).where(eq(conversationMembers.userId, userA));
  if (mine.length) {
    const shared = await db.select({ id: conversationMembers.conversationId }).from(conversationMembers).where(and(eq(conversationMembers.userId, userB), inArray(conversationMembers.conversationId, mine.map(item => item.id)))).limit(1);
    if (shared[0]) return shared[0].id;
  }
  const conversationId = insertId(await db.insert(conversations).values({}));
  await db.insert(conversationMembers).values([{ conversationId, userId: userA }, { conversationId, userId: userB }]);
  return conversationId;
}

async function assertMember(conversationId: number, userId: number) {
  const db = await requireDb();
  const row = (await db.select().from(conversationMembers).where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.userId, userId))).limit(1))[0];
  if (!row) throw new TRPCError({ code: "FORBIDDEN", message: "Conversation non autorisée." });
}

export async function listConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const mine = await db.select({ id: conversationMembers.conversationId }).from(conversationMembers).where(eq(conversationMembers.userId, userId));
  if (!mine.length) return [];
  const ids = mine.map(item => item.id);
  const others = await db
    .select({ conversationId: conversationMembers.conversationId, ...authorColumns })
    .from(conversationMembers)
    .innerJoin(users, eq(users.id, conversationMembers.userId))
    .where(and(inArray(conversationMembers.conversationId, ids), ne(conversationMembers.userId, userId)));
  const recent = await db
    .select({ conversationId: messages.conversationId, body: messages.body, createdAt: messages.createdAt })
    .from(messages)
    .where(inArray(messages.conversationId, ids))
    .orderBy(desc(messages.createdAt))
    .limit(1000);
  const last = recent;
  return ids
    .map(id => {
      const other = others.find(item => item.conversationId === id);
      const message = last.find(item => item.conversationId === id);
      return { conversationId: id, withName: other ? fullName(other) : "Membre CMAI+Africa", withProfession: other?.authorProfession ?? null, lastMessage: message?.body ?? null, lastAt: message?.createdAt ?? null };
    })
    .sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
}

export async function listPrivateMessages(conversationId: number, userId: number) {
  await assertMember(conversationId, userId);
  const db = await requireDb();
  const rows = await db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt)).limit(200);
  return rows.reverse().map(row => ({ id: row.id, body: row.body, createdAt: row.createdAt, mine: row.senderId === userId }));
}

export async function createPrivateMessage(conversationId: number, senderId: number, body: string) {
  await assertMember(conversationId, senderId);
  const db = await requireDb();
  await db.insert(messages).values({ conversationId, senderId, body });
}

/* ───────────── Fil de publications (style réseau professionnel) ───────────── */

export async function listFeed(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: userPosts.id, body: userPosts.body, attachmentKey: userPosts.attachmentKey, attachmentName: userPosts.attachmentName, attachmentMime: userPosts.attachmentMime, createdAt: userPosts.createdAt, ...authorColumns })
    .from(userPosts)
    .leftJoin(users, eq(users.id, userPosts.userId))
    .orderBy(desc(userPosts.createdAt))
    .limit(60);
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const reactionRows = await db.select({ postId: postReactions.postId, reaction: postReactions.reaction, total: sql<number>`count(*)` }).from(postReactions).where(inArray(postReactions.postId, ids)).groupBy(postReactions.postId, postReactions.reaction);
  const mine = await db.select().from(postReactions).where(and(eq(postReactions.userId, userId), inArray(postReactions.postId, ids)));
  const commentRows = await db.select({ postId: postComments.postId, total: sql<number>`count(*)` }).from(postComments).where(inArray(postComments.postId, ids)).groupBy(postComments.postId);
  return rows.map(row => ({
    id: row.id, body: row.body, createdAt: row.createdAt,
    attachment: row.attachmentKey ? { key: row.attachmentKey, name: row.attachmentName || "Pièce jointe", mime: row.attachmentMime || "" } : null,
    author: { id: row.authorId, name: fullName(row), profession: row.authorProfession },
    isMine: row.authorId === userId,
    reactions: Object.fromEntries(reactionRows.filter(item => item.postId === row.id).map(item => [item.reaction, Number(item.total)])) as Record<string, number>,
    myReaction: mine.find(item => item.postId === row.id)?.reaction ?? null,
    commentCount: Number(commentRows.find(item => item.postId === row.id)?.total ?? 0),
  }));
}

export async function createCommunityPost(userId: number, body: string, file?: { key: string; name: string; mime: string }) {
  const db = await requireDb();
  await db.insert(userPosts).values({ userId, body, attachmentKey: file?.key ?? null, attachmentName: file?.name ?? null, attachmentMime: file?.mime ?? null });
}

export async function deleteCommunityPost(userId: number, postId: number, isAdmin: boolean) {
  const db = await requireDb();
  const post = (await db.select().from(userPosts).where(eq(userPosts.id, postId)).limit(1))[0];
  if (!post) return;
  if (post.userId !== userId && !isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne pouvez supprimer que vos publications." });
  await db.transaction(async tx => {
    await tx.delete(postComments).where(eq(postComments.postId, postId));
    await tx.delete(postReactions).where(eq(postReactions.postId, postId));
    await tx.delete(userPosts).where(eq(userPosts.id, postId));
  });
}

/** Une réaction par membre et par publication : même réaction = retrait, autre réaction = remplacement. */
export async function toggleReaction(userId: number, postId: number, reaction: string) {
  const db = await requireDb();
  const existing = (await db.select().from(postReactions).where(and(eq(postReactions.userId, userId), eq(postReactions.postId, postId))).limit(1))[0];
  if (!existing) await db.insert(postReactions).values({ userId, postId, reaction });
  else if (existing.reaction === reaction) await db.delete(postReactions).where(eq(postReactions.id, existing.id));
  else await db.update(postReactions).set({ reaction }).where(eq(postReactions.id, existing.id));
}

export async function listPostComments(postId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ id: postComments.id, body: postComments.body, createdAt: postComments.createdAt, userId: postComments.userId, ...authorColumns })
    .from(postComments)
    .leftJoin(users, eq(users.id, postComments.userId))
    .where(eq(postComments.postId, postId))
    .orderBy(postComments.createdAt);
  return rows.map(row => ({ id: row.id, body: row.body, createdAt: row.createdAt, userId: row.userId, authorName: fullName(row) }));
}

export async function createPostComment(userId: number, postId: number, body: string) {
  const db = await requireDb();
  const exists = (await db.select({ id: userPosts.id }).from(userPosts).where(eq(userPosts.id, postId)).limit(1))[0];
  if (!exists) throw new TRPCError({ code: "NOT_FOUND", message: "Publication introuvable." });
  await db.insert(postComments).values({ userId, postId, body });
}
