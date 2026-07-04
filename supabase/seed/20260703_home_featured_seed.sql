-- ============================================
-- Seed inicial: vitrine manual da home
-- ============================================
-- Insere uma seleção curada para cada slot. IDs batem com `data/products.ts`.
-- Idempotente: limpa os 4 slots antes de inserir (somente para os IDs abaixo,
-- não afeta produtos manuais que o admin adicionar depois).
--
-- Como rodar: cole no Supabase SQL Editor e execute. Pode repetir sem efeitos
-- colaterais (o DELETE é restrito aos IDs desta seed).

BEGIN;

-- Bestsellers: 5 produtos em destaque (featured: true)
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('bestsellers', 'MLB61645829', 0),
  ('bestsellers', 'MLB66096973', 1),
  ('bestsellers', 'MLB23220809', 2),
  ('bestsellers', 'MLB66129326', 3),
  ('bestsellers', 'MLB62755294', 4)
ON CONFLICT (slot, product_id) DO NOTHING;

-- Novidades: 5 produtos isNew: true
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('new_arrivals', 'MLB3912131519', 0),
  ('new_arrivals', 'MLB4052516883', 1),
  ('new_arrivals', 'MLB5501762652', 2),
  ('new_arrivals', 'MLB4056883349', 3),
  ('new_arrivals', 'MLB4228273739', 4)
ON CONFLICT (slot, product_id) DO NOTHING;

-- Em promoção: 5 produtos com maior desconto absoluto (originalPrice - price)
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('on_sale', 'MLB64178994', 0),  -- Wella Nutri Enrich — desc 456,55
  ('on_sale', 'MLB69114334', 1),  -- Wella Invigo Color Brilliance — desc 418
  ('on_sale', 'MLB65460815', 2),  -- L'Oréal Vitamino Color — desc 400,22
  ('on_sale', 'MLB69011691', 3),  -- Wella Fusion — desc 398,61
  ('on_sale', 'MLB61645338', 4)   -- L'Oréal Pro Vitamino Color — desc 381,37
ON CONFLICT (slot, product_id) DO NOTHING;

-- Kits: 4 combos profissionais (category = "kits")
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('kits', 'MLB61717119', 0),     -- Cadiveu Maxi Ondas Kit 2un
  ('kits', 'MLB66204088', 1),     -- Itallian Extreme Up Reconstrução
  ('kits', 'MLB65420642', 2),     -- Trivitt Protetor Térmico Kit 2un
  ('kits', 'MLB73066932', 3)      -- Wella Nioxin Volume Trio
ON CONFLICT (slot, product_id) DO NOTHING;

COMMIT;

-- Conferir resultado:
SELECT slot, COUNT(*) AS qtd
FROM home_featured_manual
GROUP BY slot
ORDER BY slot;