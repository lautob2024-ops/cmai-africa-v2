import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { chapterProgress, chapterQuizzes, courseChapters, courseFiles, courseProgress, courses, paymentRequests, users } from "../drizzle/schema";
import type { User } from "../drizzle/schema";
import { getDb, insertId, requireDb } from "./db";

export type CourseRow = typeof courses.$inferSelect;
const MAX_HEARTBEAT_SECONDS = 40;

/* ───────────── Accès ───────────── */

export async function hasCourseAccess(user: Pick<User, "id" | "role" | "studentAccessGranted"> | null | undefined, course: CourseRow) {
  if (course.priceCents === 0) return true;
  if (!user) return false;
  if (user.role === "admin" || user.studentAccessGranted) return true;
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: paymentRequests.id })
    .from(paymentRequests)
    .where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.courseId, course.id), eq(paymentRequests.status, "confirmed")))
    .limit(1);
  return rows.length > 0;
}

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return rows[0];
}

/* ───────────── Lecture (catalogue et détail) ───────────── */

export async function listCoursesForUser(user: User | null) {
  const db = await getDb();
  if (!db) return [];
  const isAdmin = user?.role === "admin";
  const rows = isAdmin ? await db.select().from(courses).orderBy(courses.id) : await db.select().from(courses).where(eq(courses.isPublished, 1)).orderBy(courses.id);
  if (!rows.length) return [];
  const chapters = await db.select({ id: courseChapters.id, courseId: courseChapters.courseId }).from(courseChapters).where(inArray(courseChapters.courseId, rows.map(row => row.id)));
  const done = user
    ? await db.select({ chapterId: chapterProgress.chapterId }).from(chapterProgress).where(and(eq(chapterProgress.userId, user.id), sql`${chapterProgress.completedAt} is not null`))
    : [];
  const doneSet = new Set(done.map(item => item.chapterId));
  const progressRows = user ? await db.select().from(courseProgress).where(eq(courseProgress.userId, user.id)) : [];
  const paid = user && !isAdmin && !user.studentAccessGranted
    ? await db.select({ courseId: paymentRequests.courseId }).from(paymentRequests).where(and(eq(paymentRequests.userId, user.id), eq(paymentRequests.status, "confirmed")))
    : [];
  const paidSet = new Set(paid.map(item => item.courseId));
  return rows.map(course => {
    const own = chapters.filter(chapter => chapter.courseId === course.id);
    const completedChapters = own.filter(chapter => doneSet.has(chapter.id)).length;
    const legacy = progressRows.find(item => item.courseId === course.id);
    const percent = own.length
      ? Math.round((completedChapters / own.length) * 100)
      : legacy?.completedAt ? 100 : legacy ? Math.min(99, Math.round((legacy.secondsWatched / Math.max(course.requiredSeconds, 1)) * 100)) : 0;
    const hasAccess = course.priceCents === 0 || isAdmin || Boolean(user?.studentAccessGranted) || paidSet.has(course.id);
    return {
      id: course.id, slug: course.slug, title: course.title, level: course.level, description: course.description,
      priceCents: course.priceCents, currency: course.currency, requiredSeconds: course.requiredSeconds,
      passingScore: course.passingScore, isPublished: course.isPublished, chapterCount: own.length,
      completedChapters, percent, completed: Boolean(legacy?.completedAt) || (own.length > 0 && completedChapters === own.length),
      secondsWatched: legacy?.secondsWatched ?? 0, hasAccess,
    };
  });
}

