-- Image uploads. Run after schema.sql (Supabase → SQL Editor → Run).
-- Public bucket: anyone can view images; only admins can upload or delete.
-- SVG is deliberately not allowed (it can carry scripts).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('note-images', 'note-images', true, 5242880,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

-- Safe to re-run.
drop policy if exists "admins upload note images" on storage.objects;
drop policy if exists "admins delete note images" on storage.objects;

create policy "admins upload note images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'note-images' and public.is_admin());

create policy "admins delete note images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'note-images' and public.is_admin());
