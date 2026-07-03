-- Migration: garantir índice UNIQUE em orders.payment_id
--
-- Contexto: o webhook do Mercado Pago (src/routes/api/public/mp-webhook.ts)
-- faz upsert com onConflict: "payment_id". Isso exige um índice UNIQUE em
-- payment_id. A tabela orders foi criada por uma migration 002 antiga SEM o
-- UNIQUE, e a migration 20260624220105 que define UNIQUE usa CREATE TABLE IF
-- NOT EXISTS — como a tabela já existia, o UNIQUE nunca foi aplicado ao banco.
--
-- Sem este índice, a atualização de status do pedido após o pagamento FALHA
-- silenciosamente (erro 42P10) e o pedido fica eternamente "pending".
--
-- Idempotente: seguro rodar mais de uma vez.

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id_unique
  ON public.orders (payment_id);
