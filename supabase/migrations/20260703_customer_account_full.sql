-- 20260703_customer_account_full.sql
-- Rodar no SQL Editor do Supabase (project gzxlupgdmrtkprwhiutp).
-- Cria a tabela `customers` que faltava e depois a area do cliente (link
-- orders <-> auth.users, wishlist, notificacoes, solicitacoes de estorno).
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ============================================================
-- 0. Tabela `customers` (faltava — outras partes do codigo e a
--    propria migration abaixo ja referenciavam ela).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  name TEXT,
  phone TEXT,
  cpf TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_auth_user_id ON public.customers(auth_user_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customers_select_own ON public.customers;
CREATE POLICY customers_select_own ON public.customers
  FOR SELECT USING (auth.uid() = auth_user_id OR (auth.jwt() ->> 'email') = email);
DROP POLICY IF EXISTS customers_insert_own ON public.customers;
CREATE POLICY customers_insert_own ON public.customers
  FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
DROP POLICY IF EXISTS customers_update_own ON public.customers;
CREATE POLICY customers_update_own ON public.customers
  FOR UPDATE USING (auth.uid() = auth_user_id);

GRANT ALL ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 1. orders.auth_user_id: linka pedido ao user logado.
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_orders_auth_user_id ON public.orders(auth_user_id);

-- Quando um cliente passa a ter auth_user_id, retroalimenta pedidos antigos
-- (guest) com o mesmo email.
CREATE OR REPLACE FUNCTION public.sync_orders_to_auth_user()
RETURNS TRIGGER AS $_$
BEGIN
  IF NEW.auth_user_id IS NOT NULL AND (OLD.auth_user_id IS NULL OR OLD.auth_user_id <> NEW.auth_user_id) THEN
    UPDATE public.orders
       SET auth_user_id = NEW.auth_user_id
     WHERE customer_email = NEW.email
       AND auth_user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$_$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_orders_to_auth_user ON public.customers;
CREATE TRIGGER trg_sync_orders_to_auth_user
  AFTER UPDATE OF auth_user_id ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.sync_orders_to_auth_user();

-- ============================================================
-- 2. Tabela wishlist
-- ============================================================
CREATE TABLE IF NOT EXISTS public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,  -- ID do produto (ex: "MLB1234") — sem FK pois produtos vêm de data/products.ts
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wishlist_select_own ON public.wishlist;
CREATE POLICY wishlist_select_own ON public.wishlist
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS wishlist_insert_own ON public.wishlist;
CREATE POLICY wishlist_insert_own ON public.wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS wishlist_delete_own ON public.wishlist;
CREATE POLICY wishlist_delete_own ON public.wishlist
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON public.wishlist TO service_role;
GRANT SELECT, INSERT, DELETE ON public.wishlist TO authenticated;

-- ============================================================
-- 3. Tabela notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- ============================================================
-- 4. Tabela refund_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  requested_amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON public.refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON public.refund_requests(status);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS refund_requests_select_own ON public.refund_requests;
CREATE POLICY refund_requests_select_own ON public.refund_requests
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS refund_requests_insert_own ON public.refund_requests;
CREATE POLICY refund_requests_insert_own ON public.refund_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS refund_requests_update_own ON public.refund_requests;
CREATE POLICY refund_requests_update_own ON public.refund_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
            WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.refund_requests TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.refund_requests TO authenticated;

DROP TRIGGER IF EXISTS trg_refund_requests_updated_at ON public.refund_requests;
CREATE TRIGGER trg_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. orders.refund_status
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT NULL
    CHECK (refund_status IN ('requested', 'approved', 'rejected', 'processed') OR refund_status IS NULL);

-- ============================================================
-- 6. RLS para orders: usuario logado ve pedidos com auth_user_id
--    dele OU com seu email.
-- ============================================================
DROP POLICY IF EXISTS orders_select_auth ON public.orders;
CREATE POLICY orders_select_auth ON public.orders
  FOR SELECT USING (
    auth.uid() = auth_user_id
    OR (auth.jwt() ->> 'email') = customer_email
  );