-- Phase 6: Tasks sub-app. User-scoped from day one (unlike the Phase 1
-- baseline tables, which predate auth) — user_id is NOT NULL here.

create table if not exists task_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table task_groups enable row level security;

drop policy if exists "own rows" on task_groups;
create policy "own rows" on task_groups for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references task_groups(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'open' check (status in ('open', 'done')),
  due_at timestamptz,
  recurrence_rule text,
  recurrence_parent_id uuid references tasks(id) on delete set null,
  reminder_at timestamptz,
  reminder_sent boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table tasks enable row level security;

drop policy if exists "own rows" on tasks;
create policy "own rows" on tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists tasks_user_idx on tasks(user_id);
create index if not exists tasks_group_idx on tasks(group_id);
create index if not exists tasks_parent_idx on tasks(parent_task_id);
-- Cron query target: find due, unsent reminders across all users.
create index if not exists tasks_due_reminder_idx on tasks(reminder_at) where reminder_sent = false;
