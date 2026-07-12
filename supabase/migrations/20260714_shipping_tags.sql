-- =====================================================
-- SHIPPING TAGS: Gerenciamento de etiquetas SIGEP
-- =====================================================
-- Tabela para gerenciar etiquetas disponíveis e vinculadas
-- a pedidos. Funciona em conjunto com shipping_quotes.
--
-- Fluxo de etiquetas:
-- 1. Admin solicita etiquetas ao SIGEP -> shipping_tags (disponivel)
-- 2. Admin vincula etiqueta a um pedido -> shipping_tags (emitida)
-- 3. shipping_quotes é atualizado com o tracking_code
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shipping_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,

  -- Dados da etiqueta
  tracking_code TEXT NOT NULL UNIQUE,
  service TEXT NOT NULL, -- PAC, SEDEX, SEDEX10

  -- Status da etiqueta
  status TEXT NOT NULL DEFAULT 'disponivel'
    CHECK (status IN (
      'disponivel',  -- Disponível para uso
      'reservada',   -- Reservada para um pedido
      'emitida',     -- Já vinculada a um pedido
      'usada',       -- Objeto postado
      'cancelada'    -- Cancelada/devolvida ao pool
    )),

  -- Dados do destinatário (copiados no momento da emissão)
  recipient_name TEXT,
  recipient_document TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  recipient_address JSONB, -- { street, number, complement, neighborhood, city, state, postal_code }

  -- Dimensões do pacote
  weight_grams INTEGER,
  height_cm NUMERIC(6, 2),
  width_cm NUMERIC(6, 2),
  length_cm NUMERIC(6, 2),

  -- Valor declarado (para seguro)
  declared_value DECIMAL(10, 2),

  -- Data de vinculação ao pedido
  linked_at TIMESTAMPTZ,

  -- Data de postagem
  shipped_at TIMESTAMPTZ,

  -- Rastreamento
  last_tracking_status TEXT,
  last_tracking_date TIMESTAMPTZ,
  tracking_history JSONB DEFAULT '[]',

  -- PDF da etiqueta
  label_pdf_url TEXT,

  -- ID no SIGEP (para cancelamento)
  sigep_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscar etiquetas disponíveis
CREATE INDEX IF NOT EXISTS idx_shipping_tags_status
  ON public.shipping_tags(status);

-- Índice para buscar por código de rastreio
CREATE INDEX IF NOT EXISTS idx_shipping_tags_tracking
  ON public.shipping_tags(tracking_code);

-- Índice para buscar etiquetas por pedido
CREATE INDEX IF NOT EXISTS idx_shipping_tags_order
  ON public.shipping_tags(order_id) WHERE order_id IS NOT NULL;

-- Trigger para updated_at
DROP TRIGGER IF EXISTS shipping_tags_updated_at ON public.shipping_tags;
CREATE TRIGGER shipping_tags_updated_at
  BEFORE UPDATE ON public.shipping_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- RLS: Políticas de acesso
-- =====================================================

ALTER TABLE public.shipping_tags ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar etiquetas
CREATE POLICY "Admin manage shipping tags"
  ON public.shipping_tags FOR ALL
  USING (auth.role() = 'authenticated');

-- =====================================================
-- VIEW: Estatísticas de etiquetas
-- =====================================================

CREATE OR REPLACE VIEW public.shipping_tags_stats AS
SELECT
  status,
  service,
  COUNT(*) as count
FROM public.shipping_tags
GROUP BY status, service;