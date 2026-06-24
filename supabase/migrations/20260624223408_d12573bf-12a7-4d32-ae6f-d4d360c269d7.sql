ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS shipping_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS items JSONB,
  ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS total DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_delivery DATE;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Public can read orders by id" ON public.orders;
CREATE POLICY "Public can read orders by id"
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (true);