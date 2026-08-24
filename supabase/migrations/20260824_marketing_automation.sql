-- Migration para suporte à Recompra Automática (30 dias) e Cupom de Aniversário
-- 1. Adiciona opt-in de WhatsApp e data de último lembrete de recompra no cadastro de clientes
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_reorder_reminder_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS last_birthday_coupon_year INT NULL;

-- 2. Adiciona suporte a opt_in na tabela de orders ou garante que customers gerencie isso
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE;

-- Índice para busca rápida de aniversariantes do dia
CREATE INDEX IF NOT EXISTS idx_customers_birth_date ON customers(birth_date);
CREATE INDEX IF NOT EXISTS idx_customers_opt_in ON customers(whatsapp_opt_in) WHERE whatsapp_opt_in = TRUE;