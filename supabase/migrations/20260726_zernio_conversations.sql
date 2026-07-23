-- Migration: suporte a conversas Instagram (Zernio) nas tabelas de atendimento
--
-- Contexto: o webhook do Zernio (src/routes/api/public/zernio-webhook.ts) recebe
-- DMs do Instagram e a Fran responde automaticamente. Esta migration adapta as
-- tabelas conversations/messages para suportar esse canal.
--
-- Mudanças:
--   1. Adiciona zernio_conversation_id (ID da conversa no Zernio) para
--      identificar unicamente cada conversa do Instagram
--   2. Índice único parcial para upsert idempotente por zernio_conversation_id
--   3. Adiciona zernio_account_id (qual conta do Instagram recebeu a DM)
--      para usar ao responder via Zernio API
--   4. Adiciona coluna zernio_message_id em messages (alternativa ao
--      wa_message_id, que é específico do WhatsApp)
--
-- Idempotente: pode ser executado múltiplas vezes sem erro.

-- =============================================================
-- 1. Coluna zernio_conversation_id em conversations
-- =============================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS zernio_conversation_id TEXT;

COMMENT ON COLUMN public.conversations.zernio_conversation_id IS
  'ID da conversa no Zernio (conversationId do webhook). Usado para upsert idempotente de conversas Instagram.';

-- =============================================================
-- 2. Índice único parcial para Instagram
-- =============================================================
-- Garante uma conversa por zernio_conversation_id (apenas linhas
-- com esse campo preenchido). Conversas de outros canais ignoram.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_zernio_conv_unique
  ON public.conversations (zernio_conversation_id)
  WHERE zernio_conversation_id IS NOT NULL;

-- =============================================================
-- 3. Coluna zernio_account_id em conversations
-- =============================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS zernio_account_id TEXT;

COMMENT ON COLUMN public.conversations.zernio_account_id IS
  'ID da conta do Instagram no Zernio (account.id do webhook). Usado ao responder via Zernio API.';

-- =============================================================
-- 4. Coluna zernio_message_id em messages
-- =============================================================
-- Alternativa ao wa_message_id (WhatsApp). Cada mensagem do Instagram
-- tem um message.id único no Zernio, usado para idempotência.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS zernio_message_id TEXT;

COMMENT ON COLUMN public.messages.zernio_message_id IS
  'ID da mensagem no Zernio (message.id do webhook). Usado para idempotência (unique).';

CREATE UNIQUE INDEX IF NOT EXISTS messages_zernio_msg_unique
  ON public.messages (zernio_message_id)
  WHERE zernio_message_id IS NOT NULL;
