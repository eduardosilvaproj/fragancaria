-- =====================================================
-- F2: Custo de produto e margem
-- =====================================================
-- APLICADO PELO EDU NO SQL EDITOR EM 2026-08-05,
-- commitado depois (regra 5).
--
-- Adiciona colunas de custo e margem a products, preparando
-- a integracao futura com Stovix (pricing_mode = 'auto').
-- =====================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pricing_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS target_margin numeric(5,4) DEFAULT NULL;

-- pricing_mode: 'manual' (operador define preco) ou 'auto'
--   (Stovix recalcula preco a partir de cost + target_margin).
-- target_margin: fracao decimal, ex. 0.40 = 40% sobre o preco de venda.
--   Formula: price = cost / (1 - target_margin).
--   Quando pricing_mode = 'auto', o preco e recalculado sempre que
--   cost ou target_margin mudarem (futuro, via trigger ou integracao).

COMMENT ON COLUMN public.products.cost IS 'Custo de compra (numeric, nullable)';
COMMENT ON COLUMN public.products.pricing_mode IS '''manual'' ou ''auto'' (Stovix)';
COMMENT ON COLUMN public.products.target_margin IS 'Margem desejada sobre preco de venda (decimal, ex. 0.40 = 40%)';

-- VERIFICACAO (deve retornar as 3 colunas):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'products'
--   AND column_name IN ('cost', 'pricing_mode', 'target_margin')
-- ORDER BY column_name;
