// Best-effort, in-memory, per-warm-instance rate limiter.
//
// Currently only used by /api/login, as brute-force protection. The
// keyword-collection APIs (/api/keyword1, keyword2, keyword3,
// keyword-selected) intentionally do NOT use this -- that traffic is
// expected to arrive in volume from a single trusted bot-platform IP during
// campaigns, and is already authenticated via INBOUND_API_KEY, so an IP-based
// throttle there would just block legitimate campaign traffic.
//
// IMPORTANT SCOPE NOTE: Vercel serverless functions scale horizontally --
// under real concurrent load you get many isolated function instances, each
// with its own memory, so this Map is NOT shared across them. It will not
// enforce a single global limit across thousands of concurrent requests.
// For login, that's fine -- it only needs to slow down a brute-force
// attempt, not perfectly enforce a global ceiling. For a hard,
// globally-enforced limit on any future route, swap this for a shared store
// (Upstash Redis + @upstash/ratelimit is the standard pairing on Vercel).

const WINDOW_MS = 60 * 1000;
const MAX_TRACKED_KEYS = 5000;

const buckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Returns true if the request is within limit, false if it should be
 * rejected with 429. `key` should uniquely identify the caller + route
 * (e.g. `${ip}:login`). `limit` is max requests per rolling 60s window.
 */
function checkRateLimit(key, limit) {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    buckets.set(key, { windowStart: now, count: 1 });
  } else {
    entry.count += 1;
  }

  // Cheap unbounded-growth guard: if this instance has tracked an unusual
  // number of distinct keys, drop the oldest windows.
  if (buckets.size > MAX_TRACKED_KEYS) {
    const cutoff = now - WINDOW_MS;
    for (const [k, v] of buckets) {
      if (v.windowStart < cutoff) buckets.delete(k);
    }
  }

  const current = buckets.get(key);
  return current.count <= limit;
}

module.exports = { checkRateLimit, getClientIp };
