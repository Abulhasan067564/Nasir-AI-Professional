const windows = new Map();

export function rateLimit(key, { limit = Number(process.env.RATE_LIMIT_REQUESTS || 20), windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000) } = {}) {
  const now = Date.now();
  let entry = windows.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    windows.set(key, entry);
  }
  entry.count += 1;
  if (windows.size > 5000) {
    for (const [k, value] of windows) if (value.resetAt <= now) windows.delete(k);
  }
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), retryAfterMs: Math.max(0, entry.resetAt - now) };
}

export function clientKey(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  const address = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0]).trim();
  return address || req.socket?.remoteAddress || req.ip || 'unknown';
}
