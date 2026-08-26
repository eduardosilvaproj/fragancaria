-- 20260825_nfe_rejeicao_rastro.sql
-- Rastro de rejeicao da SEFAZ/notaas para emitNFe.
-- Adiciona colunas de codigo e motivo do erro quando status = 'rejeitada'.
-- Idempotente: ADD COLUMN IF NOT EXISTS.
-- Rodar no SQL Editor do Supabase (project gzxlupgdmrtkprwhiutp).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS nfe_erro_codigo text,
  ADD COLUMN IF NOT EXISTS nfe_erro_motivo text;

-- Garante que rejeicoes aparecam nas consultas por status rapidamente.
CREATE INDEX IF NOT EXISTS orders_nfe_status_idx
  ON public.orders(nfe_status)
  WHERE nfe_status IS NOT NULL;
