-- Migration: add loyalty_points and loyalty_tier to customers table
-- These columns are referenced by customers-admin.functions.ts and admin/clientes.tsx

ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_tier TEXT DEFAULT 'bronze' NOT NULL;

ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_loyalty_tier_check;
ALTER TABLE customers ADD CONSTRAINT customers_loyalty_tier_check
  CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum'));