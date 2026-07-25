-- Migration: Adicionar colunas de afiliado em orders + order_id em affiliate_sales
-- Data: 2026-07-24

-- =============================================
-- 1. orders: colunas de afiliado
-- =============================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_commission_rate NUMERIC(5,4);

CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(affiliate_id);

-- =============================================
-- 2. affiliate_sales: order_id como FK única
-- =============================================
ALTER TABLE affiliate_sales
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD CONSTRAINT affiliate_sales_order_id_key UNIQUE (order_id);
