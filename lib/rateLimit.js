// Best-effort, in-memory, per-warm-instance rate limiter.
//
// IMPORTANT SCOPE NOTE: Vercel serverless functions scale horizontally --
// under real concurrent load you get many isolated function instances, each
// with its own memory, so this Map is NOT shared across them. This will not
// enforce a single global limit across 10,000 concurrent requests. What it
// DOES do, cheaply and with zero extra infrastructure, is stop a single
// misbehaving/misconfigured caller hammering one warm instance (e.g. a
// retry-loop bug in an SMS/IVR gateway integration) from burning through
// that instance's request budget and Supabase quota.
//
// For a hard, globally-enforced limit once you're on paid Vercel + Supabase
// plans, swap this for a shared store (Upstash Redis + @upstash/ratelimit is
// the standard pairing on Vercel) -- see PERFORMANCE.md.

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