export async function getCourseDetail(user: User | null, courseId: number) {
  const db = await getDb();
  if (!db) return null;
  const course = await getCourseById(courseId);
  if (!course || (!course.isPublished && user?.role !== "admin")) return null;
  const access = await hasCourseAccess(user, course);
  const chapters = await db.select().from(courseChapters).where(eq(courseChapters.courseId, courseId)).orderBy(asc(courseChapters.position), asc(courseChapters.id));
  const chapterIds = chapters.map(chapter => chapter.id);
  const quizzes = chapterIds.length ? await db.select().from(chapterQuizzes).where(inArray(chapterQuizzes.chapterId, chapterIds)).orderBy(asc(chapterQuizzes.position), asc(chapterQuizzes.id)) : [];
  const progress = user && chapterIds.length ? await db.select().from(chapterProgress).where(and(eq(chapterProgress.userId, user.id), inArray(chapterProgress.chapterId, chapterIds))) : [];
  const files = await db.select().from(courseFiles).where(eq(courseFiles.courseId, courseId));
  const legacy = user ? (await db.select().from(courseProgress).where(and(eq(courseProgress.userId, user.id), eq(courseProgress.courseId, courseId))).limit(1))[0] : undefined;
  const isAdmin = user?.role === "admin";
  const done = chapters.filter(chapter => progress.find(item => item.chapterId === chapter.id)?.completedAt).length;
  return {
    course: { ...course, content: access ? course.content : null },
    hasAccess: access,
    percent: chapters.length ? Math.round((done / chapters.length) * 100) : legacy?.completedAt ? 100 : 0,
    legacyProgress: legacy ? { secondsWatched: legacy.secondsWatched, completedAt: legacy.completedAt } : null,
    chapters: chapters.map(chapter => {
      const own = progress.find(item => item.chapterId === chapter.id);
      const chapterQuizList = quizzes.filter(quiz => quiz.chapterId === chapter.id);
      return {
        id: chapter.id, title: chapter.title, description: chapter.description, position: chapter.position,
        requiredSeconds: chapter.requiredSeconds,
        content: access ? chapter.content : null,
        locked: !access,
        secondsWatched: own?.secondsWatched ?? 0,
        quizScore: own?.quizScore ?? null,
        completedAt: own?.completedAt ?? null,
        // Jamais la bonne réponse côté apprenant (sauf pour l'administrateur qui édite le cours).
        quiz: access ? chapterQuizList.map(quiz => ({ id: quiz.id, question: quiz.question, options: JSON.parse(quiz.options) as string[], ...(isAdmin ? { correctOption: quiz.correctOption } : {}) })) : [],
      };
    }),
    files: access ? files : [],
  };
}

/* ───────────── Suivi automatique du temps et des quiz ───────────── */

async function completeCourseIfDone(userId: number, courseId: number) {
  const db = await requireDb();
  const chapters = await db.select({ id: courseChapters.id }).from(courseChapters).where(eq(courseChapters.courseId, courseId));
  if (!chapters.length) return false;
  const rows = await db.select().from(chapterProgress).where(and(eq(chapterProgress.userId, userId), inArray(chapterProgress.chapterId, chapters.map(item => item.id))));
  const finished = rows.filter(row => row.completedAt).length;
  const seconds = rows.reduce((sum, row) => sum + row.secondsWatched, 0);
  const scores = rows.map(row => row.quizScore).filter((score): score is number => score !== null);
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 100;
  const all = finished === chapters.length;
  const existing = (await db.select().from(courseProgress).where(and(eq(courseProgress.userId, userId), eq(courseProgress.courseId, courseId))).limit(1))[0];
  const course = await getCourseById(courseId);
  const values = { secondsWatched: seconds, quizScore: average, requiredSeconds: course?.requiredSeconds ?? 1800, lastActiveAt: new Date() };
  if (existing) await db.update(courseProgress).set({ ...values, completedAt: all ? existing.completedAt ?? new Date() : null }).where(eq(courseProgress.id, existing.id));
  else await db.insert(courseProgress).values({ userId, courseId, ...values, completedAt: all ? new Date() : null });
  return all;
}

async function evaluateChapter(userId: number, chapter: typeof courseChapters.$inferSelect, course: CourseRow) {
  const db = await requireDb();
  const row = (await db.select().from(chapterProgress).where(and(eq(chapterProgress.userId, userId), eq(chapterProgress.chapterId, chapter.id))).limit(1))[0];
  if (!row) return { completed: false, row: undefined };
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(chapterQuizzes).where(eq(chapterQuizzes.chapterId, chapter.id));
  const quizOk = Number(total) === 0 || (row.quizScore ?? 0) >= course.passingScore;
  const timeOk = row.secondsWatched >= chapter.requiredSeconds;
  let completed = Boolean(row.completedAt);
  if (!completed && timeOk && quizOk) {
    await db.update(chapterProgress).set({ completedAt: new Date() }).where(eq(chapterProgress.id, row.id));
    completed = true;
  }
  return { completed, row };
}

