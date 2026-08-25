-- 20260824_backfill_product_fiscal_defaults.sql
-- Backfill de campos fiscais nulos ou zerados em public.products com os valores padrão aprovados:
-- ncm                    = '33049900' (sem pontuação)
-- unidade                = 'UN'
-- cfop_venda_pj_dentro   = '5102'
-- cfop_venda_pj_fora     = '6102'
-- cfop_venda_pf_fora     = '6108'
-- cst_ibscbs             = '000'
-- cclasstrib             = '000001'
-- aliquota_ibs_estadual  = 0.1 (%)
-- aliquota_ibs_municipal = 0   (%)
-- aliquota_cbs           = 0.9 (%)

UPDATE public.products
SET
  ncm = COALESCE(ncm, '33049900'),
  unidade = COALESCE(unidade, 'UN'),
  cfop_venda_pj_dentro = COALESCE(cfop_venda_pj_dentro, '5102'),
  cfop_venda_pj_fora = COALESCE(cfop_venda_pj_fora, '6102'),
  cfop_venda_pf_fora = COALESCE(cfop_venda_pf_fora, '6108'),
  cst_ibscbs = COALESCE(cst_ibscbs, '000'),
  cclasstrib = COALESCE(cclasstrib, '000001'),
  aliquota_ibs_estadual = CASE WHEN aliquota_ibs_estadual IS NULL OR aliquota_ibs_estadual = 0 THEN 0.1 ELSE aliquota_ibs_estadual END,
  aliquota_ibs_municipal = COALESCE(aliquota_ibs_municipal, 0.0),
  aliquota_cbs = CASE WHEN aliquota_cbs IS NULL OR aliquota_cbs = 0 THEN 0.9 ELSE aliquota_cbs END
WHERE
  ncm IS NULL
  OR unidade IS NULL
  OR cfop_venda_pj_dentro IS NULL
  OR cfop_venda_pj_fora IS NULL
  OR cfop_venda_pf_fora IS NULL
  OR cst_ibscbs IS NULL
  OR cclasstrib IS NULL
  OR aliquota_ibs_estadual IS NULL OR aliquota_ibs_estadual = 0
  OR aliquota_ibs_municipal IS NULL
  OR aliquota_cbs IS NULL OR aliquota_cbs = 0;
