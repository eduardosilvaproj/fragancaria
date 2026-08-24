-- Migration: 20260822_product_contextual_cfops.sql
-- Adiciona as 8 colunas de CFOP contextual por produto (venda e devolução para PJ/PF dentro e fora do estado)
-- ATENÇÃO: Nenhuma coluna nasce com DEFAULT, conforme diretriz.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cfop_venda_pj_dentro TEXT,
  ADD COLUMN IF NOT EXISTS cfop_venda_pj_fora TEXT,
  ADD COLUMN IF NOT EXISTS cfop_venda_pf_dentro TEXT,
  ADD COLUMN IF NOT EXISTS cfop_venda_pf_fora TEXT,
  ADD COLUMN IF NOT EXISTS cfop_devolucao_pj_dentro TEXT,
  ADD COLUMN IF NOT EXISTS cfop_devolucao_pj_fora TEXT,
  ADD COLUMN IF NOT EXISTS cfop_devolucao_pf_dentro TEXT,
  ADD COLUMN IF NOT EXISTS cfop_devolucao_pf_fora TEXT;
