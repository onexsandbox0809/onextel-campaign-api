# Onextel Campaign Manager — Keyword Collection API + Dashboard

Node.js (Next.js, plain `.js`) app that:

- Exposes 5 JSON POST APIs to record keyword responses into Supabase
- Stores date/time in the **Europe/Istanbul** timezone
- Provides a **Consolidated Report** view plus per-keyword dashboards with
  pagination (25/50/75/100) and filters (mobile number, keyword, date range)
- Ships a simple username/password login (no email confirmation flow)
- Is built to run on Vercel serverless functions, sized for high-concurrency
  bursts (see **Concurrency & latency** below)

---

## 1. Supabase setup

1. Create a project at https://supabase.com (or use an existing one).
2. Go to **SQL Editor → New query**, paste the contents of
   [`sql/schema.sql`](./sql/schema.sql), and click **Run**.
   This creates:
   - `app_users` — login table (username + bcrypt password hash)
   - `keyword1_responses` — Table 1: mobile_number, keyword1, date, time
   - `keyword2_responses` — Table 2: mobile_number, keyword2, reason, other, date, time
   - `keyword3_responses` — Table 3: mobile_number, keyword3, date, time
   - `keyword_selected_responses` — Table 4: mobile_number, keyword_selected, reason, other, date, time
   - `consolidated_report` — a **view** that unions all four tables into one
     uniform column set (`source_table, mobile_number, keyword, reason,
     other, response_date, response_time, created_at`), so it's always in
     sync and never goes stale
   - Indexes on `mobile_number`, `response_date`, and each keyword column
     for fast filtering
   - Row Level Security is enabled on every table with **no public
     policies** — only the `service_role` key (used server-side only,
     never shipped to the browser) can read/write. This is what makes the
     "no complex Supabase auth" login acceptable: nothing is reachable
     from the client except through your Vercel API routes.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`
   (Never expose the service_role key in frontend code — it's only read
   inside `pages/api/**` and `lib/supabaseAdmin.js`, which run server-side.)

### Create your first login user

Don't hand-type a password hash into SQL. Instead, run this once locally:

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
node scripts/create-admin-user.js admin "YourStrongPassword123"
```

This hashes the password with bcrypt locally and upserts the row into
`app_users`. Run it again any time to add more users or reset a password.

---

## 2. GitHub repository

```bash
cd onextel-campaign-api
git init
git add .
git commit -m "Initial commit: Onextel campaign keyword APIs + dashboard"
git branch -M main
git remote add origin https://github.com/<your-org>/onextel-campaign-api.git
git push -u origin main
```

`.env.local` is already in `.gitignore` — never commit real Supabase keys.

---

## 3. Deploy to Vercel

**Option A — CLI**

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add JWT_SECRET production
vercel env add INBOUND_API_KEY production   # optional, see below
vercel --prod
```

**Option B — Dashboard**

1. Go to https://vercel.com/new and import the GitHub repo.
2. In **Project Settings → Environment Variables**, add:
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase Project Settings → API |
   | `JWT_SECRET` | any long random string (`openssl rand -hex 32`) |
   | `INBOUND_API_KEY` | optional — long random string, see below |
3. Deploy.

`vercel.json` pins functions to the `fra1` region (closest Vercel region to
Istanbul) to minimize latency for both the timezone-sensitive inserts and
Turkish end users.

---

## 4. API documentation

All keyword APIs are `POST`, JSON in/out, and insert `response_date` /
`response_time` computed server-side in `Europe/Istanbul` — the caller
never sends date/time.

If `INBOUND_API_KEY` is set in the environment, every request below must
include header `x-api-key: <that value>`, or it's rejected with `401`.
Leave it unset while testing; set it before going live.

### POST `/api/keyword1` — Table 1

```bash
curl -X POST https://your-app.vercel.app/api/keyword1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_INBOUND_API_KEY" \
  -d '{ "mobile_number": "+905551234567", "keyword1": "OFFER" }'
```
Response `201`:
```json
{ "success": true, "data": { "id": 1, "mobile_number": "+905551234567", "keyword1": "OFFER", "response_date": "2026-09-09", "response_time": "14:32:07" } }
```

### POST `/api/keyword2` — Table 2

```bash
curl -X POST https://your-app.vercel.app/api/keyword2 \
  -H "Content-Type: application/json" \
  -d '{ "mobile_number": "+905551234567", "keyword2": "STOP", "reason": "Too many messages", "other": "" }'
```

### POST `/api/keyword3` — Table 3

```bash
curl -X POST https://your-app.vercel.app/api/keyword3 \
  -H "Content-Type: application/json" \
  -d '{ "mobile_number": "+905551234567", "keyword3": "INFO" }'
```

### POST `/api/keyword-selected` — Table 4

```bash
curl -X POST https://your-app.vercel.app/api/keyword-selected \
  -H "Content-Type: application/json" \
  -d '{ "mobile_number": "+905551234567", "keyword_selected": "SUPPORT", "reason": "Billing issue", "other": "Called twice already" }'
```

### POST `/api/login` — dashboard sign-in

```bash
curl -X POST https://your-app.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "admin", "password": "YourStrongPassword123" }' -i
```
Sets an `httpOnly` session cookie (`onextel_session`, 8-hour expiry) used
by the dashboard pages and `/api/dashboard/*` endpoints.

### POST `/api/logout`
Clears the session cookie.

### GET `/api/dashboard/{consolidated|keyword1|keyword2|keyword3|keyword-selected}`
Session-protected (401 if not logged in). Query params:
`page`, `pageSize` (25/50/75/100), `mobile_number`, `keyword`, `start_date`,
`end_date` (YYYY-MM-DD). Used internally by the dashboard UI; you can also
call it directly for reporting/export integrations.

**Validation rules (all POST endpoints):** `mobile_number` must be 7–15
digits, optional leading `+`. Missing/invalid fields return `400` with a
plain-English error message. Malformed JSON or oversized bodies (>100KB)
are rejected before touching the database.

---

## 5. Dashboard

Visit `/login`, sign in, and you land on **Consolidated Report**. Sidebar:

- **Consolidated Report** — all 4 tables unioned, with a "Source" badge
  per row
- **Keyword 1** / **Keyword 2** / **Keyword 3** — one table each

Each page has the same filter bar (mobile number, keyword, start/end date,
Apply/Clear) and a pagination bar (25/50/75/100 rows per page, Prev/Next).
`Table 4` (keyword-selected) is reachable via the Consolidated Report and
its own `/api/dashboard/keyword-selected` endpoint; add a
`pages/dashboard/keyword-selected.js` page (copy `keyword1.js` and swap
the column list) if you want it as its own sidebar tab too.

---

## 6. Concurrency & latency (target: 10,000 concurrent requests)

- **Vercel serverless functions auto-scale horizontally per request** —
  there's no shared process to bottleneck, so concurrent POSTs spin up as
  many isolated function instances as needed (subject to your Vercel plan's
  concurrency limit — check current limits for your plan before go-live
  traffic, they change over time).
- **Supabase writes go through PostgREST**, which sits in front of a
  built-in connection pooler — the app never opens raw Postgres
  connections, so thousands of parallel HTTP inserts don't exhaust
  Postgres's connection limit the way raw `pg` connections would.
- `lib/supabaseAdmin.js` caches one Supabase client per warm function
  instance instead of re-instantiating it every invocation, shaving
  cold-path latency under bursty load.
- **`sql/migration_perf_indexes.sql`** (run this after `schema.sql`) adds
  `pg_trgm` indexes so the dashboard's `ILIKE '%value%'` filters use an
  index instead of a full table scan — this is the change that matters
  most once tables grow, and the first thing that would otherwise buckle
  under concurrent filtered report requests.
- `lib/dashboardQuery.js` now caps how deep OFFSET pagination can go, so a
  malicious/broken deep-page request can't tie up a database worker.
- `lib/rateLimit.js` adds a lightweight per-instance rate limit on the
  inbound keyword endpoints and login, as a cheap safety net against a
  single runaway caller.
- Request bodies are capped (100KB for keyword APIs, 10KB for login) so a
  malformed/oversized payload can't tie up a function.
- **The remaining real ceiling is Supabase compute**, not this code — see
  [`PERFORMANCE.md`](./PERFORMANCE.md) for the full scaling checklist
  (compute sizing, region matching, distributed rate limiting, and the
  exact-count trade-off on the Consolidated Report) before you load-test
  against a paid plan.

---

## 7. Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + JWT values
npm run dev
# http://localhost:3000/login
```

---

## 8. Project structure

```
sql/schema.sql                     Supabase table/view/index/RLS setup
sql/migration_perf_indexes.sql     Trigram + composite indexes for high-concurrency filtering
PERFORMANCE.md                     Scaling checklist (Supabase compute, region, rate limiting)
lib/supabaseAdmin.js               Server-side Supabase client (singleton)
lib/timezone.js                    Europe/Istanbul date/time helper
lib/validate.js                    Input validation helpers
lib/auth.js                        JWT session + inbound API key checks
lib/rateLimit.js                   Per-instance rate limiter (inbound endpoints + login)
lib/dashboardQuery.js              Shared pagination/filter query builder
lib/useDashboardData.js            Client hook used by dashboard pages
lib/withAuthSSR.js                 SSR auth guard for dashboard pages
pages/api/keyword1.js              POST — Table 1
pages/api/keyword2.js              POST — Table 2
pages/api/keyword3.js              POST — Table 3
pages/api/keyword-selected.js      POST — Table 4
pages/api/login.js                 POST — login
pages/api/logout.js                POST — logout
pages/api/dashboard/*.js           GET — paginated/filtered reads (session-protected)
pages/login.js                     Login screen (Onextel theme)
pages/dashboard/consolidated.js    Consolidated Report page
pages/dashboard/keyword1.js        Keyword 1 page
pages/dashboard/keyword2.js        Keyword 2 page
pages/dashboard/keyword3.js        Keyword 3 page
components/Layout.js               Sidebar + topbar shell
components/Filters.js              Filter bar
components/DataTable.js            Table + pagination bar
scripts/create-admin-user.js       One-time local script to create logins
```
