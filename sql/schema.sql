-- ============================================================================
-- Onextel Campaign Manager - Supabase schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE everywhere.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. LOGIN TABLE (simple username/password, no email confirmation flow)
-- ----------------------------------------------------------------------------
create table if not exists app_users (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_app_users_username on app_users (lower(username));

-- ----------------------------------------------------------------------------
-- 2. TABLE 1 - Keyword 1 responses
--    Mobile Number, Keyword 1, Date, Time
-- ----------------------------------------------------------------------------
create table if not exists keyword1_responses (
  id             bigint generated always as identity primary key,
  mobile_number  text not null,
  keyword1       text not null,
  response_date  date not null,
  response_time  time not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_kw1_mobile on keyword1_responses (mobile_number);
create index if not exists idx_kw1_date   on keyword1_responses (response_date);
create index if not exists idx_kw1_keyword on keyword1_responses (keyword1);

-- ----------------------------------------------------------------------------
-- 3. TABLE 2 - Keyword 2 responses
--    Mobile Number, Keyword 2, Reason, Other, Date, Time
-- ----------------------------------------------------------------------------
create table if not exists keyword2_responses (
  id             bigint generated always as identity primary key,
  mobile_number  text not null,
  keyword2       text not null,
  reason         text,
  other          text,
  response_date  date not null,
  response_time  time not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_kw2_mobile on keyword2_responses (mobile_number);
create index if not exists idx_kw2_date   on keyword2_responses (response_date);
create index if not exists idx_kw2_keyword on keyword2_responses (keyword2);

-- ----------------------------------------------------------------------------
-- 4. TABLE 3 - Keyword 3 responses
--    Mobile Number, Keyword 3, Reason, Other, Date, Time
-- ----------------------------------------------------------------------------
create table if not exists keyword3_responses (
  id             bigint generated always as identity primary key,
  mobile_number  text not null,
  keyword3       text not null,
  reason         text,
  other          text,
  response_date  date not null,
  response_time  time not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_kw3_mobile on keyword3_responses (mobile_number);
create index if not exists idx_kw3_date   on keyword3_responses (response_date);
create index if not exists idx_kw3_keyword on keyword3_responses (keyword3);

-- ----------------------------------------------------------------------------
-- 5. TABLE 4 - Keyword Selected responses (free choice among keywords)
--    Mobile Number, Keyword Selected, Reason, Other, Date, Time
-- ----------------------------------------------------------------------------
create table if not exists keyword_selected_responses (
  id               bigint generated always as identity primary key,
  mobile_number    text not null,
  keyword_selected text not null,
  reason           text,
  other            text,
  response_date    date not null,
  response_time    time not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_kwsel_mobile on keyword_selected_responses (mobile_number);
create index if not exists idx_kwsel_date   on keyword_selected_responses (response_date);
create index if not exists idx_kwsel_keyword on keyword_selected_responses (keyword_selected);

-- ----------------------------------------------------------------------------
-- 6. CONSOLIDATED REPORT
--    Union of all 4 tables into one uniform column set:
--    source_table, mobile_number, keyword, reason, other, response_date,
--    response_time, created_at
--    A view stays automatically in sync with the 4 base tables and is what
--    the "Consolidated Report" dashboard reads from.
-- ----------------------------------------------------------------------------
create or replace view consolidated_report as
  select
    'keyword1' as source_table,
    id,
    mobile_number,
    keyword1 as keyword,
    null::text as reason,
    null::text as other,
    response_date,
    response_time,
    created_at
  from keyword1_responses

  union all

  select
    'keyword2' as source_table,
    id,
    mobile_number,
    keyword2 as keyword,
    reason,
    other,
    response_date,
    response_time,
    created_at
  from keyword2_responses

  union all

  select
    'keyword3' as source_table,
    id,
    mobile_number,
    keyword3 as keyword,
    reason,
    other,
    response_date,
    response_time,
    created_at
  from keyword3_responses

  union all

  select
    'keyword_selected' as source_table,
    id,
    mobile_number,
    keyword_selected as keyword,
    reason,
    other,
    response_date,
    response_time,
    created_at
  from keyword_selected_responses;

-- ----------------------------------------------------------------------------
-- 7. Row Level Security
--    All writes/reads happen server-side via the service_role key (used only
--    in Vercel serverless functions, never exposed to the browser), so RLS
--    stays enabled with no public policies -- the anon key cannot touch these
--    tables at all, and the service_role key bypasses RLS by design.
-- ----------------------------------------------------------------------------
alter table app_users enable row level security;
alter table keyword1_responses enable row level security;
alter table keyword2_responses enable row level security;
alter table keyword3_responses enable row level security;
alter table keyword_selected_responses enable row level security;

-- ----------------------------------------------------------------------------
-- 8. First login user
--    Do NOT insert a hand-typed password hash here. After deploying, create
--    your first user by running:
--        node scripts/create-admin-user.js <username> <password>
--    (see scripts/create-admin-user.js in the repo). It hashes the password
--    with bcrypt locally and inserts it via the Supabase service role key,
--    so no plaintext password ever touches this SQL file or the database.
-- ----------------------------------------------------------------------------
