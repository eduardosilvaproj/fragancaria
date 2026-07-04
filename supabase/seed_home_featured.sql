-- ============================================
-- Seed inicial: Vitrine da Home — curadoria manual
-- ============================================
-- Popula home_featured_manual com 5 produtos por slot.
-- Critério por slot:
--   bestsellers -> produtos "featured: true" no data/products.ts
--   new_arrivals -> produtos com isNew: true
--   on_sale -> produtos com maior desconto percentual
--   kits -> categoria "kits"
-- Idempotente: limpa os slots que controla antes de inserir.

-- Bestsellers
DELETE FROM home_featured_manual WHERE slot = 'bestsellers';
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('bestsellers', 'MLB61645829', 0),  -- Kit Igora Royal + Ox 20vol
  ('bestsellers', 'MLB66096973', 1),  -- ... próximos featured
  ('bestsellers', 'MLB23220809', 2),
  ('bestsellers', 'MLB66129326', 3),
  ('bestsellers', 'MLB62755294', 4);

-- Novidades
DELETE FROM home_featured_manual WHERE slot = 'new_arrivals';
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('new_arrivals', 'MLB3912131519', 0),  -- Leave In Pro Longer L'oreal
  ('new_arrivals', 'MLB4052516883', 1),  -- Cond Pro Longer L'oreal
  ('new_arrivals', 'MLB5501762652', 2),  -- Cond Invigo Color Brilliance Wella
  ('new_arrivals', 'MLB4056883349', 3),  -- Cond Lowell Mirtilo
  ('new_arrivals', 'MLB4228273739', 4);  -- Cond Wella Fusion 1L

-- Em Promoção (top 5 descontos %)
DELETE FROM home_featured_manual WHERE slot = 'on_sale';
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('on_sale', 'MLB5998215568', 0),  -- 69% off
  ('on_sale', 'MLB66281551',   1),  -- 67% off
  ('on_sale', 'MLB66277087',   2),  -- 64% off
  ('on_sale', 'MLB66280600',   3),  -- 64% off
  ('on_sale', 'MLB66205401',   4);  -- 64% off

-- Kits
DELETE FROM home_featured_manual WHERE slot = 'kits';
INSERT INTO home_featured_manual (slot, product_id, position) VALUES
  ('kits', 'MLB61717119', 0),  -- Kit Cadiveu Maxi Ondas 2x200ml
  ('kits', 'MLB66204088', 1),  -- Kit Extreme Up Itallian Hairtech
  ('kits', 'MLB65420642', 2),  -- Kit 2 Protetor Termico Trivitt
  ('kits', 'MLB73066932', 3);  -- Kit Nioxin Volume Wella

-- Conferir
SELECT slot, COUNT(*) FROM home_featured_manual GROUP BY slot ORDER BY slot;