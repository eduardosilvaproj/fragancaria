-- 20260824_rename_cfop_venda_dentro.sql
-- Renomeia cfop_venda_pj_dentro para cfop_venda_dentro (pois se aplica a PJ e PF)
-- e garante que cfop_venda_pf_dentro seja absorvido/tratado se necessário.

ALTER TABLE public.products RENAME COLUMN cfop_venda_pj_dentro TO cfop_venda_dentro;

-- Garantir valor padrão para cfop_venda_dentro se estiver nulo
UPDATE public.products
SET cfop_venda_dentro = COALESCE(cfop_venda_dentro, '5102')
WHERE cfop_venda_dentro IS NULL;
