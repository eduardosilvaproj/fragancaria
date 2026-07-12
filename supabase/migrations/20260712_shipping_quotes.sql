-- =====================================================
-- SHIPPING QUOTES: Cotacoes e envios/logistica
-- =====================================================
-- Tabela principal para gerenciar cotacoes de frete e
-- envios criados (etiquetas geradas).
--
-- Fluxo:
-- 1. Cliente escolhe opcao no checkout -> shipping_quotes (cotacao)
-- 2. Pedido pago -> shipment criado com tracking_code
-- 3. Atualizacoes de rastreio via webhook ou batch
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number INTEGER,

  -- Cotacao original
  carrier TEXT NOT NULL,
  service TEXT NOT NULL,
  service_code TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  final_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  estimated_days INTEGER,

  -- Dimensoes/peso cotado
  weight_grams INTEGER DEFAULT 0,
  height_cm NUMERIC(6, 2) DEFAULT 0,
  width_cm NUMERIC(6, 2) DEFAULT 0,
  length_cm NUMERIC(6, 2) DEFAULT 0,

  -- Destinatario
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  recipient_postal_code TEXT,
  recipient_address JSONB, -- { street, number, complement, neighborhood, city, state }

  -- Status do envio
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',      -- Cotado, aguardando pagamento
      'paid',        -- Pago, aguardando postagem
      'shipped',     -- Enviado/postado
      'in_transit',  -- Em transito
      'out_for_delivery', -- Saiu para entrega
      'delivered',   -- Entregue
      'exception',   -- Ocorrencia (devolvido, extraviado, etc)
      'cancelled'    -- Cancelado
    )),

  -- Rastreio
  tracking_code TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Etiqueta
  label_url TEXT,
  label_pdf_url TEXT,
  shipment_id_external TEXT, -- ID no Envio Facil

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_price CHECK (final_price >= 0),
  CONSTRAINT positive_weight CHECK (weight_grams >= 0)
);

-- Indice para busca por pedido
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_order_id ON public.shipping_quotes(order_id);

-- Indice para busca por tracking code
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_tracking ON public.shipping_quotes(tracking_code) WHERE tracking_code IS NOT NULL;

-- Indice para status
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_status ON public.shipping_quotes(status);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shipping_quotes_updated_at ON public.shipping_quotes;
CREATE TRIGGER shipping_quotes_updated_at
  BEFORE UPDATE ON public.shipping_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- RLS: Politicas de acesso
-- =====================================================

ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;

-- Admin pode ver tudo
CREATE POLICY "Admin read all shipping quotes"
  ON public.shipping_quotes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin update shipping quotes"
  ON public.shipping_quotes FOR UPDATE
  USING (auth.role() = 'authenticated');

-- =====================================================
-- VIEW: Estatisticas de envio (para o admin)
-- =====================================================

CREATE OR REPLACE VIEW public.shipping_stats AS
SELECT
  status,
  COUNT(*) as count
FROM public.shipping_quotes
GROUP BY status;

-- =====================================================
-- SEED: Dados de exemplo (opcional, remover em prod)
-- =====================================================

-- Descomentar para testar localmente
/*
INSERT INTO public.shipping_quotes (
  order_id,
  order_number,
  carrier,
  service,
  service_code,
  price,
  final_price,
  estimated_days,
  weight_grams,
  recipient_name,
  recipient_email,
  recipient_postal_code,
  recipient_address,
  status
) VALUES
  (
    NULL, 1234, 'Correios', 'PAC', '04510', 25.90, 25.90, 8, 450,
    'Maria Silva', 'maria@email.com', '01310100',
    '{"street": "Av. Paulista", "number": "100", "neighborhood": "Bela Vista", "city": "Sao Paulo", "state": "SP"}',
    'pending'
  ),
  (
    NULL, 1235, 'Correios', 'SEDEX', '04014', 45.90, 45.90, 3, 320,
    'João Santos', 'joao@email.com', '20040010',
    '{"street": "Av. Rio Branco", "number": "50", "neighborhood": "Centro", "city": "Rio de Janeiro", "state": "RJ"}',
    'shipped'
  );
*/