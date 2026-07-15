# Schema source of truth

Database schema changes for this project are tracked here as versioned SQL migrations, applied via the
[Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

Previously, schema changes were hand-run directly in the Supabase SQL Editor with no record in version
control (see `backend/db/*.sql` and `backend/metascraper/migration.sql` for the pre-history of this — those
files describe the *original* live schema and are superseded by `migrations/20260714000001_baseline_existing_schema.sql`,
which checks the same tables into version control for the first time, plus the previously-untracked
`trend_settings` table).

## One-time setup

```
brew install supabase/tap/supabase        # or: npx supabase <cmd> without a global install
supabase init                              # only if supabase/config.toml doesn't already exist
supabase link --project-ref <PROJECT_REF>  # PROJECT_REF is in the Supabase dashboard project URL
```

## Adding a new migration

```
supabase migration new <short_name>        # creates supabase/migrations/<utc-timestamp>_<short_name>.sql
# edit the generated file
supabase db push                           # applies all pending migrations to the linked remote DB
```

## Scheduled task reminders

Task reminders run from Supabase Cron every five minutes. Before applying
`20260715000009_task_reminder_cron.sql` to a hosted project, add these secrets
to Supabase Vault:

- `task_reminder_url`: the canonical, non-redirecting deployed
  `/api/tasks/due-reminders` URL (redirects may strip the authorization header)
- `task_reminder_cron_secret`: the same random value configured as
  `CRON_SECRET` in the app deployment

The scheduled database function safely becomes a no-op when either Vault value
is absent, so local and preview databases do not call production accidentally.

Every migration file should be idempotent (`create table if not exists`, `create index if not exists`, etc.)
so re-running the full set against a database that already has some of these changes applied is always safe.

## Files

- `migrations/20260714000001_baseline_existing_schema.sql` — the currently-live schema, checked in for the
  first time (Phase 1 of the overhaul plan). Includes the previously-untracked `trend_settings` table.
- Later phases add `user_id`/RLS columns, the `ai_usage_log`, `user_prefs`, `task_groups`/`tasks`, and
  `conversations`/`messages` tables — see `/Users/ajay/.claude/plans/we-will-be-doing-luminous-balloon.md`
  for the full migration list and exact column definitions.
