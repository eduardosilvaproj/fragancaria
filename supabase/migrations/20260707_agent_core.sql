-- =============================================================
-- Migration: Agente de Vendas — Core (sessão + eventos)
-- =============================================================
-- Contexto:
--   Esta migration cria o esqueleto do agente IA de vendas WhatsApp.
--   • agent_sessions: 1 linha por turno de conversa (buffer deslizante
--     + lock pessimista via FOR UPDATE SKIP LOCKED).
--   • agent_events: log imutável para War Room, auditoria e métricas.
--   • agent_decisions: desfecho por turno (sold/assisted/escalated/...).
--
--   Toda leitura/escrita via supabaseAdmin (bypass RLS). Sem policy pública.
--   Realtime ligado via publication supabase_realtime (testado manualmente
--   antes de fechar este bloco — vide README_AGENT.md).
--
--   Idempotente. CREATE TABLE / INDEX ... IF NOT EXISTS.
-- =============================================================

-- =============================================================
-- agent_sessions: estado de um turno da IA
-- =============================================================
-- Uma sessão = um turno lógico do agente. Caracterizado por:
--   • buffer_until  = now() + 4s, atualizado a cada mensagem nova (deslizante)
--   • buffer_started_at = primeira mensagem da janela (teto 12s absolutos)
--   • state = pending → processing → done|failed|escalated
--   • attempts = retry counter (max 3 antes de escalonar)
--   • locked_until + processing_started_at = janela de lock pessimista
--
-- O worker (agent-service) seleciona buffers expirados com:
--   SELECT ... FROM agent_sessions
--   WHERE state = 'pending' AND buffer_until < now()
--   ORDER BY buffer_until ASC
--   FOR UPDATE SKIP LOCKED;
-- E marca processing_started_at = now() no mesmo UPDATE.
--
-- O índice único parcial garante 1 sessão ativa por conversa.
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Âncora
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp','instagram','email','web')),

  -- Estado
  state TEXT NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','processing','done','failed','escalated')),
  failure_reason TEXT,
  attempts INT NOT NULL DEFAULT 0,

  -- Buffer deslizante (4s) + teto (12s)
  buffer_until TIMESTAMPTZ NOT NULL,
  buffer_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_processed_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  -- Lock pessimista
  processing_started_at TIMESTAMPTZ,
  processing_lock_token UUID,

  -- Rastreabilidade do Claude
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  agent_run_id TEXT,
  model TEXT DEFAULT 'claude-sonnet-4-6',

  -- Custódia
  prompt_tokens INT,
  completion_tokens INT,
  cached_tokens INT DEFAULT 0,

  CONSTRAINT buffer_coherent CHECK (buffer_until >= buffer_started_at),
  CONSTRAINT processing_locked CHECK (
    (state = 'processing') = (processing_started_at IS NOT NULL)
  )
);

-- 1 sessão ativa por conversa (pending ou processing).
-- Quando termina, novo INSERT na próxima leva.
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_sessions_active
  ON public.agent_sessions(conversation_id)
  WHERE state IN ('pending','processing');

-- Index de varredura do worker.
CREATE INDEX IF NOT EXISTS idx_agent_sessions_buffer_due
  ON public.agent_sessions(buffer_until)
  WHERE state = 'pending';

-- Para detectar travas de processamento (monitoração).
CREATE INDEX IF NOT EXISTS idx_agent_sessions_processing_stuck
  ON public.agent_sessions(processing_started_at)
  WHERE state = 'processing';

-- Histórico por conversa (para debug e re-processamento).
CREATE INDEX IF NOT EXISTS idx_agent_sessions_conv_history
  ON public.agent_sessions(conversation_id, started_at DESC);


-- =============================================================
-- agent_events: log de eventos de um turno (tool_call, message_sent...)
-- =============================================================
-- Cada chamada de tool, cada resposta enviada, cada erro, cada escalação
-- vira uma linha. payload é JSONB mas SEMPRE mascarar PII (message_content
-- do cliente NÃO vai em payload — id da mensagem e tamanho sim).
-- =============================================================

CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Âncora
  agent_session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'tool_call',
    'tool_result',
    'message_sent',
    'escalation',
    'kill_switch',
    'error',
    'state_change'
  )),

  -- Conteúdo estruturado (tool_name, args_hash, latency_ms, etc)
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Quem agiu
  actor_admin_id UUID,  -- humano se intervención manual
  actor_type TEXT NOT NULL DEFAULT 'agent'
    CHECK (actor_type IN ('agent','admin','system','customer')),

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_session
  ON public.agent_events(agent_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_events_conv
  ON public.agent_events(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_events_type
  ON public.agent_events(event_type, created_at DESC);


-- =============================================================
-- agent_decisions: desfecho por turno (1 linha quando state vira done/failed/escalated)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_session_id UUID NOT NULL UNIQUE REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,

  outcome TEXT NOT NULL CHECK (outcome IN (
    'sold',           -- converteu em pedido (orders.id vinculado)
    'assisted',       -- respondeu mas não fechou
    'escalated',      -- passado para humano
    'abandoned',      -- cliente sumiu
    'technical_error' -- erro de tool / Claude
  )),

  -- Vínculo com venda (preenchido quando outcome='sold')
  order_id UUID REFERENCES public.orders(id),
  agent_cart_id UUID,

  -- Métricas úteis
  total_tool_calls INT NOT NULL DEFAULT 0,
  final_message_chars INT,

  reason TEXT,  -- 'pix_gerado', 'cliente_pediu_humano', 'tool_failed_3x', etc

  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_outcome
  ON public.agent_decisions(outcome, decided_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_conv
  ON public.agent_decisions(conversation_id, decided_at DESC);


-- =============================================================
-- Permissões + RLS
-- =============================================================

GRANT ALL ON public.agent_sessions    TO service_role;
GRANT ALL ON public.agent_events      TO service_role;
GRANT ALL ON public.agent_decisions   TO service_role;

ALTER TABLE public.agent_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_decisions   ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- Realtime: adicionar tabelas à publication
-- =============================================================
-- Supabase Realtime exige que tabelas estejam na publication 'supabase_realtime'.
-- O nome da publication pode variar por projeto — checar com:
--   SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
-- Se não existir, criar com o snippet abaixo (idempotente).
-- =============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE
      public.conversations,
      public.messages,
      public.agent_sessions,
      public.agent_events,
      public.agent_decisions;
  ELSE
    -- Adiciona apenas as que faltam (idempotente)
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_sessions;
    EXCEPTION WHEN duplicate_object THEN
      -- já está na publication
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_decisions;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END
$$;


-- =============================================================
-- View útil para War Room (combina sessão ativa + última decisão)
-- =============================================================

CREATE OR REPLACE VIEW public.v_agent_sessions_active AS
SELECT
  s.id,
  s.conversation_id,
  c.customer_phone,
  c.customer_name,
  c.channel,
  c.status AS conversation_status,
  s.state,
  s.buffer_until,
  s.attempts,
  s.started_at,
  s.finished_at,
  s.processing_started_at,
  s.agent_run_id,
  s.failure_reason,
  -- Métrica de saúde: se está em processing há muito tempo, marcar travado
  CASE
    WHEN s.state = 'processing'
         AND s.processing_started_at < now() - INTERVAL '30 seconds'
    THEN true
    ELSE false
  END AS is_stuck,
  EXTRACT(EPOCH FROM (now() - s.started_at))::int AS age_seconds,
  d.outcome,
  d.order_id,
  d.reason AS decision_reason
FROM public.agent_sessions s
JOIN public.conversations c ON c.id = s.conversation_id
LEFT JOIN public.agent_decisions d ON d.agent_session_id = s.id
WHERE s.state IN ('pending','processing');

COMMENT ON TABLE public.agent_sessions IS
  'Estado de um turno do agente IA. Pendente/processando/done/failed/escalated.';
COMMENT ON TABLE public.agent_events IS
  'Log de eventos por turno (tool_call, message_sent, escalação, erro). Sem PII.';
COMMENT ON TABLE public.agent_decisions IS
  'Desfecho por turno: sold/assisted/escalated/abandoned/technical_error.';
COMMENT ON VIEW public.v_agent_sessions_active IS
  'Sessões ativas (pending+processing) com flag de travamento.';
