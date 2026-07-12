const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

const requestLog = new Map<string, { count: number; windowStart: number }>();

export function isRateLimited(ip: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = requestLog.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    requestLog.set(ip, { count: 1, windowStart: now });
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (entry.count >= RATE_LIMIT) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  entry.count += 1;
  return { limited: false, retryAfterSeconds: 0 };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestLog.entries()) {
    if (now - entry.windowStart > RATE_WINDOW_MS) requestLog.delete(ip);
  }
}, RATE_WINDOW_MS).unref?.();

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}