export async function recordChapterTime(user: User, chapterId: number, seconds: number) {
  const db = await requireDb();
  const chapter = (await db.select().from(courseChapters).where(eq(courseChapters.id, chapterId)).limit(1))[0];
  const course = chapter ? await getCourseById(chapter.courseId) : undefined;
  if (!chapter || !course || !course.isPublished) return null;
  if (!(await hasCourseAccess(user, course))) return { denied: true as const };
  const existing = (await db.select().from(chapterProgress).where(and(eq(chapterProgress.userId, user.id), eq(chapterProgress.chapterId, chapterId))).limit(1))[0];
  let credited = Math.min(Math.max(Math.floor(seconds), 0), MAX_HEARTBEAT_SECONDS);
  if (existing) {
    // Anti-triche : on ne peut pas créditer plus de temps que celui réellement écoulé depuis la dernière mise à jour.
    const elapsed = (Date.now() - existing.updatedAt.getTime()) / 1000;
    credited = Math.min(credited, Math.max(0, Math.floor(elapsed) + 2));
    if (credited > 0 && !existing.completedAt) {
      await db.update(chapterProgress).set({ secondsWatched: existing.secondsWatched + credited }).where(eq(chapterProgress.id, existing.id));
    }
  } else if (credited > 0) {
    await db.insert(chapterProgress).values({ userId: user.id, chapterId, secondsWatched: credited });
  }
  const { completed, row } = await evaluateChapter(user.id, chapter, course);
  const courseDone = await completeCourseIfDone(user.id, course.id);
  const fresh = (await db.select().from(chapterProgress).where(and(eq(chapterProgress.userId, user.id), eq(chapterProgress.chapterId, chapterId))).limit(1))[0] ?? row;
  return {
    denied: false as const,
    secondsWatched: fresh?.secondsWatched ?? 0,
    requiredSeconds: chapter.requiredSeconds,
    quizScore: fresh?.quizScore ?? null,
    completed,
    courseCompleted: courseDone,
  };
}

export async function submitChapterQuiz(user: User, chapterId: number, answers: number[]) {
  const db = await requireDb();
  const chapter = (await db.select().from(courseChapters).where(eq(courseChapters.id, chapterId)).limit(1))[0];
  const course = chapter ? await getCourseById(chapter.courseId) : undefined;
  if (!chapter || !course) return null;
  if (!(await hasCourseAccess(user, course))) return { denied: true as const };
  const quizzes = await db.select().from(chapterQuizzes).where(eq(chapterQuizzes.chapterId, chapterId)).orderBy(asc(chapterQuizzes.position), asc(chapterQuizzes.id));
  if (!quizzes.length) return { denied: false as const, score: 100, passed: true, results: [] as boolean[], completed: false, courseCompleted: false };
  const results = quizzes.map((quiz, index) => answers[index] === quiz.correctOption);
  const score = Math.round((results.filter(Boolean).length / quizzes.length) * 100);
  const existing = (await db.select().from(chapterProgress).where(and(eq(chapterProgress.userId, user.id), eq(chapterProgress.chapterId, chapterId))).limit(1))[0];
  const best = Math.max(score, existing?.quizScore ?? 0);
  if (existing) await db.update(chapterProgress).set({ quizScore: best }).where(eq(chapterProgress.id, existing.id));
  else await db.insert(chapterProgress).values({ userId: user.id, chapterId, secondsWatched: 0, quizScore: best });
  const { completed } = await evaluateChapter(user.id, chapter, course);
  const courseCompleted = await completeCourseIfDone(user.id, course.id);
  return { denied: false as const, score, passed: score >= course.passingScore, results, completed, courseCompleted };
}

/** Cours sans chapitres (anciens cours) : validation automatique par le temps passé uniquement. */
export async function recordLegacyCourseTime(user: User, courseId: number, seconds: number) {
  const db = await requireDb();
  const course = await getCourseById(courseId);
  if (!course || !course.isPublished) return null;
  if (!(await hasCourseAccess(user, course))) return { denied: true as const };
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(courseChapters).where(eq(courseChapters.courseId, courseId));
  if (Number(total) > 0) return { denied: false as const, useChapters: true as const };
  const existing = (await db.select().from(courseProgress).where(and(eq(courseProgress.userId, user.id), eq(courseProgress.courseId, courseId))).limit(1))[0];
  let credited = Math.min(Math.max(Math.floor(seconds), 0), MAX_HEARTBEAT_SECONDS);
  if (existing) credited = Math.min(credited, Math.max(0, Math.floor((Date.now() - existing.updatedAt.getTime()) / 1000) + 2));
  const secondsWatched = (existing?.secondsWatched ?? 0) + credited;
  const completed = secondsWatched >= course.requiredSeconds;
  if (existing) {
    await db.update(courseProgress).set({ secondsWatched, requiredSeconds: course.requiredSeconds, lastActiveAt: new Date(), completedAt: completed ? existing.completedAt ?? new Date() : existing.completedAt }).where(eq(courseProgress.id, existing.id));
  } else {
    await db.insert(courseProgress).values({ userId: user.id, courseId, secondsWatched, quizScore: 100, requiredSeconds: course.requiredSeconds, completedAt: completed ? new Date() : null });
  }
  return { denied: false as const, useChapters: false as const, secondsWatched, requiredSeconds: course.requiredSeconds, completed };
}

export async function getUserCourseProgress(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(courseProgress).where(eq(courseProgress.userId, userId));
}

/* ───────────── Administration des cours ───────────── */

