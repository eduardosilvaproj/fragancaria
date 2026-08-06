-- =====================================================
-- Migration: admins.is_active
-- =====================================================
-- APLICAR pelo SQL Editor do Supabase antes de seguir com a tela /admin/usuarios.
--
-- ESCOPO
-- 1. Adiciona a coluna public.admins.is_active para desativar acesso sem
--    apagar a linha.
-- 2. Mantem auth.users e public.admins intactos: nunca remover linhas, porque
--    o log de auditoria referencia user_id e depende do historico.
--
-- OBS
-- - Nao altera roles nem policies aqui.
-- - Depois da aplicacao, o codigo deve passar a respeitar is_active no resolveAdmin.

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

GRANT ALL ON public.admins TO service_role;
