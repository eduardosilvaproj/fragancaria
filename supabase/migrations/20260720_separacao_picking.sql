-- Migration: 20260720_separacao_picking.sql
-- Adiciona colunas de controle de separação/picking em orders
-- Aplicado via SQL Editor. Commitado no repo após aplicação.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_finished_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.processing_started_at IS 'Quando o operador iniciou a separação do pedido';
COMMENT ON COLUMN orders.processing_finished_at IS 'Quando o operador finalizou separação e despachou';