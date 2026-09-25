import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { COOKIE_NAME, readSessionToken } from "./auth";
import { getUserById } from "./db";
import type { Context } from "./trpc";

export async function getUserFromRequest(req: CreateExpressContextOptions["req"]) {
  const token = (req as any).cookies?.[COOKIE_NAME] as string | undefined;
  const userId = readSessionToken(token);
  if (!userId) return null;
  const user = await getUserById(userId);
  return user && user.isActive ? user : null;
}

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<Context> {
  return { req, res, user: await getUserFromRequest(req) };
}
