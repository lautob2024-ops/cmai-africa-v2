import { createHmac, randomBytes, randomInt, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request } from "express";
import { COOKIE_NAME, SESSION_MS } from "../shared/const";
import { ENV } from "./env";

const scrypt = promisify(nodeScrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const secret = () => ENV.jwtSecret || "cmai-development-secret-only";

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [salt, expectedHex] = encoded.split(":");
  if (!salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

export function createSessionToken(userId: number) {
  const payload = encode(JSON.stringify({ userId, exp: Date.now() + SESSION_MS }));
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readSessionToken(token?: string): number | undefined {
  if (!token) return undefined;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return undefined;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return undefined;
  try {
    const data = JSON.parse(decode(payload));
    return data.userId && data.exp && data.exp > Date.now() ? Number(data.userId) : undefined;
  } catch {
    return undefined;
  }
}

/** Code à 6 chiffres généré avec une source aléatoire cryptographique. */
export const verificationCode = () => String(randomInt(100000, 1000000));

export function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  const list = Array.isArray(forwarded) ? forwarded : String(forwarded || "").split(",");
  return list.some(item => item.trim().toLowerCase() === "https");
}

export function sessionCookieOptions(req: Request) {
  return { httpOnly: true, path: "/", sameSite: "lax" as const, secure: isSecureRequest(req), maxAge: SESSION_MS };
}

export const clearCookieOptions = (req: Request) => ({ httpOnly: true, path: "/", sameSite: "lax" as const, secure: isSecureRequest(req) });
export { COOKIE_NAME };
