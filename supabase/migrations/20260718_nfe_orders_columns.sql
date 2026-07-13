-- Migration: NF-e columns in orders table
-- AddsNota Fiscal Eletrônica fields to the orders table
-- These columns will be populated after successful SEFAZ authorization

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS nfe_key text,
  ADD COLUMN IF NOT EXISTS nfe_number integer,
  ADD COLUMN IF NOT EXISTS nfe_series integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS nfe_status text,
  ADD COLUMN IF NOT EXISTS nfe_xml text,
  ADD COLUMN IF NOT EXISTS nfe_danfe_url text,
  ADD COLUMN IF NOT EXISTS nfe_emitted_at timestamptz;

-- Index for fast lookup by NF-e key
CREATE INDEX IF NOT EXISTS orders_nfe_key_idx ON public.orders(nfe_key) WHERE nfe_key IS NOT NULL;

-- Index for orders with NF-e emitted
CREATE INDEX IF NOT EXISTS orders_nfe_number_idx ON public.orders(nfe_series, nfe_number) WHERE nfe_number IS NOT NULL;