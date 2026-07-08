-- =============================================================
-- Migration: agent_policies + agent kill switch em conversations
-- =============================================================
-- Contexto:
--   Tabela de politicas do agente IA por canal (whatsapp, instagram,
--   site_chat). Migration final do Bloco A. Apos ela, Bloco B
--   (agent-service) pode ser iniciado.
--
-- Itens:
--   1. ADICIONA coluna ai_enabled em conversations (ja existente em
--      prod - aplicada manualmente via SQL Editor). IF NOT EXISTS
--      via DO block, seguro contra duplicacao.
--   2. Garante funcao public.set_updated_at() (referenciada por
--      20260703_customer_account_full.sql mas nunca definida em
--      migration - criar aqui como idempotente).
--   3. Tabela agent_policies com kill switch global/phone, tokens de
--      politica (max discount, escalation keywords, cooldown).
--   4. Funcao is_agent_enabled(phone) - checa kill switch + policy.
--   5. Habilita realtime para agent_policies.
--
-- Idempotente. Aplicar via SQL Editor do Supabase
-- (project gzxlupgdmrtkprwhiutp).
-- =============================================================


-- =============================================================
-- 0. Helper: set_updated_at()
-- =============================================================
-- Cria se nao existir (1-or-many migrations referenciam ela sem
-- definir; provavelmente foi criada via UI). CREATE OR REPLACE
-- nao serve para FUNCTION em qualquer assinatura; entao usamos
-- IF NOT EXISTS via DO block.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;
  END IF;
END
$$;


-- =============================================================
-- 1. Coluna ai_enabled em conversations (kill switch por conversa)
-- =============================================================
-- Default true (permite o agente); admin pode pausar por conversa.
-- IMPORTANTE: nao temos o schema autoritativo de conversations
-- no repo (a migration 20260628_whatsapp_conversations.sql tem
-- NULL bytes no comeco e esta truncada). Assumindo o padrao
-- Supabase: customer_phone TEXT e coluna canonica de telefone.
-- Se o nome for diferente, ajustar este bloco E a funcao abaixo.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='conversations'
      AND column_name='ai_enabled'
  ) THEN
    ALTER TABLE public.conversations
      ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END
$$;

COMMENT ON COLUMN public.conversations.ai_enabled IS
  'Kill switch por conversa. false = agente NAO responde; apenas humanos via /admin/sac.';


-- =============================================================
-- 2. Tabela agent_policies
-- =============================================================
-- Granularidade: 1 linha por channel + scope.
-- scope = global (politica padrao) | phone (numero especifico).
-- Quando existe policy phone, sobrescreve a global.

CREATE TABLE IF NOT EXISTS public.agent_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade da policy
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'site_chat')),
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'phone')),
  -- Para scope='phone', target_phone deve ser NOT NULL.
  target_phone TEXT,

  -- Kill switch (camada policy, alem do ai_enabled por conversa)
  -- Se ai_disabled=true AQUI, bloqueia TODAS as conversas do canal/phone,
  -- independente do ai_enabled da conversa individual.
  ai_disabled BOOLEAN NOT NULL DEFAULT false,
  ai_disabled_reason TEXT,
  ai_disabled_by TEXT,         -- email do admin que pausou
  ai_disabled_at TIMESTAMPTZ,

  -- Tokens de politica
  max_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 10.00
    CHECK (max_discount_percent BETWEEN 0 AND 100),
  max_cart_amount_brl NUMERIC(10,2) NOT NULL DEFAULT 500.00,
  escalation_keywords TEXT[] NOT NULL DEFAULT
    ARRAY['reclamação', 'advogado', 'procon', 'cancelar', 'fraude',
          'insatisfeito', 'devolução', 'reembolso', 'humano', 'atendente'],
  cooldown_seconds INT NOT NULL DEFAULT 30
    CHECK (cooldown_seconds >= 0),

  -- Personalidade / prompt base (sobrescreve o padrao no agent-service)
  system_prompt_override TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,

  -- Constraints
  CONSTRAINT phone_scope_has_target CHECK (
    (scope = 'global' AND target_phone IS NULL) OR
    (scope = 'phone'   AND target_phone IS NOT NULL)
  ),
  CONSTRAINT unique_policy_per_scope UNIQUE (channel, scope, target_phone)
);

-- Indices uteis
CREATE INDEX IF NOT EXISTS idx_agent_policies_lookup
  ON public.agent_policies(channel, scope, target_phone);

CREATE INDEX IF NOT EXISTS idx_agent_policies_disabled
  ON public.agent_policies(channel, ai_disabled)
  WHERE ai_disabled = true;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_agent_policies_updated_at ON public.agent_policies;
