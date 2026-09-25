import { TRPCError } from "@trpc/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}, 5 * 60 * 1000).unref();

/** Limiteur en mémoire (suffisant pour une seule instance). Lève une erreur 429 au-delà de `max`. */
export function rateLimit(key: string, max: number, windowMs: number, message = "Trop de tentatives. Réessayez dans quelques minutes.") {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > max) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
