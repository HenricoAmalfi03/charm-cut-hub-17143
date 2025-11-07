-- =====================================================
-- STORAGE SETUP - BARBEARIA BUCKET
-- =====================================================

-- Criar bucket 'barbearia' para armazenar imagens
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbearia',
  'barbearia',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Habilitar RLS no storage
alter table storage.objects enable row level security;

-- RLS policies para o bucket barbearia
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Users can update uploads" on storage.objects;
drop policy if exists "Users can delete uploads" on storage.objects;

create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'barbearia' );

create policy "Authenticated users can upload"
on storage.objects for insert
with check (
  bucket_id = 'barbearia' 
  and auth.role() = 'authenticated'
);

create policy "Users can update uploads"
on storage.objects for update
using ( bucket_id = 'barbearia' and auth.role() = 'authenticated' );

create policy "Users can delete uploads"
on storage.objects for delete
using ( bucket_id = 'barbearia' and auth.role() = 'authenticated' );
