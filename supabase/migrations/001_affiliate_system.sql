-- =============================================
-- SISTEMA DE AFILIADOS - FRAGRANCIARIA
-- Migration 001: Estrutura inicial
-- =============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. CONFIGURAÇÕES GLOBAIS
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  default_commission_rate DECIMAL(5,4) DEFAULT 0.0800, -- 8% padrão
  cookie_duration_days INTEGER DEFAULT 30,
  min_payout_amount DECIMAL(10,2) DEFAULT 100.00,
  auto_approve_affiliates BOOLEAN DEFAULT false,
  payout_day INTEGER DEFAULT 15, -- Dia do mês para pagamentos
  terms_url TEXT,
  support_email TEXT DEFAULT 'afiliados@fragranciaria.com.br',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão
INSERT INTO affiliate_settings (id) VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- =============================================
-- 2. TIERS DE COMISSÃO (Metas Progressivas)
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  min_sales_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5,4) NOT NULL,
  color TEXT DEFAULT '#718096',
  icon TEXT DEFAULT '🏅',
  benefits JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir tiers padrão
INSERT INTO affiliate_tiers (name, slug, min_sales_amount, commission_rate, color, icon, benefits, sort_order) VALUES
  ('Bronze', 'bronze', 0, 0.0800, '#CD7F32', '🥉', '["Acesso ao portal", "Links ilimitados", "Relatórios básicos"]'::jsonb, 1),
  ('Prata', 'prata', 2000, 0.1000, '#C0C0C0', '🥈', '["Todos benefícios Bronze", "Badge exclusivo", "Suporte prioritário"]'::jsonb, 2),
  ('Ouro', 'ouro', 5000, 0.1200, '#FFD700', '🥇', '["Todos benefícios Prata", "Produtos para teste", "Materiais exclusivos"]'::jsonb, 3),
  ('Diamante', 'diamante', 15000, 0.1500, '#B9F2FF', '💎', '["Todos benefícios Ouro", "Comissão premium", "Gerente dedicado", "Bônus trimestral"]'::jsonb, 4)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 3. AFILIADOS
-- =============================================
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados pessoais
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  cpf TEXT UNIQUE,
  birth_date DATE,

  -- Endereço (opcional)
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- Dados bancários para pagamento
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random', 'cnpj')),
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  bank_account_type TEXT CHECK (bank_account_type IN ('corrente', 'poupanca')),

  -- Redes sociais (para divulgação)
  instagram TEXT,
  youtube TEXT,
  tiktok TEXT,
  website TEXT,

  -- Comissão
  custom_commission_rate DECIMAL(5,4), -- NULL = usa tier ou padrão
  current_tier_id UUID REFERENCES affiliate_tiers(id),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason TEXT,
  suspension_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,

  -- Código único do afiliado (para URLs)
  affiliate_code TEXT UNIQUE,

  -- Métricas (cache para performance)
  total_clicks INTEGER DEFAULT 0,
  total_sales_count INTEGER DEFAULT 0,
  total_sales_amount DECIMAL(12,2) DEFAULT 0,
  total_commission_earned DECIMAL(12,2) DEFAULT 0,
  total_commission_paid DECIMAL(12,2) DEFAULT 0,
  current_month_sales DECIMAL(12,2) DEFAULT 0,

  -- Termos
  accepted_terms BOOLEAN DEFAULT false,
  accepted_terms_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por código
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_email ON affiliates(email);

