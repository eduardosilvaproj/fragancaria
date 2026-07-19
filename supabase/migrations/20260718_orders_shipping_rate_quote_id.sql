-- Migration: persist shipping_rate_quote_id in orders
-- Keeps a durable pointer to the checkout quote chosen at payment time.
-- Orders survive quote expiration; if a quote row is removed later, the reference is nulled.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_rate_quote_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_shipping_rate_quote_id_fkey'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_shipping_rate_quote_id_fkey
      FOREIGN KEY (shipping_rate_quote_id)
      REFERENCES public.shipping_rate_quotes(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_shipping_rate_quote_id_idx
  ON public.orders(shipping_rate_quote_id)
  WHERE shipping_rate_quote_id IS NOT NULL;
