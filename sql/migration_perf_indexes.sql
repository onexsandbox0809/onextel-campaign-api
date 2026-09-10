-- ============================================================================
-- Performance migration: indexes to keep dashboard queries fast under high
-- concurrent load (target: thousands of concurrent API/dashboard requests).
-- Safe to re-run: uses IF NOT EXISTS everywhere. Run in Supabase Dashboard ->
-- SQL Editor -> New query -> Run.
--
-- Why this matters:
-- The existing schema has plain btree indexes on mobile_number/keyword
-- columns, but the app filters those columns with ILIKE '%value%' (a
-- leading-wildcard search). A plain btree index CANNOT be used for a
-- leading-wildcard ILIKE, so every filtered search currently falls back to a
-- sequential scan. That's fine at low volume, but it is the single biggest
-- risk to surviving high concurrency once the tables grow -- every filtered
-- request does a full table scan, and thousands of those in parallel will
-- saturate the database well before Vercel's function concurrency limit is
-- ever reached.
--
-- pg_trgm GIN indexes below let Postgres use an index for ILIKE '%...%'
-- searches, turning full scans into fast index lookups.
-- ============================================================================

create extension if not exists pg_trgm;

-- ---- keyword1_responses ----------------------------------------------------
create index if not exists idx_kw1_mobile_trgm on keyword1_responses using gin (mobile_number gin_trgm_ops);
create index if not exists idx_kw1_keyword_trgm on keyword1_responses using gin (keyword1 gin_trgm_ops);
-- Speeds up "order by response_date desc, response_time desc" + range() pagination.
create index if not exists idx_kw1_date_time on keyword1_responses (response_date desc, response_time desc);

-- ---- keyword2_responses ----------------------------------------------------
create index if not exists idx_kw2_mobile_trgm on keyword2_responses using gin (mobile_number gin_trgm_ops);
create index if not exists idx_kw2_keyword_trgm on keyword2_responses using gin (keyword2 gin_trgm_ops);
create index if not exists idx_kw2_date_time on keyword2_responses (response_date desc, response_time desc);

-- ---- keyword3_responses ----------------------------------------------------
create index if not exists idx_kw3_mobile_trgm on keyword3_responses using gin (mobile_number gin_trgm_ops);
create index if not exists idx_kw3_keyword_trgm on keyword3_responses using gin (keyword3 gin_trgm_ops);
create index if not exists idx_kw3_date_time on keyword3_responses (response_date desc, response_time desc);

-- ---- keyword_selected_responses --------------------------------------------
create index if not exists idx_kwsel_mobile_trgm on keyword_selected_responses using gin (mobile_number gin_trgm_ops);
create index if not exists idx_kwsel_keyword_trgm on keyword_selected_responses using gin (keyword_selected gin_trgm_ops);
create index if not exists idx_kwsel_date_time on keyword_selected_responses (response_date desc, response_time desc);

-- ----------------------------------------------------------------------------
-- Note on consolidated_report (the view the "Consolidated Report" dashboard
-- reads from): it's a UNION ALL of the four tables above, and Postgres pushes
-- filter/order predicates down into each branch of a UNION ALL, so these
-- per-table indexes are used automatically when querying the view too -- no
-- separate index needed on the view itself (views can't be indexed directly).
--
-- Remaining known cost at very high concurrency: `select('*', { count: 'exact' })`
-- in lib/dashboardQuery.js runs a full COUNT on every page load, and on the
-- consolidated view that means counting across all 4 unioned tables. This is
-- still the most expensive part of each dashboard request once these indexes
-- are in place. See PERFORMANCE.md for how to trade exact counts for
-- approximate ("planned") counts if this becomes a bottleneck at scale.
-- ----------------------------------------------------------------------------
