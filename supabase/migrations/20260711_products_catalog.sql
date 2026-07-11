-- =============================================================
-- Migration: 20260711_products_catalog.sql
--
-- Cria o catálogo de produtos no Supabase para substituir o arquivo
-- estático src/data/products.ts como fonte da verdade. Habilita CRUD
-- de produtos/categorias/marcas pelo admin.
--
-- Decisões de schema:
--   - products.id é TEXT (não UUID). Os IDs atuais são strings do
--     Mercado Livre (ex: "MLB25477625"), e a rota /produto/$id, a
--     wishlist (product_id) e home_featured_manual (product_id text) já
--     referenciam produtos por essa string. TEXT evita reescrever tudo.
--   - external_ids JSONB deixa o gancho para sincronização futura com o
--     sistema Stovix (ex: {"stovix":"...","mlb":"MLB..."}).
--   - Colunas mapeiam 1:1 o shape do Product da app (snake_case).
--   - RLS: catálogo é público (sem PII) — anon/authenticated leem;
--     escrita só via service_role (admin server fns bypassa RLS).
--
-- Idempotente. Edu aplica via SQL Editor; Code commita no repo.
-- =============================================================

BEGIN;

-- =============================================================
-- 1. categories
-- =============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  image       text,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. brands
-- =============================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. products
--    id TEXT = id atual (MLB...). category guarda o slug da categoria
--    (é o que a app usa hoje em Product.category).
-- =============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  brand          text,
  brand_slug     text,
  price          numeric(10,2) NOT NULL DEFAULT 0,
  original_price numeric(10,2),
  description    text,
  category       text,
  category_slug  text,
  subcategory    text,
  images         text[] NOT NULL DEFAULT '{}',
  tags           text[] NOT NULL DEFAULT '{}',
  in_stock       boolean NOT NULL DEFAULT true,
  quantity       int NOT NULL DEFAULT 0,
  sku            text,
  featured       boolean NOT NULL DEFAULT false,
  is_new         boolean NOT NULL DEFAULT false,
  is_active      boolean NOT NULL DEFAULT true,
  slug           text UNIQUE,
  external_ids   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Índices de leitura da loja / filtros do admin.
CREATE INDEX IF NOT EXISTS idx_products_category   ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_brand_slug ON public.products (brand_slug);
CREATE INDEX IF NOT EXISTS idx_products_active      ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured    ON public.products (featured) WHERE featured;
CREATE INDEX IF NOT EXISTS idx_products_sku         ON public.products (sku);

-- =============================================================
-- 4. updated_at automático
-- =============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- 5. RLS — leitura pública, escrita só service_role
-- =============================================================
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands     ENABLE ROW LEVEL SECURITY;

-- products: público lê só ativos (não vaza rascunhos). Admin usa service_role.
DROP POLICY IF EXISTS products_select_public ON public.products;
CREATE POLICY products_select_public
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS products_write_service ON public.products;
CREATE POLICY products_write_service
  ON public.products FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- categories / brands: leitura pública total, escrita service_role.
DROP POLICY IF EXISTS categories_select_public ON public.categories;
CREATE POLICY categories_select_public
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS categories_write_service ON public.categories;
CREATE POLICY categories_write_service
  ON public.categories FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS brands_select_public ON public.brands;
CREATE POLICY brands_select_public
  ON public.brands FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS brands_write_service ON public.brands;
CREATE POLICY brands_write_service
  ON public.brands FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

COMMIT;

-- =============================================================
-- ROLLBACK (dev only)
--   BEGIN;
--   DROP TABLE IF EXISTS public.products CASCADE;
--   DROP TABLE IF EXISTS public.categories CASCADE;
--   DROP TABLE IF EXISTS public.brands CASCADE;
--   COMMIT;
-- =============================================================
