-- =====================================================
-- FRAGRANCIARIA - Sistema de Afiliados
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. TABELA DE TIERS (Níveis de comissão)
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  commission_rate DECIMAL(5,4) NOT NULL, -- Ex: 0.08 = 8%
  min_sales_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  icon VARCHAR(10) DEFAULT '🥉',
  color VARCHAR(20) DEFAULT '#CD7F32',
  benefits TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir tiers padrão
INSERT INTO affiliate_tiers (name, commission_rate, min_sales_amount, icon, color, benefits) VALUES
  ('Bronze', 0.08, 0, '🥉', '#CD7F32', ARRAY['8% de comissão', 'Acesso ao portal', 'Links ilimitados']),
  ('Prata', 0.10, 5000, '🥈', '#C0C0C0', ARRAY['10% de comissão', 'Suporte prioritário', 'Materiais exclusivos']),
  ('Ouro', 0.12, 15000, '🥇', '#FFD700', ARRAY['12% de comissão', 'Bônus trimestral', 'Produtos para teste']),
  ('Diamante', 0.15, 50000, '💎', '#B9F2FF', ARRAY['15% de comissão', 'Gerente dedicado', 'Eventos VIP'])
ON CONFLICT (name) DO NOTHING;

-- 2. TABELA DE AFILIADOS
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados pessoais
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  cpf VARCHAR(14),

  -- Redes sociais
  instagram VARCHAR(100),
  youtube VARCHAR(255),
  tiktok VARCHAR(100),
  website VARCHAR(255),

  -- Dados bancários (Pix)
  pix_key VARCHAR(255),
  pix_key_type VARCHAR(20) CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random', 'cnpj')),

  -- Código único do afiliado
  affiliate_code VARCHAR(20) NOT NULL UNIQUE,

  -- Tier e status
  tier_id UUID REFERENCES affiliate_tiers(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'rejected')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,

  -- Termos
  accepted_terms BOOLEAN DEFAULT FALSE,
  accepted_terms_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);

-- 3. TABELA DE LINKS DE AFILIADO
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Identificador único do link
  code VARCHAR(30) NOT NULL UNIQUE,

  -- Produto específico (opcional)
  product_id VARCHAR(100),
  product_name VARCHAR(255),
  product_image VARCHAR(500),
  product_price DECIMAL(10,2),

  -- Métricas
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate ON affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product ON affiliate_links(product_id);

-- 4. TABELA DE VENDAS
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,

  -- Dados do pedido Shopify
  shopify_order_id VARCHAR(100),
  order_number VARCHAR(50),
  order_total DECIMAL(10,2) NOT NULL,

  -- Comissão
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,

  -- Status: pending (aguardando), confirmed (pago pelo cliente), paid (comissão paga), cancelled
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),

  -- Referência ao pagamento
  payout_id UUID,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate ON affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_created ON affiliate_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_order ON affiliate_sales(shopify_order_id);

-- 5. TABELA DE PAGAMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Valor e período
  amount DECIMAL(10,2) NOT NULL,
  period_start DATE,
  period_end DATE,

  -- Status: pending, processing, paid, failed
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),

  -- Dados do pagamento
  pix_key VARCHAR(255),
  pix_key_type VARCHAR(20),
  transaction_id VARCHAR(100),

  -- Notas
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);

-- 6. TABELA DE NOTIFICAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS affiliate_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL, -- sale, payout, tier_upgrade, announcement
  title VARCHAR(255) NOT NULL,
  message TEXT,

  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Dados extras (JSON)
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliate_notifications_affiliate ON affiliate_notifications(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_notifications_read ON affiliate_notifications(is_read);

-- 7. FUNÇÃO PARA GERAR CÓDIGO DE AFILIADO
-- =====================================================
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código: 3 letras + 4 números
    new_code := UPPER(
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      CHR(65 + FLOOR(RANDOM() * 26)::INT) ||
      LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
    );

    -- Verificar se já existe
    SELECT EXISTS(SELECT 1 FROM affiliates WHERE affiliate_code = new_code) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 8. TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_affiliates_updated_at ON affiliates;
CREATE TRIGGER trigger_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_tiers ENABLE ROW LEVEL SECURITY;

-- Tiers: Leitura pública
DROP POLICY IF EXISTS "Tiers são públicos" ON affiliate_tiers;
CREATE POLICY "Tiers são públicos" ON affiliate_tiers
  FOR SELECT USING (true);

-- Affiliates: Usuário vê apenas seu próprio registro
DROP POLICY IF EXISTS "Afiliados veem apenas seu registro" ON affiliates;
CREATE POLICY "Afiliados veem apenas seu registro" ON affiliates
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Afiliados podem atualizar seu registro" ON affiliates;
CREATE POLICY "Afiliados podem atualizar seu registro" ON affiliates
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Qualquer um pode criar afiliado" ON affiliates;
CREATE POLICY "Qualquer um pode criar afiliado" ON affiliates
  FOR INSERT WITH CHECK (true);

-- Links: Afiliado vê apenas seus links
DROP POLICY IF EXISTS "Afiliados veem apenas seus links" ON affiliate_links;
CREATE POLICY "Afiliados veem apenas seus links" ON affiliate_links
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Afiliados podem criar links" ON affiliate_links;
CREATE POLICY "Afiliados podem criar links" ON affiliate_links
  FOR INSERT WITH CHECK (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Links podem ser lidos por código" ON affiliate_links;
CREATE POLICY "Links podem ser lidos por código" ON affiliate_links
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Links podem ser atualizados" ON affiliate_links;
CREATE POLICY "Links podem ser atualizados" ON affiliate_links
  FOR UPDATE USING (true);

-- Sales: Afiliado vê apenas suas vendas
DROP POLICY IF EXISTS "Afiliados veem apenas suas vendas" ON affiliate_sales;
CREATE POLICY "Afiliados veem apenas suas vendas" ON affiliate_sales
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Sistema pode criar vendas" ON affiliate_sales;
CREATE POLICY "Sistema pode criar vendas" ON affiliate_sales
  FOR INSERT WITH CHECK (true);

-- Payouts: Afiliado vê apenas seus pagamentos
DROP POLICY IF EXISTS "Afiliados veem apenas seus pagamentos" ON affiliate_payouts;
CREATE POLICY "Afiliados veem apenas seus pagamentos" ON affiliate_payouts
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- Notifications: Afiliado vê apenas suas notificações
DROP POLICY IF EXISTS "Afiliados veem apenas suas notificações" ON affiliate_notifications;
CREATE POLICY "Afiliados veem apenas suas notificações" ON affiliate_notifications
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Afiliados podem marcar notificações como lidas" ON affiliate_notifications;
CREATE POLICY "Afiliados podem marcar notificações como lidas" ON affiliate_notifications
  FOR UPDATE USING (
    affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid())
  );

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================

-- Verificar se tudo foi criado
SELECT
  'affiliate_tiers' as tabela, COUNT(*) as registros FROM affiliate_tiers
UNION ALL
SELECT 'affiliates', COUNT(*) FROM affiliates
UNION ALL
SELECT 'affiliate_links', COUNT(*) FROM affiliate_links
UNION ALL
SELECT 'affiliate_sales', COUNT(*) FROM affiliate_sales
UNION ALL
SELECT 'affiliate_payouts', COUNT(*) FROM affiliate_payouts
UNION ALL
SELECT 'affiliate_notifications', COUNT(*) FROM affiliate_notifications;
