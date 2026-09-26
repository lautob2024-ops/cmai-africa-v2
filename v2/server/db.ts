import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  certificateRequests, chapterProgress, connectionRequests, conversationMembers, courseProgress, discussionComments,
  discussions, institutions, members, messages, postAttachments, postComments, postReactions, posts,
  studentApplications, userPosts, users,
} from "../drizzle/schema";
import { ENV } from "./env";

let _db: MySql2Database | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      const needsSsl = /ssl(-|_)?mode=require|ssl=true/i.test(ENV.databaseUrl);
      const pool = mysql.createPool({
        uri: ENV.databaseUrl,
        connectionLimit: 10,
        enableKeepAlive: true,
        timezone: "Z",
        charset: "utf8mb4",
        ...(needsSsl ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: false } } : {}),
      });
      _db = drizzle(pool);
    } catch (error) {
      console.error("[Database] Connexion impossible :", error);
      _db = null;
    }
  }
  return _db;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible.");
  return db;
}

export const insertId = (result: unknown): number => Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0);
export const affectedRows = (result: unknown): number => Number((result as any)?.[0]?.affectedRows ?? (result as any)?.affectedRows ?? 0);

/* ───────────── Utilisateurs ───────────── */

export type UserUpdate = Partial<typeof users.$inferInsert>;

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return rows[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function createLocalUser(input: Omit<typeof users.$inferInsert, "openId" | "role"> & { email: string }) {
  const db = await requireDb();
  const email = input.email.trim().toLowerCase();
  await db.insert(users).values({
    ...input,
    email,
    openId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    loginMethod: "password",
    emailVerified: 0,
    role: "user",
    isActive: 1,
  });
  return getUserByEmail(email);
}

export async function updateUser(id: number, values: UserUpdate) {
  const db = await requireDb();
  await db.update(users).set(values).where(eq(users.id, id));
  return getUserById(id);
}

/** Vue « sûre » d'un utilisateur : jamais de hash de mot de passe ni de code de vérification. */
export const safeUserColumns = {
  id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName, email: users.email,
  gender: users.gender, phone: users.phone, country: users.country, city: users.city, address: users.address,
  profession: users.profession, educationLevel: users.educationLevel, university: users.university,
  emailVerified: users.emailVerified, role: users.role, isActive: users.isActive,
  studentAccessGranted: users.studentAccessGranted, loginMethod: users.loginMethod,
  createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
};

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select(safeUserColumns).from(users).orderBy(desc(users.createdAt));
}

export function toPublicUser(user: typeof users.$inferSelect) {
  const { passwordHash, verificationCode, verificationExpiresAt, resetCode, resetExpiresAt, openId, ...safe } = user;
  return safe;
}

export const displayName = (user: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null }) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || user.email || "Membre";

/** Suppression définitive des données personnelles (les paiements sont conservés pour la comptabilité). */
export async function deleteUserPermanently(id: number) {
  const db = await requireDb();
  const convs = await db.select({ id: conversationMembers.conversationId }).from(conversationMembers).where(eq(conversationMembers.userId, id));
  const mine = await db.select({ id: userPosts.id }).from(userPosts).where(eq(userPosts.userId, id));
  await db.transaction(async tx => {
    if (mine.length) {
      const ids = mine.map(item => item.id);
      await tx.delete(postComments).where(inArray(postComments.postId, ids));
      await tx.delete(postReactions).where(inArray(postReactions.postId, ids));
    }
    await tx.delete(userPosts).where(eq(userPosts.userId, id));
    await tx.delete(postComments).where(eq(postComments.userId, id));
    await tx.delete(postReactions).where(eq(postReactions.userId, id));
    await tx.delete(discussionComments).where(eq(discussionComments.userId, id));
    await tx.delete(discussions).where(eq(discussions.userId, id));
    await tx.delete(connectionRequests).where(or(eq(connectionRequests.senderId, id), eq(connectionRequests.recipientId, id)));
    if (convs.length) await tx.delete(messages).where(and(inArray(messages.conversationId, convs.map(item => item.id)), eq(messages.senderId, id)));
    await tx.delete(conversationMembers).where(eq(conversationMembers.userId, id));
    await tx.delete(chapterProgress).where(eq(chapterProgress.userId, id));
    await tx.delete(courseProgress).where(eq(courseProgress.userId, id));
    await tx.delete(certificateRequests).where(eq(certificateRequests.userId, id));
    await tx.delete(studentApplications).where(eq(studentApplications.userId, id));
    await tx.delete(users).where(eq(users.id, id));
  });
}

/* ───────────── Membres (formulaire public) ───────────── */

export async function getMemberByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(members).where(eq(members.email, email)).limit(1);
  return rows[0];
}

export async function createMember(member: typeof members.$inferInsert) {
  const db = await requireDb();
  await db.insert(members).values(member);
  return getMemberByEmail(member.email);
}

export async function listMembers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(members).orderBy(desc(members.createdAt));
}

