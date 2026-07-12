-- =====================================================
-- Migration: 20260716_product_dimensions.sql
-- Adiciona campos de dimensão, peso e dados fiscais aos produtos
-- =====================================================

BEGIN;

-- Adicionar campos de dimensão e peso
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_grams INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS width_cm NUMERIC(6,2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS length_cm NUMERIC(6,2);

-- Adicionar campos fiscais
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ncm TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ean_barcode TEXT;

-- Índices para busca por dimensões (cálculo de frete)
CREATE INDEX IF NOT EXISTS idx_products_weight ON public.products (weight_grams);

-- Comentários para documentação
COMMENT ON COLUMN public.products.weight_grams IS 'Peso em gramas (para cálculo de frete)';
COMMENT ON COLUMN public.products.height_cm IS 'Altura em centímetros';
COMMENT ON COLUMN public.products.width_cm IS 'Largura em centímetros';
COMMENT ON COLUMN public.products.length_cm IS 'Comprimento/profundidade em centímetros';
COMMENT ON COLUMN public.products.ncm IS 'Código NCM para emissão de nota fiscal';
COMMENT ON COLUMN public.products.ean_barcode IS 'Código de barras EAN/GTIN';

COMMIT;

-- =====================================================
-- ROLLBACK
--   BEGIN;
--   ALTER TABLE public.products DROP COLUMN IF EXISTS weight_grams;
--   ALTER TABLE public.products DROP COLUMN IF EXISTS height_cm;
--   ALTER TABLE public.products DROP COLUMN IF EXISTS width_cm;
--   ALTER TABLE public.products DROP COLUMN IF EXISTS length_cm;
--   ALTER TABLE public.products DROP COLUMN IF EXISTS ncm;
--   ALTER TABLE public.products DROP COLUMN IF EXISTS ean_barcode;
--   COMMIT;
-- =====================================================