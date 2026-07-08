-- =============================================================
-- Migration: Products — Colunas Canônicas + Full-Text Search pt-BR
-- =============================================================
-- Prólogo:
--   O schema products já existe (002_ecommerce_schema.sql), mas o storefront
--   atual ainda lê de src/data/products.ts (434 itens, IDs do Mercado Livre).
--   Esta migration:
--     1. Adiciona colunas que faltam (external_ids JSONB, *_pending,
--        ml_id legado para conciliação na Fase 3).
--     2. Cria índice GIN de full-text search em português
--        (essencial para a tool buscar_produto).
--     3. Preenche novas colunas a partir das antigas (backfill).
--     4. NÃO altera o schema de leitura do storefront (zero impacto).
--
--   Após a Fase 1.6 (Bloco A2), um script de seed (scripts/seed-products.mjs)
--   vai importar os 434 itens de data/products.ts para esta tabela.
--   *Campos price/stock marcam price_pending_validation=true* até revisão
--   manual de amostra (workflow documentado em README_AGENT.md).
--
--   Idempotente.
-- =============================================================

-- =============================================================
-- 1. Colunas novas
-- =============================================================

-- Múltiplos IDs externos (ml_id, shopify_id, stovix_id, etc)
-- Mantém compatibilidade com external_id/external_source legados.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS external_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ml_id VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Pending flags (workflow de validação manual de dados vindos do ML)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_pending_validation BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stock_pending_validation BOOLEAN NOT NULL DEFAULT true;

-- Brand e category como TEXT (slug) em vez de FK, durante transição.
-- Depois migramos para FK UUID. Já existem brand_id/category_id na tabela;
-- estes são duplicatas "desnormalizadas" para o seed.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand_slug TEXT,
  ADD COLUMN IF NOT EXISTS category_slug TEXT;

-- Imagens como JSONB[] já está em TEXT[]? Não — expandir para JSONB indexado por position
-- Mantém compat: images TEXT[] já em algumas versões. Se a coluna não existe, criar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products' AND column_name='images'
  ) THEN
    ALTER TABLE public.products ADD COLUMN images TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END
$$;


-- =============================================================
-- 2. Full-Text Search em português (essencial para tool buscar_produto)
-- =============================================================

-- Coluna gerada: tsvector do nome + descrição + tags + brand.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('portuguese', array_to_string(coalesce(tags, '{}'::text[]), ' ')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(brand_slug, '') || ' ' || coalesce(category_slug, '')), 'D')
  ) STORED;

-- Índice GIN — performance de @@ to_tsquery
CREATE INDEX IF NOT EXISTS idx_products_search
  ON public.products USING GIN (search_vector);

-- Trigram para fuzzy match (cliente escreve "coloraçao" e acha "coloração")
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING GIN (name gin_trgm_ops);


-- =============================================================
-- 3. Backfill (popula colunas novas a partir de externas/categoria)
-- =============================================================

-- Migra external_id (legado single source) para external_ids JSONB
UPDATE public.products
SET external_ids = jsonb_build_object('legacy', external_id, 'source', external_source)
WHERE external_id IS NOT NULL
  AND (external_ids = '{}'::jsonb OR external_ids IS NULL);

-- Popula brand_slug a partir de brand (texto, se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='products' AND column_name='brand'
  ) THEN
    UPDATE public.products
    SET brand_slug = lower(replace(brand, ' ', '-'))
    WHERE brand IS NOT NULL AND brand_slug IS NULL;
  END IF;
END
$$;


-- =============================================================
-- 4. Índices auxiliares
-- =============================================================

-- Busca por ml_id (Fase 3 marketplaces)
CREATE INDEX IF NOT EXISTS idx_products_ml_id
  ON public.products(ml_id);

-- Filtro de produtos ativos pendentes de validação
CREATE INDEX IF NOT EXISTS idx_products_pending_validation
  ON public.products(price_pending_validation, stock_pending_validation)
  WHERE price_pending_validation OR stock_pending_validation;


-- =============================================================
-- 5. View para o agente (search + filtro booleano)
-- =============================================================

CREATE OR REPLACE VIEW public.v_products_for_agent AS
SELECT
  p.id,
  p.sku,
  p.slug,
  p.name,
  p.short_description,
  p.description,
  p.brand_slug,
  p.category_slug,
  p.price,
  p.compare_at_price,
  p.stock_quantity,
  p.stock_status,
  p.is_active,
  p.is_featured,
  p.tags,
  p.images,
  p.external_ids,
  p.weight_grams,
  p.height_cm,
  p.width_cm,
  p.length_cm,
  p.price_pending_validation,
  p.stock_pending_validation,
  -- Flag de disponibilidade real (combina estoque + ativo)
  (p.is_active
   AND p.stock_status = 'in_stock'
   AND p.stock_quantity > 0
   AND NOT p.price_pending_validation
   AND NOT p.stock_pending_validation) AS is_buyable
FROM public.products p;

COMMENT ON VIEW public.v_products_for_agent IS
  'Produtos já filtrados com flag is_buyable (somente itens prontos para vender).';


-- =============================================================
-- 6. Função de busca full-text (chamada pela tool buscar_produto)
-- =============================================================
-- Plain query ranked, retorna top N com score.
-- Uso:
--   SELECT * FROM search_products_pt('wella color brilliance', 10);
-- =============================================================

CREATE OR REPLACE FUNCTION public.search_products_pt(
  query_text TEXT,
  limit_rows INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand_slug TEXT,
  category_slug TEXT,
  price NUMERIC,
  stock_quantity INT,
  images TEXT[],
  is_buyable BOOLEAN,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.brand_slug,
    p.category_slug,
    p.price,
    p.stock_quantity,
    p.images,
    (p.is_active
     AND p.stock_status = 'in_stock'
     AND p.stock_quantity > 0) AS is_buyable,
    ts_rank(p.search_vector, websearch_to_tsquery('portuguese', query_text)) AS rank
  FROM public.products p
  WHERE p.search_vector @@ websearch_to_tsquery('portuguese', query_text)
    AND p.is_active = true
  ORDER BY rank DESC, p.name ASC
  LIMIT limit_rows;
END
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.search_products_pt IS
  'Busca full-text em português com ranking. Retorna top N produtos ativos.';
