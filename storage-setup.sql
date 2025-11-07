-- =====================================================
-- BARBEARIA PREMIUM - STORAGE SETUP
-- =====================================================
-- Execute este script DEPOIS do database-schema.sql

-- =============================
-- CLEANUP
-- =============================
DROP POLICY IF EXISTS "Public can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all files" ON storage.objects;

-- Remover bucket se existir
DELETE FROM storage.buckets WHERE id = 'barbearia';

-- =============================
-- CRIAR BUCKET
-- =============================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barbearia',
  'barbearia',
  TRUE,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- =============================
-- POLICIES
-- =============================

-- Qualquer um pode ver arquivos públicos
CREATE POLICY "Public can view files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'barbearia');

-- Usuários autenticados podem fazer upload (pasta avatars)
CREATE POLICY "Authenticated can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'barbearia'
    AND (storage.foldername(name))[1] = 'avatars'
  );

-- Usuários podem atualizar seus próprios arquivos
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'barbearia'
    AND (owner_id IS NULL OR owner_id::text = auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'barbearia'
    AND (owner_id IS NULL OR owner_id::text = auth.uid()::text)
  );

-- Usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'barbearia'
    AND (owner_id IS NULL OR owner_id::text = auth.uid()::text)
  );

-- Admins podem gerenciar todos os arquivos
CREATE POLICY "Admins can manage all files"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'barbearia'
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    bucket_id = 'barbearia'
    AND public.is_admin(auth.uid())
  );
