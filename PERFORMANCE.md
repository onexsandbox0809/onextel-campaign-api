# Performance & scaling notes

Honest summary: this app already has the right architecture for high
concurrency (stateless serverless functions talking to Supabase over HTTP,
not holding raw Postgres connections open). Code changes alone can't
*guarantee* 10,000 concurrent requests — that number is bounded by your
Vercel plan's function concurrency limit and, more importantly, by your
Supabase database's compute size. This doc covers both the code changes made
and the plan/infra settings you need alongside them.

## What was changed in code

1. **`sql/migration_perf_indexes.sql`** — adds `pg_trgm` GIN indexes so the
   `ILIKE '%value%'` searches on mobile number / keyword actually use an
   index instead of a full table scan. This is the highest-impact change:
   without it, every filtered dashboard/report request scans the whole
   table, and that's what would fall over first under concurrent load, not
   Vercel. **Run this migration in the Supabase SQL editor.**
2. **`lib/dashboardQuery.js`** — caps how deep OFFSET-based pagination can
   go (400,000 rows), returning a friendly error instead of letting a very
   deep page request tie up a database worker.
3. **`lib/rateLimit.js`** — a lightweight per-instance limiter applied to
   the inbound keyword-collection endpoints (300 req/min/IP by default,
   tune with `INBOUND_RATE_LIMIT_PER_MINUTE`) and to `/api/login` (15
   req/min/IP, `LOGIN_RATE_LIMIT_PER_MINUTE`). It's a real, free safety net
   against one runaway caller, but because each Vercel function instance
   has its own memory, it does **not** enforce one global limit across
   thousands of concurrent instances. For that, see "Distributed rate
   limiting" below.
4. **`vercel.json`** — `maxDuration` raised from 10s to 15s for headroom
   under load.

## Infra checklist for the paid plans

- **Supabase compute add-on.** The free/starter Postgres instance has a
  small connection and CPU budget. Handling thousands of concurrent report
  queries needs a larger compute add-on (Supabase Dashboard → Project
  Settings → Compute). This matters more than any code change here.
- **Region match.** `vercel.json` currently deploys functions to `fra1`.
  Confirm this matches your Supabase project's region — if they're in
  different regions, every request pays extra cross-region latency, which
  under load translates directly into holding function instances open
  longer and burning more concurrency budget. Update the `regions` array if
  needed.
- **Vercel concurrency limits.** Serverless function concurrency is capped
  by plan (Pro raises the ceiling significantly over Hobby; Enterprise
  higher still, and Vercel's newer "Fluid compute" model changes how
  concurrency is billed/limited). Check current limits for your plan at
  Vercel's own docs before assuming a number — this changes over time.
- **Distributed rate limiting.** If you want a real 10k-req/min ceiling
  enforced globally (not just per warm instance), swap `lib/rateLimit.js`
  for Upstash Redis + `@upstash/ratelimit` — it's the standard pairing on
  Vercel and adds one small dependency plus a Redis database. Not added
  here since it requires provisioning a new service; happy to wire it in if
  you want it.

## The remaining known bottleneck: exact counts

`lib/dashboardQuery.js` runs `select('*', { count: 'exact' })` so the
pagination bar can show a precise total. On the `consolidated_report` view
(a `UNION ALL` of all four tables) an exact count means counting matching
rows across all four tables on every single page load — even with the new
indexes, this is the most expensive part of each dashboard request.

If this becomes the bottleneck once you're testing at real concurrency:
switch `count: 'exact'` to `count: 'planned'` in `dashboardQuery.js` for the
consolidated endpoint. `'planned'` uses Postgres's query planner statistics
instead of a real count, so it's much cheaper — but the number shown becomes
an estimate rather than exact, which is a real trade-off for a
reporting/export tool where people may expect the count to match reality
exactly. Left as `'exact'` by default; flagging it here since it's the next
thing to change if you see slow paginated loads specifically on the
Consolidated Report page at scale.

## Quick pre-launch checklist

- [ ] Run `sql/migration_perf_indexes.sql` in Supabase
- [ ] Confirm Vercel `regions` matches your Supabase project region
- [ ] Size up the Supabase compute add-on before a real load test
- [ ] Load-test with a tool like `k6` or `autocannon` against a staging
      deployment before trusting any concurrency number in production
- [ ] Set `INBOUND_API_KEY` in production (it's optional/open if unset —
      see `lib/auth.js`)