CREATE TRIGGER trg_agent_policies_updated_at
  BEFORE UPDATE ON public.agent_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.agent_policies ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin tools usam supabaseAdmin)
DROP POLICY IF EXISTS agent_policies_service_all ON public.agent_policies;
CREATE POLICY agent_policies_service_all ON public.agent_policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE public.agent_policies IS
  'Politicas do agente IA por canal. scope=global e default; scope=phone sobrescreve para numero especifico. ai_disabled e kill switch de emergencia.';
COMMENT ON COLUMN public.agent_policies.ai_disabled IS
  'Kill switch. true = agente NAO responde nenhuma conversa deste canal/phone, ate ser reativado.';
COMMENT ON COLUMN public.agent_policies.escalation_keywords IS
  'Palavras que forcam handoff para humano. Case-insensitive (checar via LOWER()).';
COMMENT ON COLUMN public.agent_policies.cooldown_seconds IS
  'Minimo entre mensagens do mesmo cliente. Evita flood de respostas se o webhook duplicar.';


-- =============================================================
-- 3. Seed: policy global padrao para WhatsApp
-- =============================================================
-- Garante que existe 1 linha global para 'whatsapp'. Se ja existir,
-- o ON CONFLICT nao faz nada.

INSERT INTO public.agent_policies (channel, scope, ai_disabled)
VALUES ('whatsapp', 'global', false)
ON CONFLICT (channel, scope, target_phone) DO NOTHING;


-- =============================================================
-- 4. Funcao is_agent_enabled
-- =============================================================
-- Usada pelo agent-service antes de cada chamada LLM.
-- Retorna: { allowed: bool, reason: text, policy_id: uuid }
--
-- Logica:
--   1. Se conversa NAO existe, retorna allowed=false.
--   2. Se conversations.ai_enabled=false, retorna false com reason.
--   3. Se existe policy phone com ai_disabled=true, retorna false.
--   4. Se existe policy global com ai_disabled=true, retorna false.
--   5. Caso contrario, allowed=true.
--
-- NOTA: assumindo coluna customer_phone em conversations. Se for
-- outro nome (phone, contact_phone, etc), ajustar aqui.

CREATE OR REPLACE FUNCTION public.is_agent_enabled(p_phone TEXT)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  policy_id UUID
) AS $$
DECLARE
  v_conv_ai_enabled BOOLEAN;
  v_phone_policy RECORD;
  v_global_policy RECORD;
BEGIN
  -- 1. Conversa existe e esta habilitada?
  SELECT c.ai_enabled INTO v_conv_ai_enabled
  FROM public.conversations c
  WHERE c.customer_phone = p_phone
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_conv_ai_enabled IS NULL THEN
    RETURN QUERY SELECT false, 'conversation_not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF NOT v_conv_ai_enabled THEN
    RETURN QUERY SELECT false, 'conversation_ai_disabled'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- 2. Policy phone especifica
  SELECT * INTO v_phone_policy
  FROM public.agent_policies
  WHERE channel = 'whatsapp'
    AND scope = 'phone'
    AND target_phone = p_phone
    AND ai_disabled = true
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT false,
      ('phone_policy_disabled: ' || COALESCE(v_phone_policy.ai_disabled_reason, ''))::TEXT,
      v_phone_policy.id;
    RETURN;
  END IF;

  -- 3. Policy global
  SELECT * INTO v_global_policy
  FROM public.agent_policies
  WHERE channel = 'whatsapp'
    AND scope = 'global'
    AND ai_disabled = true
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT false,
      ('global_policy_disabled: ' || COALESCE(v_global_policy.ai_disabled_reason, ''))::TEXT,
      v_global_policy.id;
    RETURN;
  END IF;

  -- 4. Tudo OK
  RETURN QUERY SELECT true, 'ok'::TEXT, NULL::UUID;
END
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.is_agent_enabled IS
  'Checa kill switch (conversa + policy phone + policy global). Retorna allowed, reason e policy_id (se aplicavel). Usar antes de cada chamada LLM.';


-- =============================================================
-- 5. Realtime (opcional - War Room pode querer ver toggles)
-- =============================================================
-- supabase_realtime publication existe por default em todo projeto
-- Supabase. Se nao existir por algum motivo, ignorar com NOTICE.

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_policies;
  EXCEPTION WHEN undefined_object OR duplicate_object THEN
    RAISE NOTICE 'supabase_realtime publication nao disponivel ou tabela ja adicionada';
  END;
END
$$;