-- Mio durable memory, conversation compaction, and user-managed knowledge libraries.

alter table conversations
  add column if not exists summary text,
  add column if not exists summary_through_message_id uuid,
  add column if not exists memory_processed_through_message_id uuid,
  add column if not exists summary_updated_at timestamptz;

create table if not exists mio_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'preference' check (kind in ('preference', 'profile', 'goal', 'project', 'relationship', 'decision', 'other')),
  title text not null,
  content text not null,
  normalized_key text not null,
  confidence real not null default 1 check (confidence >= 0 and confidence <= 1),
  source_conversation_id uuid references conversations(id) on delete set null,
  source_message_id uuid references messages(id) on delete set null,
  source_type text not null default 'explicit' check (source_type in ('explicit', 'inferred', 'imported')),
  pinned boolean not null default false,
  archived boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  last_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  unique (user_id, normalized_key)
);

alter table mio_memories enable row level security;
drop policy if exists "own rows" on mio_memories;
create policy "own rows" on mio_memories for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists mio_memories_user_updated_idx on mio_memories(user_id, updated_at desc);
create index if not exists mio_memories_search_idx on mio_memories using gin(search_vector);

create table if not exists mio_libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  color text not null default '#d96f58',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mio_libraries enable row level security;
drop policy if exists "own rows" on mio_libraries;
create policy "own rows" on mio_libraries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists mio_libraries_user_idx on mio_libraries(user_id, updated_at desc);

create table if not exists mio_library_items (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references mio_libraries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null default 'paste' check (source_type in ('paste', 'file', 'import', 'url')),
  original_content text,
  storage_path text,
  media_type text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mio_library_items enable row level security;
drop policy if exists "own rows" on mio_library_items;
create policy "own rows" on mio_library_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists mio_library_items_library_idx on mio_library_items(library_id, created_at desc);

create table if not exists mio_library_chunks (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references mio_library_items(id) on delete cascade,
  library_id uuid not null references mio_libraries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  token_estimate integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(content, ''))) stored,
  unique (item_id, chunk_index)
);

alter table mio_library_chunks enable row level security;
drop policy if exists "own rows" on mio_library_chunks;
create policy "own rows" on mio_library_chunks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists mio_library_chunks_library_idx on mio_library_chunks(library_id, item_id, chunk_index);
create index if not exists mio_library_chunks_search_idx on mio_library_chunks using gin(search_vector);

create or replace function search_mio_memories(search_text text, match_count integer default 8)
returns table (id uuid, kind text, title text, content text, confidence real, source_type text, pinned boolean, rank real)
language sql stable security invoker set search_path = public
as $$
  select m.id, m.kind, m.title, m.content, m.confidence, m.source_type, m.pinned,
    (ts_rank_cd(m.search_vector, websearch_to_tsquery('simple', search_text)) + case when m.pinned then 1 else 0 end)::real as rank
  from mio_memories m
  where m.user_id = auth.uid() and not m.archived
    and (m.search_vector @@ websearch_to_tsquery('simple', search_text) or m.pinned)
  order by rank desc, m.updated_at desc
  limit greatest(1, least(match_count, 20));
$$;

create or replace function search_mio_library(search_text text, match_count integer default 6)
returns table (chunk_id uuid, item_id uuid, library_id uuid, item_title text, library_name text, content text, rank real)
language sql stable security invoker set search_path = public
as $$
  select c.id, c.item_id, c.library_id, i.title, l.name, c.content,
    ts_rank_cd(c.search_vector, websearch_to_tsquery('simple', search_text))::real as rank
  from mio_library_chunks c
  join mio_library_items i on i.id = c.item_id and i.user_id = auth.uid()
  join mio_libraries l on l.id = c.library_id and l.user_id = auth.uid()
  where c.user_id = auth.uid() and c.search_vector @@ websearch_to_tsquery('simple', search_text)
  order by rank desc
  limit greatest(1, least(match_count, 20));
$$;
