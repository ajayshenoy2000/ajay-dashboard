-- MetaScraper tables for Supabase (durable store on Fly, which has no volume).
-- Run once in the Supabase SQL editor. Local dev falls back to SQLite, so this
-- is only needed for the deployed backend.

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

-- The backend uses the service-role key (bypasses RLS), matching the existing
-- trend-engine tables. No public policies are needed.
