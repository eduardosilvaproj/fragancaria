-- Migration 20260808c_product_fiscal_fields.sql
-- Adiciona campos fiscais por produto na tabela products.
-- ATENÇÃO: Nenhuma coluna nasce com DEFAULT, conforme diretriz.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cfop TEXT,
  ADD COLUMN IF NOT EXISTS cst_icms TEXT,
  ADD COLUMN IF NOT EXISTS csosn TEXT,
  ADD COLUMN IF NOT EXISTS origem INTEGER,
  ADD COLUMN IF NOT EXISTS cst_pis_cofins TEXT,
  ADD COLUMN IF NOT EXISTS aliquota_icms NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS aliquota_pis NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS aliquota_cofins NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS cest TEXT;
