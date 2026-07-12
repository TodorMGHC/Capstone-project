alter table public.lamps
  add column if not exists cover_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lamp-report-images',
  'lamp-report-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Lamp images are publicly readable" on storage.objects;
drop policy if exists "Lamp image owners can upload" on storage.objects;
drop policy if exists "Lamp image owners can update" on storage.objects;
drop policy if exists "Lamp image owners can delete" on storage.objects;

create policy "Lamp images are publicly readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'lamp-report-images');

create policy "Lamp image owners can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lamp-report-images'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Lamp image owners can update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lamp-report-images'
  and owner_id = auth.uid()::text
)
with check (
  bucket_id = 'lamp-report-images'
  and owner_id = auth.uid()::text
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Lamp image owners can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lamp-report-images'
  and owner_id = auth.uid()::text
);
