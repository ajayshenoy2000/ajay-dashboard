create table if not exists ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  use_case text not null,
  model text not null,
  provider text not null,
  success boolean not null,
  latency_ms integer not null,
  prompt_tokens integer,
  completion_tokens integer,
  est_cost_usd numeric(10,6),
  created_at timestamptz not null default now()
);

alter table ai_usage_log enable row level security;

create policy "own rows read" on ai_usage_log for select using (auth.uid() = user_id);
-- Inserts happen via the service-role key (bypasses RLS); no insert policy needed.
