ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_ibge_code text;
