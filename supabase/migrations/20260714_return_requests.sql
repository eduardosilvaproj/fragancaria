-- 20260714_return_requests.sql
-- Rodar no SQL Editor do Supabase (project gzxlupgdmrtkprwhiutp).
-- Devoluções e trocas (distinto de refund_requests, que é só reembolso).
-- Cobre: direito de arrependimento, defeito, produto errado; e a resolução
-- escolhida (reembolso, troca por outro produto, ou vale-compra).
-- Idempotente. Segue o padrão de customer_account_full (RLS por dono +
-- grants service_role/authenticated + trigger set_updated_at).

CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Motivo da devolução.
  reason TEXT NOT NULL
    CHECK (reason IN ('arrependimento', 'defeito', 'produto_errado', 'avaria_transporte', 'outro')),
  -- Resolução desejada pelo cliente.
  resolution TEXT NOT NULL DEFAULT 'reembolso'
    CHECK (resolution IN ('reembolso', 'troca', 'vale_compra')),
  -- Itens devolvidos (JSON, mesmo shape de orders.items). Devolução parcial
  -- é suportada listando só os itens afetados.
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'rejected', 'awaiting_return', 'received', 'completed', 'cancelled')),
  -- Logística reversa.
  reverse_tracking_code TEXT,
  reverse_label_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON public.return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON public.return_requests(status);

ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS return_requests_select_own ON public.return_requests;
CREATE POLICY return_requests_select_own ON public.return_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS return_requests_insert_own ON public.return_requests;
CREATE POLICY return_requests_insert_own ON public.return_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'requested');

-- Cliente só pode alterar (ex.: cancelar) enquanto ainda 'requested'.
DROP POLICY IF EXISTS return_requests_update_own ON public.return_requests;
CREATE POLICY return_requests_update_own ON public.return_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'requested')
            WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.return_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.return_requests TO authenticated;

DROP TRIGGER IF EXISTS trg_return_requests_updated_at ON public.return_requests;
CREATE TRIGGER trg_return_requests_updated_at
  BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vale-compra (store credit). Saldo por usuário; consumido no checkout.
-- Cada linha é um crédito emitido (ex.: de uma devolução aprovada).
CREATE TABLE IF NOT EXISTS public.store_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  balance NUMERIC(10,2) NOT NULL CHECK (balance >= 0),
  origin TEXT NOT NULL DEFAULT 'return',  -- return | manual | promo
  return_request_id UUID REFERENCES public.return_requests(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_credits_user_id ON public.store_credits(user_id);

ALTER TABLE public.store_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_credits_select_own ON public.store_credits;
CREATE POLICY store_credits_select_own ON public.store_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Emissão/consumo de crédito é sempre via service_role (server fn), nunca
-- direto pelo cliente — por isso não há policy de INSERT/UPDATE para authenticated.
GRANT ALL ON public.store_credits TO service_role;
GRANT SELECT ON public.store_credits TO authenticated;

DROP TRIGGER IF EXISTS trg_store_credits_updated_at ON public.store_credits;
CREATE TRIGGER trg_store_credits_updated_at
  BEFORE UPDATE ON public.store_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
