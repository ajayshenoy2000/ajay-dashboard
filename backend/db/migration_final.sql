-- =============================================================================
-- Lor Trend Engine — Final Consolidated Supabase Schema
-- =============================================================================
-- Safe to run even if migration_v1.sql was already applied (uses IF NOT EXISTS
-- / IF EXISTS guards throughout). Run this in the Supabase SQL Editor:
--   Project -> SQL Editor -> New query -> paste this whole file -> Run.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- search_batches: one row per "Search Now" run
-- -----------------------------------------------------------------------------
create table if not exists search_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

-- -----------------------------------------------------------------------------
-- trends: one row per trend instance, tied to the batch it was found in
-- -----------------------------------------------------------------------------
create table if not exists trends (
  row_id uuid primary key default gen_random_uuid(),
  trend_id text not null,
  batch_id uuid not null references search_batches(id) on delete cascade,
  status text not null default 'new',
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists trends_batch_idx on trends(batch_id);
create index if not exists trends_created_idx on trends(created_at desc);
create index if not exists trends_trend_id_idx on trends(trend_id);

-- -----------------------------------------------------------------------------
-- briefs: on-demand generated video briefs, never auto-deleted
-- -----------------------------------------------------------------------------
create table if not exists briefs (
  id text primary key,
  trend_row_id uuid references trends(row_id) on delete set null,
  trend_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists briefs_trend_row_idx on briefs(trend_row_id);
create index if not exists briefs_created_idx on briefs(created_at desc);

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- The backend talks to Supabase using the SERVICE_ROLE key, which bypasses RLS
-- entirely. RLS is enabled here purely so that the anon/public key (if it ever
-- leaks or is used client-side) has ZERO access to this data by default.
-- No policies are defined intentionally -> default-deny for anon/authenticated.
-- -----------------------------------------------------------------------------
alter table search_batches enable row level security;
alter table trends enable row level security;
alter table briefs enable row level security;
