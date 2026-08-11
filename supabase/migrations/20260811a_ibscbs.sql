-- Migration: IBS/CBS (Reforma Tributária — NT 2025.002-RTC)
-- Adiciona colunas de IBS/CBS tanto na tabela products quanto em nfe_settings.

-- 1. products: novas colunas
ALTER TABLE products ADD COLUMN IF NOT EXISTS cst_ibscbs VARCHAR(3);
ALTER TABLE products ADD COLUMN IF NOT EXISTS cclasstrib VARCHAR(6);
ALTER TABLE products ADD COLUMN IF NOT EXISTS aliquota_ibs_estadual NUMERIC(7,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS aliquota_ibs_municipal NUMERIC(7,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(7,4);
ALTER TABLE products ADD COLUMN IF NOT EXISTS codigo_beneficio_fiscal VARCHAR(15);

-- 2. nfe_settings: novos defaults globais
ALTER TABLE nfe_settings ADD COLUMN IF NOT EXISTS cst_ibscbs_padrao VARCHAR(3);
ALTER TABLE nfe_settings ADD COLUMN IF NOT EXISTS cclasstrib_padrao VARCHAR(6);
ALTER TABLE nfe_settings ADD COLUMN IF NOT EXISTS aliquota_ibs_estadual NUMERIC(7,4);
ALTER TABLE nfe_settings ADD COLUMN IF NOT EXISTS aliquota_ibs_municipal NUMERIC(7,4);
ALTER TABLE nfe_settings ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(7,4);
ALTER TABLE nfe_settings ADD COLUMN IF NOT EXISTS codigo_beneficio_fiscal_padrao VARCHAR(15);
