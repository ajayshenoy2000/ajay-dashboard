-- =============================================================================
-- Baseline: currently-live schema, checked into version control for the first
-- time. Every statement is idempotent (IF NOT EXISTS) so running this against
-- the real, already-populated database is a safe no-op. Nothing here changes
-- live behavior — it exists purely so schema history starts being tracked
-- (see Phase 1 of /Users/ajay/.claude/plans/we-will-be-doing-luminous-balloon.md).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Trend Engine tables (originally backend/db/migration_final.sql)
-- -----------------------------------------------------------------------------

create table if not exists search_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);

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

create table if not exists briefs (
  id text primary key,
  trend_row_id uuid references trends(row_id) on delete set null,
  trend_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists briefs_trend_row_idx on briefs(trend_row_id);
create index if not exists briefs_created_idx on briefs(created_at desc);

alter table search_batches enable row level security;
alter table trends enable row level security;
alter table briefs enable row level security;

-- -----------------------------------------------------------------------------
-- MetaScraper tables (originally backend/metascraper/migration.sql)
-- -----------------------------------------------------------------------------

create table if not exists metascraper_config (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists metascraper_ads (
  library_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists metascraper_captures (
  captured_date text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table metascraper_config enable row level security;
alter table metascraper_ads enable row level security;
alter table metascraper_captures enable row level security;

-- -----------------------------------------------------------------------------
-- trend_settings: live in production today, but had NO migration file
-- anywhere in the repo until now. Column set matches exactly what
-- frontend/lib/trend-engine/server/settings.ts reads/writes.
-- -----------------------------------------------------------------------------

create table if not exists trend_settings (
  id text primary key,
  keywords jsonb,
  custom_keywords jsonb,
  use_custom_only boolean default false,
  scoring_weights jsonb,
  channel_baseline jsonb,
  region_code text default 'JP',
  last_sources jsonb,
  last_search_meta jsonb,
  updated_at timestamptz default now()
);

alter table trend_settings enable row level security;

-- No RLS policies are defined in this file intentionally: the app talks to
-- Supabase exclusively via the SERVICE_ROLE key today (bypasses RLS), so this
-- is default-deny for the anon/public key only. Real per-user policies are
-- added in Phase 2 once user_id columns exist.
