-- =============================================================
-- Migration: agent_carts — carrinho iniciado em chat
-- =============================================================
-- Contexto:
--   Carrinho efêmero (24h) iniciado pelo agente IA em conversa WhatsApp.
--   Conversion tracking essencial para o War Room metricar:
--     • agent_carts.converted_order_id (FK orders) — preenchido no fluxo
--       gerar_link_pagamento (Fase 1.B3 — chamado pelo agent-service).
--     • agent_carts.conversion_method (pix|credit_card|boleto)
--     • agent_carts.total_amount (com cupom + frete)
--
--   Idempotente.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.agent_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Âncora
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  agent_session_id UUID REFERENCES public.agent_sessions(id) ON DELETE SET NULL,
  customer_phone TEXT,
  customer_email TEXT,

  -- Estado
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open',           -- sendo montado
      'awaiting_payment', -- link MP enviado, aguardando
      'paid',           -- pagamento confirmado
      'cancelled',      -- cliente desistiu
      'expired'         -- passou de 24h
    )),

  -- Snapshot dos itens (mesmo shape de orders.order_items para 1:1)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Endereço de envio (se cliente já passou CEP)
  shipping_address JSONB,

  -- Cupom + frete aplicados
  coupon_code TEXT,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_service TEXT,  -- 'PAC', 'SEDEX', 'Fragranciaria Express', etc
  shipping_deadline_days INT,

  -- Totais
  subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Conversion tracking (preenchido quando webhook MP confirma)
  converted_order_id UUID REFERENCES public.orders(id),
  conversion_method TEXT CHECK (conversion_method IN ('pix','credit_card','boleto')),
  mp_payment_id TEXT,
  payment_link_url TEXT,

  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  CONSTRAINT positive_totals CHECK (
    subtotal_amount >= 0 AND total_amount >= 0
    AND discount_amount >= 0 AND shipping_amount >= 0
  ),
  CONSTRAINT converted_implies_paid CHECK (
    (converted_order_id IS NULL) OR (status = 'paid')
  )
);

-- Vínculos essenciais
CREATE INDEX IF NOT EXISTS idx_agent_carts_conv
  ON public.agent_carts(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_carts_session
  ON public.agent_carts(agent_session_id);

-- Carrinhos abertos + status (mostrar ao agente)
CREATE INDEX IF NOT EXISTS idx_agent_carts_status
  ON public.agent_carts(status, updated_at DESC)
  WHERE status IN ('open','awaiting_payment');

-- Conversion tracking (relatórios)
CREATE INDEX IF NOT EXISTS idx_agent_carts_converted
  ON public.agent_carts(converted_order_id, paid_at DESC)
  WHERE converted_order_id IS NOT NULL;

-- Limpeza de expirados (cron não implementado nesta migration; índice auxilia futuro)
CREATE INDEX IF NOT EXISTS idx_agent_carts_expires
  ON public.agent_carts(expires_at)
  WHERE status IN ('open','awaiting_payment');


-- Trigger updated_at (padrão existente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_carts_updated_at ON public.agent_carts;
CREATE TRIGGER trg_agent_carts_updated_at
  BEFORE UPDATE ON public.agent_carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Permissões
GRANT ALL ON public.agent_carts TO service_role;
ALTER TABLE public.agent_carts ENABLE ROW LEVEL SECURITY;


-- View: carrinhos ativos com decisão do agente
CREATE OR REPLACE VIEW public.v_agent_carts_active AS
SELECT
  ac.*,
  c.customer_name,
  s.state AS session_state,
  s.attempts AS session_attempts,
  d.outcome AS decided_outcome,
  d.order_id AS decision_order_id,
  EXTRACT(EPOCH FROM (now() - ac.created_at))::int AS age_seconds,
  EXTRACT(EPOCH FROM (ac.expires_at - now()))::int AS seconds_to_expire
FROM public.agent_carts ac
JOIN public.conversations c ON c.id = ac.conversation_id
LEFT JOIN public.agent_sessions s ON s.id = ac.agent_session_id
LEFT JOIN public.agent_decisions d ON d.agent_cart_id = ac.id
WHERE ac.status IN ('open','awaiting_payment');


-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_carts;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END
$$;

COMMENT ON TABLE public.agent_carts IS
  'Carrinho iniciado em chat pelo agente. converted_order_id preenche quando pagamento MP confirma. Essencial para métrica de conversão do War Room.';
COMMENT ON COLUMN public.agent_carts.converted_order_id IS
  'FK para orders.id. Preenchido no fluxo gerar_link_pagamento → webhook MP → payments.functions.ts confirma → UPDATE aqui.';
COMMENT ON COLUMN public.agent_carts.conversion_method IS
  'pix | credit_card | boleto. Snapshot no momento do pagamento.';