export async function countMembers() {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ total: sql<number>`count(*)` }).from(members);
  return Number(row?.total ?? 0);
}

/* ───────────── Demandes étudiantes ───────────── */

export async function createStudentApplication(application: typeof studentApplications.$inferInsert) {
  const db = await requireDb();
  await db.insert(studentApplications).values(application);
}

export async function getStudentApplicationByUser(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(studentApplications).where(eq(studentApplications.userId, userId)).orderBy(desc(studentApplications.createdAt)).limit(1);
  return rows[0];
}

export async function listStudentApplications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentApplications).orderBy(desc(studentApplications.createdAt));
}

export async function reviewStudentApplication(id: number, status: "approved" | "rejected") {
  const db = await requireDb();
  const rows = await db.select().from(studentApplications).where(eq(studentApplications.id, id)).limit(1);
  const application = rows[0];
  if (!application) return undefined;
  await db.update(studentApplications).set({ status, reviewedAt: new Date() }).where(eq(studentApplications.id, id));
  await db.update(users)
    .set(status === "approved" ? { studentAccessGranted: 1, studentAccessGrantedAt: new Date() } : { studentAccessGranted: 0 })
    .where(eq(users.id, application.userId));
  return application;
}

/* ───────────── Publications du site ───────────── */

export async function listPosts(includeUnpublished = false) {
  const db = await getDb();
  if (!db) return [];
  const rows = includeUnpublished
    ? await db.select().from(posts).orderBy(desc(posts.createdAt))
    : await db.select().from(posts).where(eq(posts.isPublished, 1)).orderBy(desc(posts.createdAt));
  if (!rows.length) return [];
  const files = await db.select().from(postAttachments).where(inArray(postAttachments.postId, rows.map(row => row.id)));
  return rows.map(row => ({ ...row, attachments: files.filter(file => file.postId === row.id) }));
}

export async function createPost(post: typeof posts.$inferInsert, files: { fileKey: string; fileName: string; mimeType?: string | null }[] = []) {
  const db = await requireDb();
  const id = insertId(await db.insert(posts).values(post));
  if (files.length && id) await db.insert(postAttachments).values(files.map(file => ({ ...file, postId: id })));
  return id;
}

export async function setPostPublished(id: number, published: boolean) {
  const db = await requireDb();
  await db.update(posts).set({ isPublished: published ? 1 : 0 }).where(eq(posts.id, id));
}

export async function deletePost(id: number) {
  const db = await requireDb();
  await db.delete(postAttachments).where(eq(postAttachments.postId, id));
  await db.delete(posts).where(eq(posts.id, id));
}

/* ───────────── Certificats ───────────── */

export async function createCertificateRequest(request: typeof certificateRequests.$inferInsert) {
  const db = await requireDb();
  await db.insert(certificateRequests).values(request);
}

export async function listCertificateRequests(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(certificateRequests);
  return (userId ? query.where(eq(certificateRequests.userId, userId)) : query).orderBy(desc(certificateRequests.requestedAt));
}

export async function getCertificateRequest(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(certificateRequests).where(eq(certificateRequests.id, id)).limit(1);
  return rows[0];
}

export async function reviewCertificateRequest(id: number, status: "issued" | "rejected", certificateKey?: string) {
  const db = await requireDb();
  await db.update(certificateRequests).set({ status, certificateKey: certificateKey || null, issuedAt: status === "issued" ? new Date() : null }).where(eq(certificateRequests.id, id));
}

/* ───────────── Établissements & discussions ───────────── */

export async function listInstitutions(search?: string) {
  const db = await getDb();
  if (!db) return [];
  const needle = (search || "").trim();
  const query = db.select().from(institutions);
  return (needle ? query.where(like(institutions.name, `%${needle.replace(/[%_]/g, "")}%`)) : query).orderBy(institutions.name).limit(50);
}

export async function createDiscussion(input: typeof discussions.$inferInsert) {
  const db = await requireDb();
  await db.insert(discussions).values(input);
}

export async function listDiscussions() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: discussions.id, userId: discussions.userId, title: discussions.title, body: discussions.body, createdAt: discussions.createdAt,
      authorName: users.name, authorFirstName: users.firstName, authorLastName: users.lastName,
    })
    .from(discussions)
    .leftJoin(users, eq(users.id, discussions.userId))
    .orderBy(desc(discussions.createdAt))
    .limit(100);
}

export async function createDiscussionComment(input: typeof discussionComments.$inferInsert) {
  const db = await requireDb();
  await db.insert(discussionComments).values(input);
}

export async function listDiscussionComments(discussionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: discussionComments.id, userId: discussionComments.userId, body: discussionComments.body, createdAt: discussionComments.createdAt,
      authorName: users.name, authorFirstName: users.firstName, authorLastName: users.lastName,
    })
    .from(discussionComments)
    .leftJoin(users, eq(users.id, discussionComments.userId))
    .where(eq(discussionComments.discussionId, discussionId))
    .orderBy(discussionComments.createdAt);
}

