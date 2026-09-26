import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for the AI routes (/api/estimate/explain,
 * /api/schedulec/explain, /api/grants/draft). Every call to those routes
 * is billed to the app's Anthropic account, and they're public URLs — so
 * without a limit, anyone could run up the bill by calling them in a loop.
 *
 * Three limits, shared across all three routes:
 *   - per visitor (IP): 10 requests a minute (stops rapid-fire loops)
 *   - per visitor (IP): 60 requests a day (a heavy real user drafting a
 *     whole grant proposal a few times stays well under this)
 *   - global: 2,000 requests a day across ALL visitors — the backstop if
 *     calls come from many addresses at once
 *
 * Storage: Upstash Redis when it's configured (a shared store, so the
 * limit holds across every Vercel server instance). Without it — local
 * dev, or production before Upstash is connected — an in-memory limit
 * per server instance is used instead: weaker (each instance counts on
 * its own and resets on restart) but never blocks the app from working.
 * If Upstash is configured but unreachable, the in-memory limit is used
 * for that request rather than failing the request outright.
 */

export const LIMITS = {
  perMinute: 10,
  perDay: 60,
  globalPerDay: 2_000,
} as const;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number; scope: "minute" | "day" | "global" };

// --- Upstash (preferred) ---------------------------------------------------

function upstashCredentials(): { url: string; token: string } | null {
  // Vercel's Upstash marketplace integration may set either naming scheme.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

type UpstashLimiters = { minute: Ratelimit; day: Ratelimit; global: Ratelimit };
let upstash: UpstashLimiters | null | undefined; // undefined = not set up yet

function getUpstash(): UpstashLimiters | null {
  if (upstash !== undefined) return upstash;
  const creds = upstashCredentials();
  if (!creds) {
    console.warn("[rateLimit] Upstash not configured — using in-memory rate limiting (per server instance only).");
    upstash = null;
    return upstash;
  }
  const redis = new Redis(creds);
  upstash = {
    minute: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.perMinute, "1 m"), prefix: "wc:ai:minute" }),
    day: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(LIMITS.perDay, "1 d"), prefix: "wc:ai:day" }),
    global: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(LIMITS.globalPerDay, "1 d"), prefix: "wc:ai:global" }),
  };
  return upstash;
}

// --- In-memory fallback ----------------------------------------------------

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const memory = new Map<string, number[]>(); // key -> request timestamps

/** Sliding-window check on the in-memory store; records the request only
 * if it's allowed. Returns ms until a slot frees up when it isn't. */
function memoryHit(key: string, limit: number, windowMs: number, now: number, record: boolean): number {
  const recent = (memory.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    memory.set(key, recent);
    return recent[0] + windowMs - now;
  }
  if (record) recent.push(now);
  memory.set(key, recent);
  return 0;
}

function checkMemory(ip: string, now: number): RateLimitResult {
  // Check all three before recording anything, so a request that's
  // refused by one limit doesn't still use up the others.
  const checks = [
    { key: `minute:${ip}`, limit: LIMITS.perMinute, windowMs: MINUTE_MS, scope: "minute" as const },
    { key: `day:${ip}`, limit: LIMITS.perDay, windowMs: DAY_MS, scope: "day" as const },
    { key: "global", limit: LIMITS.globalPerDay, windowMs: DAY_MS, scope: "global" as const },
  ];
  for (const c of checks) {
    const wait = memoryHit(c.key, c.limit, c.windowMs, now, false);
    if (wait > 0) return { ok: false, retryAfterSeconds: Math.ceil(wait / 1000), scope: c.scope };
  }
  for (const c of checks) memoryHit(c.key, c.limit, c.windowMs, now, true);
  // Keep the map from growing without bound on a long-lived instance.
  if (memory.size > 10_000) {
    for (const [k, ts] of memory) if (!ts.some((t) => now - t < DAY_MS)) memory.delete(k);
  }
  return { ok: true };
}

/** Test hook: clears the in-memory store. */
export function resetMemoryRateLimit(): void {
  memory.clear();
}

// --- Public API ------------------------------------------------------------

/** The caller's IP. On Vercel, x-forwarded-for is set by the platform
 * (first entry is the client); locally it's usually absent. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function checkAIRateLimit(req: Request, now: number = Date.now()): Promise<RateLimitResult> {
  const ip = clientIp(req);
  const limiters = getUpstash();
  if (!limiters) return checkMemory(ip, now);
  try {
    const minute = await limiters.minute.limit(ip);
    if (!minute.success) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((minute.reset - now) / 1000)), scope: "minute" };
    const day = await limiters.day.limit(ip);
    if (!day.success) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((day.reset - now) / 1000)), scope: "day" };
    const global = await limiters.global.limit("all");
    if (!global.success) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((global.reset - now) / 1000)), scope: "global" };
    return { ok: true };
  } catch (err) {
    console.error("[rateLimit] Upstash unreachable, falling back to in-memory:", err instanceof Error ? err.message : String(err));
    return checkMemory(ip, now);
  }
}

/** The friendly message and 429 response body for a refused request. */
export function rateLimitMessage(r: Extract<RateLimitResult, { ok: false }>): string {
  if (r.scope === "global") {
    return "The AI features have reached their daily limit. Please try again tomorrow — everything else in the app still works.";
  }
  const minutes = Math.ceil(r.retryAfterSeconds / 60);
  const wait = r.retryAfterSeconds < 90 ? "a minute" : minutes < 90 ? `about ${minutes} minutes` : `about ${Math.ceil(minutes / 60)} hours`;
  return r.scope === "minute"
    ? `That's a lot of AI requests in a short time. Please wait ${wait} and try again.`
    : `You've reached today's limit for AI requests. Please try again in ${wait}.`;
}
