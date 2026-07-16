-- Private, user-scoped chat attachments for multimodal assistant messages.

alter table messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat attachment select" on storage.objects;
create policy "chat attachment select" on storage.objects for select to authenticated
using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat attachment insert" on storage.objects;
create policy "chat attachment insert" on storage.objects for insert to authenticated
with check (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "chat attachment delete" on storage.objects;
create policy "chat attachment delete" on storage.objects for delete to authenticated
using (bucket_id = 'chat-attachments' and (storage.foldername(name))[1] = auth.uid()::text);
