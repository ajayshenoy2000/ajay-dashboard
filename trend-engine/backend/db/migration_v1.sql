-- L'or Trend Engine: persistence schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)

create extension if not exists pgcrypto;

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

create table if not exists briefs (
  id text primary key,
  trend_row_id uuid references trends(row_id) on delete set null,
  trend_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists briefs_trend_row_idx on briefs(trend_row_id);

-- Service role (used by the backend) bypasses RLS by default, but enable it
-- so anon/public keys can never read/write these tables directly.
alter table search_batches enable row level security;
alter table trends enable row level security;
alter table briefs enable row level security;
