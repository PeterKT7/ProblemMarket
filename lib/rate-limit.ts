// In-memory token bucket per IP. Good enough for early-stage abuse defense.
// Swap for Upstash Ratelimit (Redis) once traffic justifies it — see SETUP.md.

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

function take(key: string, max: number, refillPerSec: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: max, updatedAt: now };
  const elapsed = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(max, b.tokens + elapsed * refillPerSec);
  b.updatedAt = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

// Read the originating IP. Vercel uses x-forwarded-for; fall back gracefully.
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// 10 submissions per minute per IP per route — generous, but blocks scripted abuse.
export function rateLimit(req: Request, scope: string): boolean {
  const ip = clientIp(req);
  return take(`${scope}:${ip}`, 10, 10 / 60);
}
