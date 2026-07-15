-- Migration: 20260721_shipping_print_status.sql
-- Registra a primeira impressão da etiqueta e declaração de conteúdo.
-- Aplicar manualmente no SQL Editor antes de usar em produção.

ALTER TABLE shipping_quotes
  ADD COLUMN IF NOT EXISTS label_printed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declaration_printed_at TIMESTAMPTZ;

COMMENT ON COLUMN shipping_quotes.label_printed_at IS 'Primeira vez que a etiqueta foi aberta para impressão';
COMMENT ON COLUMN shipping_quotes.declaration_printed_at IS 'Primeira vez que a declaração de conteúdo foi aberta para impressão';