-- =============================================
-- 4. LINKS DE AFILIADO
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Produto (NULL = link geral da loja)
  product_id TEXT,
  product_name TEXT,
  product_image TEXT,
  product_price DECIMAL(10,2),

  -- Link
  code TEXT UNIQUE NOT NULL, -- Código curto único
  short_url TEXT, -- URL encurtada (se usar serviço)

  -- Métricas
  clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  total_sales_amount DECIMAL(12,2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  last_click_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_links_code ON affiliate_links(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate ON affiliate_links(affiliate_id);

-- =============================================
-- 5. CLIQUES (para analytics detalhado)
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Dados do visitante
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT, -- mobile, desktop, tablet

  -- Sessão
  session_id TEXT,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ,
  order_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link ON affiliate_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_session ON affiliate_clicks(session_id);

-- =============================================
-- 6. VENDAS ATRIBUÍDAS
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  click_id UUID REFERENCES affiliate_clicks(id) ON DELETE SET NULL,

  -- Dados do pedido (Shopify)
  order_id TEXT NOT NULL,
  order_number TEXT,
  order_date TIMESTAMPTZ,
  customer_email TEXT,
  customer_name TEXT,

  -- Valores
  order_subtotal DECIMAL(10,2) NOT NULL,
  order_shipping DECIMAL(10,2) DEFAULT 0,
  order_discount DECIMAL(10,2) DEFAULT 0,
  order_total DECIMAL(10,2) NOT NULL,

  -- Comissão
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  tier_at_sale TEXT, -- Nome do tier no momento da venda

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled', 'refunded')),
  status_reason TEXT,
  confirmed_at TIMESTAMPTZ,

  -- Pagamento
  payout_id UUID,
  paid_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_sales_affiliate ON affiliate_sales(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_order ON affiliate_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_status ON affiliate_sales(status);

-- =============================================
-- 7. PAGAMENTOS
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  -- Valores
  gross_amount DECIMAL(10,2) NOT NULL, -- Valor bruto
  fees DECIMAL(10,2) DEFAULT 0, -- Taxas (se houver)
  net_amount DECIMAL(10,2) NOT NULL, -- Valor líquido
  sales_count INTEGER DEFAULT 0,

  -- Período
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Pagamento
  payment_method TEXT CHECK (payment_method IN ('pix', 'transfer', 'other')),
  payment_reference TEXT, -- ID transação ou comprovante
  payment_proof_url TEXT, -- URL do comprovante

  -- Dados bancários no momento do pagamento (snapshot)
  pix_key_used TEXT,
  bank_info_used JSONB,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  status_reason TEXT,

  -- Processamento
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  paid_at TIMESTAMPTZ,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);

-- =============================================
-- 8. HISTÓRICO DE TIERS
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_tier_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  from_tier_id UUID REFERENCES affiliate_tiers(id),
  to_tier_id UUID REFERENCES affiliate_tiers(id),
  from_tier_name TEXT,
  to_tier_name TEXT,
  reason TEXT, -- 'monthly_recalc', 'manual_upgrade', 'manual_downgrade', 'initial'
  sales_amount DECIMAL(12,2), -- Vendas que geraram a mudança
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_history_affiliate ON affiliate_tier_history(affiliate_id);

-- =============================================
-- 9. NOTIFICAÇÕES DO AFILIADO
-- =============================================
CREATE TABLE IF NOT EXISTS affiliate_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,

  type TEXT NOT NULL, -- 'sale', 'payout', 'tier_change', 'approval', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,

  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_affiliate ON affiliate_notifications(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON affiliate_notifications(affiliate_id, is_read) WHERE is_read = false;

-- =============================================
-- 10. FUNÇÕES AUXILIARES
-- =============================================

-- Função para gerar código único de afiliado
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar código único de link
CREATE OR REPLACE FUNCTION generate_link_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar código de afiliado automaticamente
CREATE OR REPLACE FUNCTION set_affiliate_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.affiliate_code IS NULL THEN
    LOOP
      new_code := generate_affiliate_code();
      SELECT EXISTS(SELECT 1 FROM affiliates WHERE affiliate_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.affiliate_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_affiliate_code
  BEFORE INSERT ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION set_affiliate_code();

-- Trigger para gerar código de link automaticamente
CREATE OR REPLACE FUNCTION set_link_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.code IS NULL THEN
    LOOP
      new_code := generate_link_code();
      SELECT EXISTS(SELECT 1 FROM affiliate_links WHERE code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_link_code
  BEFORE INSERT ON affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION set_link_code();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_affiliates_updated_at
  BEFORE UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_affiliate_links_updated_at
  BEFORE UPDATE ON affiliate_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_affiliate_sales_updated_at
  BEFORE UPDATE ON affiliate_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_affiliate_payouts_updated_at
  BEFORE UPDATE ON affiliate_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 11. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_tier_history ENABLE ROW LEVEL SECURITY;

-- Políticas para afiliados (veem apenas seus próprios dados)
CREATE POLICY "Affiliates can view own data"
  ON affiliates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Affiliates can update own data"
  ON affiliates FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para links
CREATE POLICY "Affiliates can view own links"
  ON affiliate_links FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliates can create own links"
  ON affiliate_links FOR INSERT
  WITH CHECK (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliates can update own links"
  ON affiliate_links FOR UPDATE
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Políticas para vendas
CREATE POLICY "Affiliates can view own sales"
  ON affiliate_sales FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Políticas para pagamentos
CREATE POLICY "Affiliates can view own payouts"
  ON affiliate_payouts FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Políticas para notificações
CREATE POLICY "Affiliates can view own notifications"
  ON affiliate_notifications FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Affiliates can update own notifications"
  ON affiliate_notifications FOR UPDATE
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Políticas para configurações (público pode ver)
CREATE POLICY "Anyone can view settings"
  ON affiliate_settings FOR SELECT
  USING (true);

-- Políticas para tiers (público pode ver)
CREATE POLICY "Anyone can view tiers"
  ON affiliate_tiers FOR SELECT
  USING (true);

-- Políticas para histórico de tiers
CREATE POLICY "Affiliates can view own tier history"
  ON affiliate_tier_history FOR SELECT
  USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- =============================================
-- 12. VIEWS ÚTEIS
-- =============================================

-- View de resumo do afiliado
CREATE OR REPLACE VIEW affiliate_dashboard_summary AS
SELECT
  a.id,
  a.user_id,
  a.full_name,
  a.email,
  a.affiliate_code,
  a.status,
  t.name as tier_name,
  t.icon as tier_icon,
  t.color as tier_color,
  COALESCE(a.custom_commission_rate, t.commission_rate, 0.08) as current_commission_rate,
  a.total_clicks,
  a.total_sales_count,
  a.total_sales_amount,
  a.total_commission_earned,
  a.total_commission_paid,
  (a.total_commission_earned - a.total_commission_paid) as pending_commission,
  a.current_month_sales,
  (SELECT COUNT(*) FROM affiliate_links WHERE affiliate_id = a.id AND is_active = true) as active_links_count,
  (SELECT COUNT(*) FROM affiliate_sales WHERE affiliate_id = a.id AND status = 'pending') as pending_sales_count
FROM affiliates a
LEFT JOIN affiliate_tiers t ON a.current_tier_id = t.id;

-- View de vendas pendentes de confirmação
CREATE OR REPLACE VIEW pending_affiliate_sales AS
SELECT
  s.*,
  a.full_name as affiliate_name,
  a.email as affiliate_email,
  a.affiliate_code
FROM affiliate_sales s
JOIN affiliates a ON s.affiliate_id = a.id
WHERE s.status = 'pending'
ORDER BY s.created_at DESC;

-- View de afiliados pendentes de aprovação
CREATE OR REPLACE VIEW pending_affiliates AS
SELECT
  a.*,
  t.name as tier_name
FROM affiliates a
LEFT JOIN affiliate_tiers t ON a.current_tier_id = t.id
WHERE a.status = 'pending'
ORDER BY a.created_at DESC;

-- =============================================
-- FIM DA MIGRATION
-- =============================================
