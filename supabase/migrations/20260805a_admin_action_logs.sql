-- =====================================================
-- Migration: admin_action_logs + admins.role
-- =====================================================
-- APLICAR pelo SQL Editor do Supabase quando este commit for mergeado.
--
-- ESCOPO
-- 1. Cria a tabela public.admin_action_logs, imutavel, com snapshots
--    before/after das mutacoes administrativas. RLS ligada, zero policies,
--    acesso exclusivo via service_role (supabaseAdmin).
-- 2. Adiciona coluna `role` em public.admins (sem uso imediato — sera usada
--    quando o time crescer e houver quem restringir).
--
-- POR QUE SEM POLICIES
-- Log de auditoria acessivel pelo cliente e pior que nao ter log. RLS ativada
-- sem policies garante que nem anon nem authenticated leem/escrevem.
--
-- POR QUE entity_id COMO TEXT
-- As PKs do sistema sao mistas: products.id e TEXT (SKU), orders.id e UUID,
-- affiliates.id e UUID. TEXT aceita todos sem cast.
--
-- POR QUE user_id REFERENCIANDO auth.users
-- Identificador estavel. Se o admin trocar de e-mail, o historico de auditoria
-- continua integro. O campo email em admins e mutavel; user_id nao.
--
-- POR QUE before_data/after_data COMO JSONB
-- Permite armazenar snapshots parciais ou completos das entidades alteradas.
-- Para tabelas de configuracao sensivel (payment/nfe) os valores nao serao
-- gravados — apenas a lista de campos alterados.
-- =====================================================

-- -------------------------------------------------------------------------
-- 1. Tabela de auditoria de acoes administrativas
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  before_data JSONB,
  after_data  JSONB,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice leve para consultas comuns de auditoria (quem fez o que em qual entidade).
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_user_id
  ON public.admin_action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_entity
  ON public.admin_action_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at
  ON public.admin_action_logs(created_at DESC);

-- RLS ligada, zero policies: so service_role acessa.
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Grant exclusivo ao service role (supabaseAdmin).
GRANT ALL ON public.admin_action_logs TO service_role;
GRANT ALL ON SEQUENCE public.admin_action_logs_id_seq TO service_role;

-- -------------------------------------------------------------------------
-- 2. Role em admins (criada agora, sem uso nesta rodada)
-- -------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admins'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.admins
      ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'
      CHECK (role IN ('superadmin', 'admin', 'support'));
  END IF;
END $$;

GRANT ALL ON public.admins TO service_role;
