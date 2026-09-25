import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, index, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  firstName: varchar("firstName", { length: 80 }),
  lastName: varchar("lastName", { length: 80 }),
  email: varchar("email", { length: 320 }),
  gender: varchar("gender", { length: 30 }),
  phone: varchar("phone", { length: 40 }),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  address: varchar("address", { length: 240 }),
  profession: varchar("profession", { length: 140 }),
  educationLevel: varchar("educationLevel", { length: 120 }),
  university: varchar("university", { length: 240 }),
  passwordHash: varchar("passwordHash", { length: 220 }),
  emailVerified: int("emailVerified").notNull().default(0),
  verificationCode: varchar("verificationCode", { length: 6 }),
  verificationExpiresAt: timestamp("verificationExpiresAt"),
  resetCode: varchar("resetCode", { length: 6 }),
  resetExpiresAt: timestamp("resetExpiresAt"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: int("isActive").notNull().default(1),
  studentAccessGranted: int("studentAccessGranted").notNull().default(0),
  studentAccessGrantedAt: timestamp("studentAccessGrantedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 80 }).notNull(),
  lastName: varchar("lastName", { length: 80 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 40 }),
  country: varchar("country", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }),
  organization: varchar("organization", { length: 180 }),
  profileType: varchar("profileType", { length: 80 }).notNull(),
  educationLevel: varchar("educationLevel", { length: 120 }),
  interests: text("interests").notNull(),
  motivation: text("motivation"),
  participationMode: varchar("participationMode", { length: 40 }).notNull(),
  consent: int("consent").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studentApplications = mysqlTable("studentApplications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("firstName", { length: 80 }).notNull(),
  lastName: varchar("lastName", { length: 80 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  schoolName: varchar("schoolName", { length: 220 }).notNull(),
  schoolType: varchar("schoolType", { length: 80 }).notNull(),
  schoolWebsite: varchar("schoolWebsite", { length: 320 }),
  fieldOfStudy: varchar("fieldOfStudy", { length: 180 }).notNull(),
  educationLevel: varchar("educationLevel", { length: 120 }).notNull(),
  motivation: text("motivation").notNull(),
  studentProofKey: varchar("studentProofKey", { length: 420 }).notNull(),
  identityProofKey: varchar("identityProofKey", { length: 420 }).notNull(),
  additionalProofKey: varchar("additionalProofKey", { length: 420 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  level: varchar("level", { length: 80 }).notNull(),
  description: text("description").notNull(),
  content: text("content"),
  priceCents: int("priceCents").notNull().default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  requiredSeconds: int("requiredSeconds").notNull().default(1800),
  passingScore: int("passingScore").notNull().default(70),
  coverImageKey: varchar("coverImageKey", { length: 420 }),
  isPublished: int("isPublished").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const courseChapters = mysqlTable("courseChapters", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  content: text("content").notNull(),
  position: int("position").notNull().default(1),
  requiredSeconds: int("requiredSeconds").notNull().default(300),
  attachmentKey: varchar("attachmentKey", { length: 420 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Fichiers joints à un cours entier (chapterId = null) ou à un chapitre précis. */
export const courseFiles = mysqlTable("courseFiles", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  chapterId: int("chapterId"),
  fileKey: varchar("fileKey", { length: 420 }).notNull(),
  fileName: varchar("fileName", { length: 220 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ byCourse: index("courseFiles_course").on(table.courseId) }));

export const chapterQuizzes = mysqlTable("chapterQuizzes", {
  id: int("id").autoincrement().primaryKey(),
  chapterId: int("chapterId").notNull(),
  question: text("question").notNull(),
  options: text("options").notNull(), // JSON : string[]
  correctOption: int("correctOption").notNull(),
  position: int("position").notNull().default(1),
});

export const chapterProgress = mysqlTable("chapterProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  chapterId: int("chapterId").notNull(),
  secondsWatched: int("secondsWatched").notNull().default(0),
  quizScore: int("quizScore"),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ uniqueUserChapter: uniqueIndex("chapterProgress_user_chapter").on(table.userId, table.chapterId) }));

export const courseProgress = mysqlTable("courseProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  secondsWatched: int("secondsWatched").notNull().default(0),
  quizScore: int("quizScore").default(0),
  requiredSeconds: int("requiredSeconds").notNull().default(1800),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 220 }).notNull(),
  excerpt: varchar("excerpt", { length: 500 }).notNull(),
  body: text("body").notNull(),
  type: mysqlEnum("type", ["article", "challenge", "scholarship", "university_news"]).notNull(),
  isPublished: int("isPublished").notNull().default(1),
  isPremium: int("isPremium").notNull().default(0),
  priceCents: int("priceCents").notNull().default(0),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  authorId: int("authorId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const postAttachments = mysqlTable("postAttachments", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  fileKey: varchar("fileKey", { length: 420 }).notNull(),
  fileName: varchar("fileName", { length: 220 }).notNull(),
  mimeType: varchar("mimeType", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const paymentRequests = mysqlTable("paymentRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  amountCents: int("amountCents").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("USD"),
  chargedAmount: int("chargedAmount"), // montant réellement encaissé (XOF)
  chargedCurrency: varchar("chargedCurrency", { length: 8 }),
  method: mysqlEnum("method", ["mtn", "moov", "celtiis", "card", "fedapay", "kkiapay", "cinetpay"]).notNull(),
  payerPhone: varchar("payerPhone", { length: 40 }).notNull(),
  providerTransactionId: varchar("providerTransactionId", { length: 180 }),
  transactionReference: varchar("transactionReference", { length: 180 }),
  paymentUrl: varchar("paymentUrl", { length: 600 }),
  proofKey: varchar("proofKey", { length: 420 }),
  smsStatus: mysqlEnum("smsStatus", ["pending", "sent", "unavailable"]).default("pending").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "rejected", "expired"]).default("pending").notNull(),
  receiptKey: varchar("receiptKey", { length: 420 }),
  receiptSentAt: timestamp("receiptSentAt"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
}, table => ({ byProvider: index("payments_provider_tx").on(table.providerTransactionId) }));

export const certificateRequests = mysqlTable("certificateRequests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "issued", "rejected"]).default("pending").notNull(),
  certificateKey: varchar("certificateKey", { length: 420 }),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  issuedAt: timestamp("issuedAt"),
});

export const discussions = mysqlTable("discussions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const discussionComments = mysqlTable("discussionComments", {
  id: int("id").autoincrement().primaryKey(),
  discussionId: int("discussionId").notNull(),
  userId: int("userId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const connectionRequests = mysqlTable("connectionRequests", {
  id: int("id").autoincrement().primaryKey(),
  senderId: int("senderId").notNull(),
  recipientId: int("recipientId").notNull(),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversationMembers = mysqlTable("conversationMembers", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  userId: int("userId").notNull(),
});

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  senderId: int("senderId").notNull(),
  body: text("body").notNull(),
  attachmentKey: varchar("attachmentKey", { length: 420 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const userPosts = mysqlTable("userPosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  body: text("body").notNull(),
  attachmentKey: varchar("attachmentKey", { length: 420 }),
  attachmentName: varchar("attachmentName", { length: 220 }),
  attachmentMime: varchar("attachmentMime", { length: 120 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const postReactions = mysqlTable("postReactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  reaction: varchar("reaction", { length: 30 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const postComments = mysqlTable("postComments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const institutions = mysqlTable("institutions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 240 }).notNull().unique(),
  type: varchar("type", { length: 80 }).notNull(),
  city: varchar("city", { length: 120 }),
  website: varchar("website", { length: 320 }),
  source: varchar("source", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
