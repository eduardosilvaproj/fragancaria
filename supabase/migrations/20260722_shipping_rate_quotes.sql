-- Migration: 20260722_shipping_rate_quotes.sql
-- Cotacao efemera de frete no checkout (nao confundir com shipping_quotes,
-- que e a tabela de etiqueta/envio usada por generateOrderLabel).
-- createPayment vai ler esta tabela para validar o preco do frete
-- server-side antes de criar o pagamento.
-- Aplicar manualmente no SQL Editor antes de usar em producao.

CREATE TABLE IF NOT EXISTS public.shipping_rate_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL,
  from_cep TEXT NOT NULL,
  to_cep TEXT NOT NULL,
  items JSONB NOT NULL,
  options JSONB NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shipping_rate_quotes_cache_key
  ON public.shipping_rate_quotes(cache_key);

CREATE INDEX IF NOT EXISTS idx_shipping_rate_quotes_expires_at
  ON public.shipping_rate_quotes(expires_at);

-- =====================================================
-- RLS: nega tudo. Somente service_role acessa (bypassa RLS).
-- =====================================================

ALTER TABLE public.shipping_rate_quotes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shipping_rate_quotes FROM anon;
REVOKE ALL ON public.shipping_rate_quotes FROM authenticated;
