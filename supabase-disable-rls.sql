-- =====================================================
-- FIX: Desabilitar RLS temporariamente para affiliates
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Opção 1: Desabilitar RLS completamente (mais simples para desenvolvimento)
ALTER TABLE affiliates DISABLE ROW LEVEL SECURITY;

-- Verificar
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'affiliates';
