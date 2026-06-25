-- =====================================================
-- FIX: Configurar Row Level Security (RLS)
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Habilitar RLS nas tabelas (se não estiver)
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_tiers ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS PARA AFFILIATES
-- =====================================================

-- Permitir que usuários autenticados criem seu próprio registro de afiliado
DROP POLICY IF EXISTS "Users can create their own affiliate" ON affiliates;
CREATE POLICY "Users can create their own affiliate" ON affiliates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Permitir que afiliados vejam apenas seus próprios dados
DROP POLICY IF EXISTS "Users can view their own affiliate" ON affiliates;
CREATE POLICY "Users can view their own affiliate" ON affiliates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Permitir que afiliados atualizem seus próprios dados
DROP POLICY IF EXISTS "Users can update their own affiliate" ON affiliates;
CREATE POLICY "Users can update their own affiliate" ON affiliates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. POLÍTICAS PARA AFFILIATE_LINKS
-- =====================================================

-- Afiliados podem criar seus próprios links
DROP POLICY IF EXISTS "Affiliates can create their own links" ON affiliate_links;
CREATE POLICY "Affiliates can create their own links" ON affiliate_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Afiliados podem ver seus próprios links
DROP POLICY IF EXISTS "Affiliates can view their own links" ON affiliate_links;
CREATE POLICY "Affiliates can view their own links" ON affiliate_links
  FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Afiliados podem atualizar seus próprios links
DROP POLICY IF EXISTS "Affiliates can update their own links" ON affiliate_links;
CREATE POLICY "Affiliates can update their own links" ON affiliate_links
  FOR UPDATE
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Links podem ser lidos publicamente (para rastreamento)
DROP POLICY IF EXISTS "Public can read active links" ON affiliate_links;
CREATE POLICY "Public can read active links" ON affiliate_links
  FOR SELECT
  TO anon
  USING (is_active = true);

-- 4. POLÍTICAS PARA AFFILIATE_SALES
-- =====================================================

-- Afiliados podem ver suas próprias vendas
DROP POLICY IF EXISTS "Affiliates can view their own sales" ON affiliate_sales;
CREATE POLICY "Affiliates can view their own sales" ON affiliate_sales
  FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- 5. POLÍTICAS PARA AFFILIATE_PAYOUTS
-- =====================================================

-- Afiliados podem ver seus próprios pagamentos
DROP POLICY IF EXISTS "Affiliates can view their own payouts" ON affiliate_payouts;
CREATE POLICY "Affiliates can view their own payouts" ON affiliate_payouts
  FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- 6. POLÍTICAS PARA AFFILIATE_NOTIFICATIONS
-- =====================================================

-- Afiliados podem ver suas próprias notificações
DROP POLICY IF EXISTS "Affiliates can view their own notifications" ON affiliate_notifications;
CREATE POLICY "Affiliates can view their own notifications" ON affiliate_notifications
  FOR SELECT
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Afiliados podem atualizar suas notificações (marcar como lida)
DROP POLICY IF EXISTS "Affiliates can update their own notifications" ON affiliate_notifications;
CREATE POLICY "Affiliates can update their own notifications" ON affiliate_notifications
  FOR UPDATE
  TO authenticated
  USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- 7. POLÍTICAS PARA AFFILIATE_TIERS (público)
-- =====================================================

-- Todos podem ver os tiers (são públicos)
DROP POLICY IF EXISTS "Anyone can view tiers" ON affiliate_tiers;
CREATE POLICY "Anyone can view tiers" ON affiliate_tiers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 8. Verificar políticas criadas
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename LIKE 'affiliate%'
ORDER BY tablename, policyname;
