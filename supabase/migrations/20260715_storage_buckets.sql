-- =====================================================
-- SUPABASE STORAGE: Buckets para upload de imagens
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Criar bucket para imagens de produtos
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Políticas de acesso ao bucket
-- =====================================================

-- Admin pode fazer upload
DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;
CREATE POLICY "Admin upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (auth.jwt() ->> 'role') = 'authenticated'
  );

-- Admin pode deletar
DROP POLICY IF EXISTS "Admin delete product images" ON storage.objects;
CREATE POLICY "Admin delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (auth.jwt() ->> 'role') = 'authenticated'
  );

-- Todos podem ver (URL pública)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

COMMIT;

-- =====================================================
-- ROLLBACK
--   BEGIN;
--   DELETE FROM storage.buckets WHERE id = 'product-images';
--   COMMIT;
-- =====================================================