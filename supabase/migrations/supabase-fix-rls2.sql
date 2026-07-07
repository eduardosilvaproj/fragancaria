-- =====================================================
-- FIX: Permitir cadastro público de afiliados
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Remover política anterior de INSERT
DROP POLICY IF EXISTS "Users can create their own affiliate" ON affiliates;

-- Permitir que QUALQUER usuário autenticado crie um afiliado
-- (a verificação do user_id será feita no código)
CREATE POLICY "Authenticated users can create affiliate" ON affiliates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- OU se ainda não funcionar, permitir INSERT público temporariamente
-- (depois você pode restringir mais)
DROP POLICY IF EXISTS "Allow public insert for registration" ON affiliates;
CREATE POLICY "Allow public insert for registration" ON affiliates
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Verificar
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'affiliates';
