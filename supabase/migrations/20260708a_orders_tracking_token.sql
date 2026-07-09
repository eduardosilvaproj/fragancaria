-- ==========================================================
-- Migration: 20260708a_orders_tracking_token.sql
--
-- Purpose: P0-Security on public.orders — PART A (schema only)
--   Add tracking_token column + unique partial index + comment.
--   16-char nanoid (alphabet A-Z minus I/L/O + 2-9, 31 glyphs,
--   ~77.5 bits of entropy) generated server-side at INSERT
--   by createPayment. Used as the credential for guest tracking
--   via /rastrear-pedido.
--
-- WHEN TO APPLY (B1 fix):
--   Edu applies this migration BEFORE the app deploy that adds
--   tracking_token generation in createPayment. Reversing the
--   old order is the bug that broke the previous attempt: the
--   app would INSERT tracking_token against a column that did
--   not yet exist ("Could not find the 'tracking_token' column").
--
--   Order is:
--     1) Edu applies THIS file (a)  ← you are here
--     2) push/deploy (creates column aware code)
--     3) UI files (6-10) deploy separately
--     4) Edu applies 20260708b_orders_policies_lockdown.sql
--
-- Backfill: NOT required. Orders created before this migration
-- have tracking_token = NULL. Guest tracking returns
-- "codigo nao encontrado"; the customer must contact SAC.
-- Mass-backfill is a feature, not a security fix.
--
-- Rollback: see bottom. Tokens are CUSTOMER DATA — rolling back
-- this migration does NOT drop the column or the index, since
-- tokens already issued are in active use by guests. Use the
-- legacy /pedido/$id flow (admin-only) to look them up by id.
-- ==========================================================

BEGIN;

-- 1) tracking_token column (text, nullable for back-compat).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_token text;

-- NOTE: refund_request_id and refund_requested_at on orders were considered
-- but intentionally NOT added here. The link order -> refund request lives in
-- refund_requests.order_id (already present). Admin reconciles by joining on
-- order_id. Adding redundant columns to orders is logged as backlog in
-- docs/agente-fase1.md ("colunas de reconciliação refund em orders") for a
-- future iteration outside the P0 scope.

-- 2) Unique partial index. Partial because most orders WILL have a token,
--    but pre-migration orders do not — NULL is allowed to repeat.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tracking_token
  ON public.orders (tracking_token)
  WHERE tracking_token IS NOT NULL;

-- 3) COMMENT for any future human/dba.
COMMENT ON COLUMN public.orders.tracking_token IS
  'URL-safe unguessable code (16 chars nanoid, alphabet A-Z minus I/L/O plus 2-9, ~77.5 bits of entropy) generated server-side at order creation. Used as guest tracking credential via /rastrear-pedido. No anon policy reads this column. Pre-deploy orders: NULL.';

COMMIT;

-- ==========================================================
-- ROLLBACK (this file only)
--
-- DO NOT drop the column in production: tokens already issued
-- are in active use by guests visiting /rastrear-pedido. Dropping
-- the column is irreversible data loss. Use the following in dev:
--
--   BEGIN;
--   DROP INDEX IF EXISTS public.uq_orders_tracking_token;
--   ALTER TABLE public.orders DROP COLUMN IF EXISTS tracking_token;
--   COMMIT;
--
-- In prod, if you must revert (a), do:
--   BEGIN;
--   -- keep column + index, just stop USING the column from the app
--   -- (revert payments.functions.ts to skip tracking_token on INSERT)
--   -- the column will become effectively dormant, still NOT NULL? NO — it's nullable.
--   COMMIT;
-- ==========================================================
