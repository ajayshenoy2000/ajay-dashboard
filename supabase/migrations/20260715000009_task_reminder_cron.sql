-- Task reminders need minute-level scheduling, which is not available on the
-- Vercel Hobby plan. Supabase Cron calls the existing server endpoint every
-- five minutes instead.
--
-- Deployment prerequisites (stored outside source control in Supabase Vault):
--   task_reminder_url         e.g. https://ajay.my/api/tasks/due-reminders
--   task_reminder_cron_secret same value as the app's CRON_SECRET

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_due_task_reminders()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint text;
  bearer_token text;
  request_id bigint;
begin
  select decrypted_secret
    into endpoint
    from vault.decrypted_secrets
   where name = 'task_reminder_url'
   limit 1;

  select decrypted_secret
    into bearer_token
    from vault.decrypted_secrets
   where name = 'task_reminder_cron_secret'
   limit 1;

  -- Local databases and fresh preview projects intentionally do nothing until
  -- their Vault values are configured.
  if endpoint is null or bearer_token is null then
    return null;
  end if;

  select net.http_get(
    url := endpoint,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || bearer_token,
      'User-Agent', 'Supabase-Cron/task-reminders'
    ),
    timeout_milliseconds := 30000
  ) into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_due_task_reminders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'tasks-due-reminders') then
    perform cron.unschedule('tasks-due-reminders');
  end if;
end;
$$;

select cron.schedule(
  'tasks-due-reminders',
  '*/5 * * * *',
  'select public.invoke_due_task_reminders();'
);
