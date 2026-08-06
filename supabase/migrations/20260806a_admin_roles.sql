-- =====================================================
-- Migration: correcao do CHECK de admins.role
-- =====================================================
-- APLICAR pelo SQL Editor do Supabase quando este commit for mergeado.
--
-- ESCOPO
-- 1. Corrige o CHECK da coluna admins.role: os valores eram
--    ('superadmin','admin','support'), que nao correspondem a realidade.
--    Os papeis reais sao 'total' (3 socios), 'social' (redes sociais) e
--    'logistica' (envios/etiquetas).
-- 2. Migra todas as linhas existentes para 'total' — quem ja tem acesso
--    hoje sao os 3 socios com acesso total.
--
-- NAO deleta nada de auth.users; apenas ajusta o enum de papel.

ALTER TABLE public.admins
  DROP CONSTRAINT IF EXISTS admins_role_check;

UPDATE public.admins SET role = 'total' WHERE role IS NULL OR role NOT IN ('total','social','logistica');

ALTER TABLE public.admins
  ADD CONSTRAINT admins_role_check
  CHECK (role IN ('total', 'social', 'logistica'));

GRANT ALL ON public.admins TO service_role;
