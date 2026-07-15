-- Phase 2: adds a `profiles` table (mirrors auth.users 1:1) and nullable `user_id`
-- columns on every existing table. Safe to run against the live, populated DB —
-- existing rows simply get user_id = NULL until the Phase 3 backfill migration
-- runs (that one must be applied manually, AFTER the real account signs up).

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Nullable for now — backfilled and flipped to NOT NULL + RLS in the next migration.
alter table search_batches      add column if not exists user_id uuid references auth.users(id);
alter table trends              add column if not exists user_id uuid references auth.users(id);
alter table briefs              add column if not exists user_id uuid references auth.users(id);
alter table metascraper_ads     add column if not exists user_id uuid references auth.users(id);
alter table metascraper_captures add column if not exists user_id uuid references auth.users(id);

-- trend_settings / metascraper_config are singleton-per-user rows (single-user app —
-- no org layer), so user_id becomes their effective key instead of the old id='singleton'.
alter table trend_settings      add column if not exists user_id uuid unique references auth.users(id);
alter table metascraper_config  add column if not exists user_id uuid unique references auth.users(id);
