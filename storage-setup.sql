-- =====================================================
-- BARBEARIA PREMIUM - STORAGE SETUP
-- =====================================================
-- Setup do bucket de storage (separado do schema principal)
-- Execute este script DEPOIS do database-schema.sql

-- Remover policies antigas
DROP POLICY IF EXISTS "Usuarios podem fazer upload de avatares" ON storage.objects;
DROP POLICY IF EXISTS "Avatares são publicamente acessíveis" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios podem atualizar seus próprios avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios podem deletar seus próprios avatares" ON storage.objects;
DROP POLICY IF EXISTS "Public can view barbearia files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload to barbearia" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload anywhere in barbearia" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update any file" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any file" ON storage.objects;

-- Remover bucket se existir (cleanup)
DELETE FROM storage.buckets WHERE id = 'barbearia';

-- Criar bucket público para imagens da barbearia
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barbearia',
  'barbearia',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- =============================
-- POLICIES PARA STORAGE
-- =============================

-- Qualquer um pode ver arquivos públicos
CREATE POLICY "Public can view barbearia files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'barbearia');

-- Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated can upload to barbearia"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'barbearia' 
  AND (storage.foldername(name))[1] IN ('avatars', 'servicos', 'temp')
);

-- Admins podem fazer upload em qualquer pasta
CREATE POLICY "Admins can upload anywhere in barbearia"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'barbearia'
  AND public.is_admin(auth.uid())
);

-- Usuários podem atualizar seus próprios arquivos
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'barbearia' AND owner_id::uuid = auth.uid())
WITH CHECK (bucket_id = 'barbearia' AND owner_id::uuid = auth.uid());

-- Admins podem atualizar qualquer arquivo
CREATE POLICY "Admins can update any file"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'barbearia' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'barbearia' AND public.is_admin(auth.uid()));

-- Usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'barbearia' AND owner_id::uuid = auth.uid());

-- Admins podem deletar qualquer arquivo
CREATE POLICY "Admins can delete any file"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'barbearia' AND public.is_admin(auth.uid()));

-- =============================
-- ESTRUTURA DE PASTAS
-- =============================
-- avatars/     - Fotos de perfil (clientes, barbeiros, admins)
-- servicos/    - Imagens dos serviços oferecidos
-- temp/        - Upload temporário (será movido depois)
