-- 20260714_customer_addresses.sql
-- Rodar no SQL Editor do Supabase (project gzxlupgdmrtkprwhiutp).
-- Livro de endereços do cliente: múltiplos endereços por usuário + um padrão.
-- Idempotente: usa IF NOT EXISTS. Segue o padrão de customer_account_full
-- (RLS por dono + grants service_role/authenticated + trigger set_updated_at).

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,                         -- ex.: "Casa", "Trabalho"
  recipient_name TEXT NOT NULL,
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,                 -- UF (2 letras)
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
  ON public.customer_addresses(user_id);

-- No máximo um endereço padrão por usuário.
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_addresses_one_default
  ON public.customer_addresses(user_id)
  WHERE is_default;

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_addresses_select_own ON public.customer_addresses;
CREATE POLICY customer_addresses_select_own ON public.customer_addresses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_addresses_insert_own ON public.customer_addresses;
CREATE POLICY customer_addresses_insert_own ON public.customer_addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_addresses_update_own ON public.customer_addresses;
CREATE POLICY customer_addresses_update_own ON public.customer_addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_addresses_delete_own ON public.customer_addresses;
CREATE POLICY customer_addresses_delete_own ON public.customer_addresses
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.customer_addresses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;

DROP TRIGGER IF EXISTS trg_customer_addresses_updated_at ON public.customer_addresses;
CREATE TRIGGER trg_customer_addresses_updated_at
  BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
