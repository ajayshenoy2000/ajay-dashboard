-- Reassigns an anonymous session's rows to the account being signed into.
-- Restricted to only-still-anonymous source users, so the worst case of a
-- guessed/replayed uid is merging another anonymous session's unsaved work,
-- never a real account's data. Ported from editify-ai's migration-v12.sql,
-- scoped to this app's table list.
create or replace function merge_anonymous_into_account(p_anon_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated';
  end if;
  if p_anon_user_id = auth.uid() then
    return;
  end if;
  if not exists (
    select 1 from auth.users where id = p_anon_user_id and is_anonymous = true
  ) then
    raise exception 'Source user is not an anonymous session';
  end if;

  update search_batches       set user_id = auth.uid() where user_id = p_anon_user_id;
  update trends               set user_id = auth.uid() where user_id = p_anon_user_id;
  update briefs                set user_id = auth.uid() where user_id = p_anon_user_id;
  update metascraper_ads      set user_id = auth.uid() where user_id = p_anon_user_id;
  update metascraper_captures set user_id = auth.uid() where user_id = p_anon_user_id;

  -- trend_settings / metascraper_config are UNIQUE(user_id) singleton-per-user rows —
  -- if the target account already has one, keep the target's and drop the anon's.
  delete from trend_settings where user_id = p_anon_user_id
    and exists (select 1 from trend_settings where user_id = auth.uid());
  update trend_settings set user_id = auth.uid() where user_id = p_anon_user_id;

  delete from metascraper_config where user_id = p_anon_user_id
    and exists (select 1 from metascraper_config where user_id = auth.uid());
  update metascraper_config set user_id = auth.uid() where user_id = p_anon_user_id;
end;
$$;

grant execute on function merge_anonymous_into_account(uuid) to authenticated;
