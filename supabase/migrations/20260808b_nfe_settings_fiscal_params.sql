-- Migration 20260808b_nfe_settings_fiscal_params.sql
-- Adiciona parâmetros fiscais padrão em nfe_settings.
-- ATENÇÃO: Nenhuma coluna nasce com DEFAULT, conforme diretriz.

ALTER TABLE public.nfe_settings
  ADD COLUMN IF NOT EXISTS crt INTEGER,
  ADD COLUMN IF NOT EXISTS ncm_padrao TEXT,
  ADD COLUMN IF NOT EXISTS cfop_padrao TEXT,
  ADD COLUMN IF NOT EXISTS cst_icms_padrao TEXT,
  ADD COLUMN IF NOT EXISTS csosn_padrao TEXT,
  ADD COLUMN IF NOT EXISTS origem_padrao INTEGER,
  ADD COLUMN IF NOT EXISTS cst_pis_cofins_padrao TEXT,
  ADD COLUMN IF NOT EXISTS icms_aliquota NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pis_aliquota NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS cofins_aliquota NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS unidade_padrao TEXT,
  ADD COLUMN IF NOT EXISTS cest_padrao TEXT,
  ADD COLUMN IF NOT EXISTS modalidade_frete INTEGER;
