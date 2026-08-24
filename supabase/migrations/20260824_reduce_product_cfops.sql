-- 20260824_reduce_product_cfops.sql
-- Reduz as colunas de CFOP contextual por produto de 8 para 3, removendo devoluções e ST.
-- Devoluções passam a ser derivadas por regra de negócio fixa (1202/2202).

ALTER TABLE public.products
  DROP COLUMN IF EXISTS cfop_devolucao_pj_dentro,
  DROP COLUMN IF EXISTS cfop_devolucao_pj_fora,
  DROP COLUMN IF EXISTS cfop_devolucao_pf_dentro,
  DROP COLUMN IF EXISTS cfop_devolucao_pf_fora;
