-- ============================================
-- Vitrine da Home — curadoria manual de produtos nos carrosseis
-- ============================================
-- Cria a tabela que armazena quais produtos o admin promoveu manualmente
-- em cada slot da home (bestsellers / new_arrivals / on_sale / kits).
-- Quando o admin nao promove nada, a home usa o criterio aleatorio estavel
-- (definido no server function) — esta tabela fica vazia.
--
-- `product_id` aqui e uma string livre (sem FK) que bate com o `id` do
-- `data/products.ts` (ex: "MLB1234"). Isso permite o admin promover produtos
-- antes da integracao com o Supabase products. Quando integrarmos, basta
-- trocar o tipo para UUID e adicionar FK.

CREATE TABLE IF NOT EXISTS home_featured_manual (
  slot         text NOT NULL CHECK (slot IN ('bestsellers','new_arrivals','on_sale','kits')),
  product_id   text NOT NULL,
  position     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slot, product_id)
);

CREATE INDEX IF NOT EXISTS idx_home_featured_manual_slot
  ON home_featured_manual(slot, position);

-- RLS: app usa service_role (bypassa RLS). Sem policy publica.
ALTER TABLE home_featured_manual ENABLE ROW LEVEL SECURITY;
GRANT ALL ON home_featured_manual TO service_role;
