-- Migration: suporte a conversas web (Fran) nas tabelas de atendimento
--
-- Contexto: o widget da Fran no site permite que visitantes anônimos conversem
-- com a assistente IA. Esta migration adapta as tabelas conversations/messages
-- (criadas em 20260628_whatsapp_conversations.sql) para suportar esse canal.
--
-- Mudanças:
--   1. Adiciona 'web' ao CHECK de conversations.channel
--   2. Adiciona session_id (identificador de navegador, não de pessoa) para
--      agrupar mensagens de visitantes anônimos sem exigir login
--   3. Adiciona replied_by (fran|human) para controle de handoff:
--      - 'fran': a Fran responde automaticamente
--      - 'human': um atendente assumiu — a Fran NÃO responde
--   4. Índice único (session_id, channel) para upsert idempotente no web
--   5. Documenta que messages.content pode conter PII (email, CPF, pedido)
--      e que o acesso é restrito a service_role (admin)
--
-- Aplicação: executar no SQL Editor do Supabase (não roda via app).
-- Idempotente: pode ser executado múltiplas vezes sem erro.

-- =============================================================
-- 1. Adicionar 'web' ao CHECK de channel
-- =============================================================
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_channel_check;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_channel_check
    CHECK (channel IN ('whatsapp', 'instagram', 'email', 'web'));

-- =============================================================
-- 2. Coluna session_id (para conversas web anônimas)
-- =============================================================
-- session_id é um UUID gerado no navegador e armazenado no franChatStore.
-- Identifica o NAVEGADOR, não a pessoa — limpar cookies/localStorage gera
-- uma nova sessão. Não deve ser tratado como identidade única de cliente.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Índice único para web: uma conversa por session_id (upsert idempotente).
-- Conversas de outros canais (whatsapp) continuam usando o índice
-- conversations_phone_channel_unique existente.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_session_channel_unique
  ON public.conversations (session_id, channel)
  WHERE channel = 'web';

-- =============================================================
-- 3. Coluna replied_by (controle de handoff Fran vs humano)
-- =============================================================
-- 'fran': a Fran responde automaticamente (padrão para conversas web).
-- 'human': um atendente assumiu o atendimento — a Fran NÃO responde.
-- A transição 'fran' -> 'human' é o "assumir"; 'human' -> 'fran' é o "devolver".
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS replied_by TEXT NOT NULL DEFAULT 'fran'
    CHECK (replied_by IN ('fran', 'human'));

-- =============================================================
-- 4. Índice para listar conversas web no admin
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_conversations_channel
  ON public.conversations (channel, last_message_at DESC);

-- =============================================================
-- 5. Comentários (documentação no schema)
-- =============================================================
COMMENT ON COLUMN public.conversations.session_id IS
  'Identificador de navegador (UUID gerado no cliente). Não é identidade de pessoa — limpar navegador gera nova sessão. Usado apenas para canal web.';

COMMENT ON COLUMN public.conversations.replied_by IS
  'Quem responde: fran (automático) ou human (atendente assumiu). Quando human, a Fran não responde automaticamente.';

COMMENT ON COLUMN public.messages.content IS
  'ATENÇÃO: pode conter PII (email, CPF, número de pedido) digitado pelo cliente. Acesso restrito a service_role (admin). Sem políticas públicas de leitura.';
