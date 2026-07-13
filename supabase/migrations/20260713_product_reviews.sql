-- Migration: sistema de avaliações de produtos (reviews / UGC)
--
-- A tabela product_reviews do 002_ecommerce_schema.sql NUNCA foi aplicada em
-- prod (arquivo histórico). Esta cria a tabela do zero, alinhada ao schema
-- REAL: products.id é TEXT (ex: "MLB68928714"), não UUID. customers.id e
-- orders.id são UUID.
--
-- Fluxo de submissão: via server function (reviews.functions.ts) que valida o
-- Bearer token e usa service_role. RLS mantém leitura pública só de aprovadas.
--
-- Rodar no SQL Editor do Supabase (project Fragranciaria / gzxlupgdmrtkprwhiutp).

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  images TEXT[],

  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,

  -- moderação: pending, approved, rejected
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_at TIMESTAMPTZ,
  moderated_by TEXT,
  rejection_reason TEXT,

  helpful_count INTEGER NOT NULL DEFAULT 0,
  store_reply TEXT,
  store_reply_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON public.product_reviews(customer_id);

-- RLS: leitura pública só de aprovadas. Escrita/moderação só via service_role
-- (server functions). Sem policy de INSERT para anon/authenticated — a
-- submissão passa por server function que valida token e usa service role.
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_select_approved ON public.product_reviews;
CREATE POLICY reviews_select_approved ON public.product_reviews
  FOR SELECT USING (status = 'approved');

GRANT ALL ON public.product_reviews TO service_role;
GRANT SELECT ON public.product_reviews TO anon, authenticated;

-- View agregada: média e contagem de avaliações APROVADAS por produto.
CREATE OR REPLACE VIEW public.product_ratings AS
SELECT
  product_id,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*)::int AS review_count
FROM public.product_reviews
WHERE status = 'approved'
GROUP BY product_id;

GRANT SELECT ON public.product_ratings TO anon, authenticated, service_role;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at_product_reviews()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_product_reviews();
