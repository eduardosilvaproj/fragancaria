-- ==========================================================
-- Migration: 20260708b_orders_policies_lockdown.sql
--
-- Purpose: P0-Security on public.orders — PART B (policies only)
--   Closes the privacy hole around /pedido/$id and the
--   over-broad USING(true) policies that have been in place
--   since the storefront's first cutover.
--
--   - REVOKE anon GRANT (schema-level allow-all for anon)
--   - DROP 3 overly-permissive policies
--   - RECREATE orders_select_auth with explicit TO authenticated
--   - RECREATE orders_modify_service_role with explicit TO service_role
--
--   NOTE: there is intentionally NO replacement INSERT policy for
--   authenticated. With all permissives dropped and GRANT revoked,
--   RLS is default-deny for authenticated INSERT. Order creation
--   is the server fn createPayment's job (service_role via the
--   service_role client). Creating an authenticated-side INSERT
--   policy here would RE-OPEN the hole: WITH CHECK only validates
--   identity, not content — a logged-in user could INSERT an order
--   with payment_status='paid' for someone else. Absence is the
--   defense.
--
-- WHEN TO APPLY (B1 fix):
--   Edu applies this migration AFTER app deploys (a) tracking_token
--   generation in createPayment AND (b) the UI files (6-10) that
--   route /pedido/$id and /rastrear-pedido to the new flows.
--
--   Order:
--     1) Edu applies 20260708a_orders_tracking_token.sql  ← earlier
--     2) push/deploy
--     3) UI files (6-10) deploy separately
--     4) Edu applies THIS file (b)  ← you are here
--
--   Applying (b) before (a)+(UI) would break /pedido/$id for any
--   authenticated user mid-flow (RLS denies). Apply in order.
--
-- Rollback: see bottom. Safe to roll back without dropping
-- tracking_token column or index.
-- ==========================================================

BEGIN;

-- 1) Revoke anon GRANT on the table.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM public;

-- 2) Drop the 3 overly-permissive policies.
DROP POLICY IF EXISTS "Anyone can read orders by id"  ON public.orders;
DROP POLICY IF EXISTS "Allow all operations"           ON public.orders;
DROP POLICY IF EXISTS "Admin can manage orders"        ON public.orders;
-- 3) Drop orders_select_auth so we can recreate with explicit TO.
DROP POLICY IF EXISTS orders_select_auth ON public.orders;

-- 4) Recreate orders_select_auth, explicit TO authenticated.
--    Reads only this user's orders (by auth_user_id OR customer_email).
--    Does NOT include tracking_token — guests use a separate fn
--    (getOrderByTrackingToken) that hits service_role directly.
CREATE POLICY orders_select_auth
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR lower(customer_email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- 5) Service role may INSERT/UPDATE/DELETE. Recreate with explicit TO
--    so future audits do not miss it.
DROP POLICY IF EXISTS orders_modify_service_role ON public.orders;
CREATE POLICY orders_modify_service_role
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- INTENTIONALLY NO authenticated INSERT POLICY.
-- See header.

COMMIT;

-- ==========================================================
-- ROLLBACK (this file only)
--
-- Restores the prior state (3 permissive policies + anon GRANT).
-- Use ONLY in dev. In prod, you must pair this with the UI rollback
-- that re-introduces the legacy /pedido/$id email lookup.
--
--   BEGIN;
--   DROP POLICY IF EXISTS orders_select_auth ON public.orders;
--   DROP POLICY IF EXISTS orders_modify_service_role ON public.orders;
--
--   CREATE POLICY "Anyone can read orders by id" ON public.orders
--     FOR SELECT USING (true);
--   CREATE POLICY "Allow all operations" ON public.orders
--     FOR ALL USING (true);
--   CREATE POLICY "Admin can manage orders" ON public.orders
--     FOR ALL TO authenticated USING (
--       EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
--     );
--
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO public;
--   COMMIT;
--
-- The OLD policy "Authenticated users can insert their own orders"
-- is intentionally NOT recreated here. That was the hole B3 fixed.
-- ==========================================================