export async function createCourse(input: typeof courses.$inferInsert) {
  const db = await requireDb();
  return insertId(await db.insert(courses).values(input));
}

export async function updateCourse(id: number, values: Partial<typeof courses.$inferInsert>) {
  const db = await requireDb();
  await db.update(courses).set(values).where(eq(courses.id, id));
}

export async function deleteCourse(id: number) {
  const db = await requireDb();
  const chapters = await db.select({ id: courseChapters.id }).from(courseChapters).where(eq(courseChapters.courseId, id));
  const ids = chapters.map(item => item.id);
  await db.transaction(async tx => {
    if (ids.length) {
      await tx.delete(chapterQuizzes).where(inArray(chapterQuizzes.chapterId, ids));
      await tx.delete(chapterProgress).where(inArray(chapterProgress.chapterId, ids));
    }
    await tx.delete(courseChapters).where(eq(courseChapters.courseId, id));
    await tx.delete(courseFiles).where(eq(courseFiles.courseId, id));
    await tx.delete(courseProgress).where(eq(courseProgress.courseId, id));
    await tx.delete(courses).where(eq(courses.id, id));
  });
}

export async function upsertChapter(input: { id?: number; courseId: number; title: string; description?: string | null; content: string; position: number; requiredSeconds: number }) {
  const db = await requireDb();
  const { id, ...values } = input;
  if (id) {
    await db.update(courseChapters).set(values).where(eq(courseChapters.id, id));
    return id;
  }
  return insertId(await db.insert(courseChapters).values(values));
}

export async function deleteChapter(id: number) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await tx.delete(chapterQuizzes).where(eq(chapterQuizzes.chapterId, id));
    await tx.delete(chapterProgress).where(eq(chapterProgress.chapterId, id));
    await tx.delete(courseFiles).where(eq(courseFiles.chapterId, id));
    await tx.delete(courseChapters).where(eq(courseChapters.id, id));
  });
}

export async function replaceQuizzes(chapterId: number, quizzes: { question: string; options: string[]; correctOption: number }[]) {
  const db = await requireDb();
  await db.transaction(async tx => {
    await tx.delete(chapterQuizzes).where(eq(chapterQuizzes.chapterId, chapterId));
    if (quizzes.length) {
      await tx.insert(chapterQuizzes).values(quizzes.map((quiz, index) => ({ chapterId, question: quiz.question, options: JSON.stringify(quiz.options), correctOption: quiz.correctOption, position: index + 1 })));
    }
  });
}

export async function addCourseFile(input: typeof courseFiles.$inferInsert) {
  const db = await requireDb();
  await db.insert(courseFiles).values(input);
}

export async function removeCourseFile(id: number) {
  const db = await requireDb();
  await db.delete(courseFiles).where(eq(courseFiles.id, id));
}

export async function getCourseFileByKey(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(courseFiles).where(eq(courseFiles.fileKey, key)).limit(1))[0];
}

export async function listProgressAdmin() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(courseProgress).orderBy(sql`${courseProgress.updatedAt} desc`).limit(500);
  if (!rows.length) return [];
  const people = await db.select({ id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName, email: users.email }).from(users).where(inArray(users.id, [...new Set(rows.map(row => row.userId))]));
  const chapterRows = await db.select({ id: courseChapters.id, courseId: courseChapters.courseId }).from(courseChapters).where(inArray(courseChapters.courseId, [...new Set(rows.map(row => row.courseId))]));
  const chapterIds = chapterRows.map(row => row.id);
  const done = chapterIds.length ? await db.select({ userId: chapterProgress.userId, chapterId: chapterProgress.chapterId }).from(chapterProgress).where(and(inArray(chapterProgress.chapterId, chapterIds), sql`${chapterProgress.completedAt} is not null`)) : [];
  return rows.map(row => {
    const person = people.find(item => item.id === row.userId);
    const own = chapterRows.filter(chapter => chapter.courseId === row.courseId);
    const completedChapters = own.filter(chapter => done.some(item => item.userId === row.userId && item.chapterId === chapter.id)).length;
    return {
      ...row,
      userName: [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.name || `Utilisateur n°${row.userId}`,
      userEmail: person?.email ?? null,
      chapterCount: own.length,
      completedChapters,
      percent: own.length ? Math.round((completedChapters / own.length) * 100) : row.completedAt ? 100 : Math.min(99, Math.round((row.secondsWatched / Math.max(row.requiredSeconds, 1)) * 100)),
    };
  });
}

export async function courseTitles() {
  const db = await getDb();
  if (!db) return new Map<number, string>();
  const rows = await db.select({ id: courses.id, title: courses.title }).from(courses);
  return new Map(rows.map(row => [row.id, row.title]));
}
