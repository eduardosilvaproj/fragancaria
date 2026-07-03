-- =============================================
-- Vincula pedidos (orders) a usuários autenticados (auth.users).
-- Pedidos guest continuam funcionando (user_id fica null).
-- Esta migration é idempotente: pode ser rodada mais de uma vez sem erro.
-- =============================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Libera SELECT para o próprio dono do pedido.
-- service_role continua com acesso total (bypassa RLS).
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.orders TO authenticated;
