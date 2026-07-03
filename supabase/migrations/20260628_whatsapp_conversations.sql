-- Migration: tabelas de atendimento (conversations + messages) para WhatsApp Cloud API
--
-- Contexto: a tela /admin/sac (src/routes/admin/sac.tsx) era 100% mock. Esta
-- migration cria o backend real para o atendimento. O webhook do WhatsApp
-- (src/routes/api/public/whatsapp-webhook.ts) grava as mensagens recebidas aqui,
-- e as funções server (src/lib/whatsapp.functions.ts) leem para alimentar o painel.
--
-- Escrito no mesmo estilo das migrations existentes: gen_random_uuid(), TIMESTAMPTZ,
-- índices idx_, RLS habilitado, GRANT service_role, idempotente (IF NOT EXISTS).
-- O app acessa via supabaseAdmin (service role, bypassa RLS); não há policy pública.

-- =============================================================
-- conversations: um registro por contato/canal
-- =============================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'instagram', 'email')),
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'pending', 'resolved')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único por contato+canal: permite upsert idempotente no webhook
-- (uma conversa por número de WhatsApp).
CREATE UNIQUE INDEX IF NOT EXISTS conversations_phone_channel_unique
  ON public.conversations (customer_phone, channel);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON public.conversations (last_message_at DESC);

-- =============================================================
-- messages: mensagens de cada conversa
-- =============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  wa_message_id TEXT UNIQUE,
  content TEXT,
  sender TEXT NOT NULL DEFAULT 'customer'
    CHECK (sender IN ('customer', 'agent')),
  message_type TEXT NOT NULL DEFAULT 'text',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages (conversation_id, created_at);

-- =============================================================
-- trigger updated_at em conversations
-- =============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON public.conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- permissões + RLS
-- =============================================================
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Sem policies anon/authenticated: leitura/escrita apenas via service role
-- (webhook + funções server do painel admin).
