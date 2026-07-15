-- Phase 7: Chatbot sub-app. User-scoped from day one, like the Tasks tables.

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table conversations enable row level security;

drop policy if exists "own rows" on conversations;
create policy "own rows" on conversations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  -- Duplicated from conversations.user_id so RLS here is a direct check,
  -- not a subquery join through conversations.
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

drop policy if exists "own rows" on messages;
create policy "own rows" on messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists messages_conversation_idx on messages(conversation_id);

-- Per-user, per-sub-app privacy toggle gating what data the chatbot's tools
-- may read. Default OFF for everything — see Phase 7 of the overhaul plan.
create table if not exists chatbot_data_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trend_engine boolean not null default false,
  metascraper boolean not null default false,
  schedule boolean not null default false,
  tasks boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table chatbot_data_access enable row level security;

drop policy if exists "own rows" on chatbot_data_access;
create policy "own rows" on chatbot_data_access for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
