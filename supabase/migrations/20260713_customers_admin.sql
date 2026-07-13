-- Migration: gestão de clientes no painel admin
-- Adiciona bloqueio de cliente e notas internas de suporte.
--
-- Bloqueio: a coluna `blocked` espelha o estado para exibir/filtrar no admin.
-- O bloqueio de LOGIN em si é feito via Supabase Auth ban
-- (auth.admin.updateUserById com ban_duration), não por esta tabela.
--
-- Notas: log append-only, visível SÓ para admin (service_role). Cliente
-- nunca enxerga nota interna (sem policy para anon/authenticated).
--
-- Rodar no SQL Editor do Supabase (project Fragranciaria / gzxlupgdmrtkprwhiutp).

-- 1. Flags de bloqueio na tabela customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- 2. Notas internas de suporte
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  admin_email TEXT,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer_id
  ON public.customer_notes(customer_id);

-- 3. RLS: notas são admin-only (só service_role). Sem policy para
-- anon/authenticated — cliente nunca vê nota interna.
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.customer_notes TO service_role;
