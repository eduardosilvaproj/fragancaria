-- ============================================================================
-- Migration: 20260901_hero_cta_duplo.sql
-- Descrição: Adiciona colunas para um segundo CTA opcional na tabela site_banners
-- ============================================================================

ALTER TABLE public.site_banners
ADD COLUMN IF NOT EXISTS cta2_texto text,
ADD COLUMN IF NOT EXISTS cta2_url text;

-- Bloco de verificação das colunas adicionadas
DO $$
DECLARE
  v_col_count int;
BEGIN
  SELECT count(*) INTO v_col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'site_banners'
    AND column_name IN ('cta2_texto', 'cta2_url');

  IF v_col_count < 2 THEN
    RAISE EXCEPTION 'Erro na verificação: as colunas cta2_texto e cta2_url não foram encontradas em public.site_banners.';
  ELSE
    RAISE NOTICE 'Sucesso: colunas cta2_texto e cta2_url adicionadas e verificadas com sucesso em public.site_banners.';
  END IF;
END $$;
