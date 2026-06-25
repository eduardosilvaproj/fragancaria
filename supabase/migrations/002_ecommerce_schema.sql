-- =====================================================
-- FRAGRANCIARIA E-COMMERCE SCHEMA
-- Migration 002 - Sistema completo de e-commerce
-- =====================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELAS DE CATÁLOGO
-- =====================================================

-- Marcas
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias (hierárquicas)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  description TEXT,
  short_description VARCHAR(500),

  -- Preços
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2), -- Preço "de"
  cost_price DECIMAL(10,2), -- Custo para cálculo de margem

  -- Estoque
  stock_quantity INTEGER DEFAULT 0,
  stock_status VARCHAR(50) DEFAULT 'in_stock', -- in_stock, out_of_stock, backorder
  low_stock_threshold INTEGER DEFAULT 5,
  track_inventory BOOLEAN DEFAULT true,

  -- Relacionamentos
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- SEO
  meta_title VARCHAR(255),
  meta_description TEXT,

  -- Dimensões para frete
  weight_grams INTEGER, -- Peso em gramas
  height_cm DECIMAL(8,2),
  width_cm DECIMAL(8,2),
  length_cm DECIMAL(8,2),

  -- Configurações
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_digital BOOLEAN DEFAULT false,

  -- Tags para busca
  tags TEXT[], -- Array de tags

  -- Integrações externas
  external_id VARCHAR(255), -- ID em sistemas externos (Stovix, ML, etc)
  external_source VARCHAR(100), -- Origem: 'stovix', 'mercadolivre', 'manual'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variantes de produto (tamanho, cor, etc)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL, -- Ex: "500ml", "Loiro Claro"

  -- Preços (se diferente do produto principal)
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),

  -- Estoque
  stock_quantity INTEGER DEFAULT 0,

  -- Atributos
  option_name VARCHAR(100), -- Ex: "Tamanho", "Cor"
  option_value VARCHAR(255), -- Ex: "500ml", "Loiro"

  -- Dimensões (se diferente)
  weight_grams INTEGER,

  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Imagens de produto
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE CLIENTES
-- =====================================================

-- Clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Auth (pode vincular ao Supabase Auth)
  auth_user_id UUID UNIQUE, -- Link com auth.users se usar Supabase Auth
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Se não usar Supabase Auth

  -- Dados pessoais
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  cpf VARCHAR(14) UNIQUE,
  birth_date DATE,

  -- Marketing
  accepts_marketing BOOLEAN DEFAULT false,

  -- Métricas
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,

  -- Loyalty
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, diamond

  -- Afiliado (se for)
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  referred_by_affiliate UUID REFERENCES affiliates(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Endereços
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  label VARCHAR(50) DEFAULT 'Casa', -- Casa, Trabalho, etc
  recipient_name VARCHAR(200),

  -- Endereço
  street VARCHAR(255) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(100),
  neighborhood VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  postal_code VARCHAR(9) NOT NULL,
  country VARCHAR(2) DEFAULT 'BR',

  -- Flags
  is_default_shipping BOOLEAN DEFAULT false,
  is_default_billing BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE PEDIDOS
-- =====================================================

-- Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number SERIAL UNIQUE, -- Número sequencial legível

  -- Cliente
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(200) NOT NULL,
  customer_phone VARCHAR(20),
  customer_cpf VARCHAR(14),

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, payment_pending, paid, processing, shipped, delivered, cancelled, refunded

  payment_status VARCHAR(50) DEFAULT 'pending',
  -- pending, processing, paid, failed, refunded, partially_refunded

  fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
  -- unfulfilled, partial, fulfilled

  -- Valores
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Cupom
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  coupon_code VARCHAR(50),

  -- Afiliado
  affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  affiliate_commission DECIMAL(10,2) DEFAULT 0,

  -- Endereço de entrega (snapshot)
  shipping_address JSONB NOT NULL,
  billing_address JSONB,

  -- Pagamento
  payment_method VARCHAR(50), -- pix, credit_card, boleto
  payment_gateway VARCHAR(50) DEFAULT 'mercadopago',
  payment_id VARCHAR(255), -- ID no gateway
  payment_details JSONB, -- Detalhes adicionais
  paid_at TIMESTAMPTZ,

  -- Envio
  shipping_method VARCHAR(100),
  shipping_carrier VARCHAR(100), -- Correios, Jadlog, etc
  tracking_code VARCHAR(100),
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Envio Fácil
  envio_facil_quote_id VARCHAR(255),
  envio_facil_order_id VARCHAR(255),
  shipping_label_url TEXT,

  -- Notas
  customer_notes TEXT,
  internal_notes TEXT,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT
);

-- Itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Produto (snapshot no momento da compra)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,

  sku VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  variant_name VARCHAR(255),
  image_url TEXT,

  -- Valores
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  -- Dimensões para frete
  weight_grams INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Histórico de status do pedido
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_by VARCHAR(100), -- admin, system, customer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE CUPONS E PROMOÇÕES
-- =====================================================

-- Cupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,

  -- Tipo de desconto
  discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount, free_shipping
  discount_value DECIMAL(10,2) NOT NULL, -- Valor ou percentual

  -- Limites
  minimum_order_value DECIMAL(10,2),
  maximum_discount DECIMAL(10,2), -- Teto para descontos percentuais

  -- Uso
  usage_limit INTEGER, -- NULL = ilimitado
  usage_count INTEGER DEFAULT 0,
  usage_limit_per_customer INTEGER DEFAULT 1,

  -- Restrições
  applies_to_products UUID[], -- NULL = todos
  applies_to_categories UUID[], -- NULL = todas
  applies_to_brands UUID[], -- NULL = todas
  excluded_products UUID[],

  -- Clientes específicos
  customer_ids UUID[], -- NULL = todos
  first_purchase_only BOOLEAN DEFAULT false,

  -- Validade
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uso de cupons (para controle por cliente)
CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_email VARCHAR(255),
  discount_applied DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE FRETE
-- =====================================================

-- Cotações de frete (cache)
CREATE TABLE IF NOT EXISTS shipping_quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificação
  session_id VARCHAR(255), -- Para visitantes não logados
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  -- Origem/Destino
  origin_postal_code VARCHAR(9) NOT NULL,
  destination_postal_code VARCHAR(9) NOT NULL,

  -- Dimensões totais
  total_weight_grams INTEGER NOT NULL,
  total_height_cm DECIMAL(8,2),
  total_width_cm DECIMAL(8,2),
  total_length_cm DECIMAL(8,2),

  -- Resposta da API
  quotes JSONB NOT NULL, -- Array com todas as opções de frete

  -- Cache
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE ESTOQUE
-- =====================================================

-- Log de movimentação de estoque
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,

  -- Movimentação
  quantity_change INTEGER NOT NULL, -- Positivo = entrada, Negativo = saída
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,

  -- Motivo
  movement_type VARCHAR(50) NOT NULL,
  -- sale, return, adjustment, restock, damage, transfer

  -- Referência
  reference_type VARCHAR(50), -- order, manual, import
  reference_id UUID,

  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE PAGAMENTO
-- =====================================================

-- Transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Gateway
  gateway VARCHAR(50) NOT NULL, -- mercadopago
  gateway_transaction_id VARCHAR(255),
  gateway_status VARCHAR(50),

  -- Valores
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'BRL',

  -- Tipo
  transaction_type VARCHAR(50) NOT NULL, -- payment, refund
  payment_method VARCHAR(50), -- pix, credit_card, boleto

  -- Detalhes
  installments INTEGER DEFAULT 1,
  card_brand VARCHAR(50),
  card_last_four VARCHAR(4),
  pix_qr_code TEXT,
  pix_qr_code_base64 TEXT,
  boleto_url TEXT,
  boleto_barcode VARCHAR(100),

  -- Status
  status VARCHAR(50) NOT NULL, -- pending, processing, approved, rejected, refunded

  -- Resposta do gateway
  gateway_response JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABELAS DE REVIEWS
-- =====================================================

-- Reviews de produtos
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  -- Review
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,

  -- Mídia
  images TEXT[], -- URLs das imagens

  -- Verificação
  is_verified_purchase BOOLEAN DEFAULT false,

  -- Moderação
  status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
  moderated_at TIMESTAMPTZ,
  moderated_by VARCHAR(100),
  rejection_reason TEXT,

  -- Utilidade
  helpful_count INTEGER DEFAULT 0,

  -- Resposta da loja
  store_reply TEXT,
  store_reply_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Produtos
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_status);
CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_products_external ON products(external_source, external_id);

-- Variantes
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

-- Imagens
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;

-- Clientes
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON customers(cpf);
CREATE INDEX IF NOT EXISTS idx_customers_auth ON customers(auth_user_id);

-- Endereços
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customer_id);

-- Pedidos
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(affiliate_id);

-- Itens do pedido
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Cupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active, starts_at, expires_at);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON product_reviews(product_id, rating);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em todas as tabelas relevantes
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
      'brands', 'categories', 'products', 'product_variants',
      'customers', 'addresses', 'orders', 'coupons',
      'payment_transactions', 'product_reviews'
    )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END;
$$;

-- =====================================================
-- TRIGGER PARA ATUALIZAR ESTOQUE
-- =====================================================

CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar estoque do produto ou variante
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock_quantity = NEW.quantity_after
    WHERE id = NEW.variant_id;
  ELSE
    UPDATE products
    SET stock_quantity = NEW.quantity_after,
        stock_status = CASE
          WHEN NEW.quantity_after <= 0 THEN 'out_of_stock'
          WHEN NEW.quantity_after <= (SELECT low_stock_threshold FROM products WHERE id = NEW.product_id) THEN 'low_stock'
          ELSE 'in_stock'
        END
    WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_stock
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- =====================================================
-- TRIGGER PARA ATUALIZAR MÉTRICAS DO CLIENTE
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    UPDATE customers
    SET
      total_orders = total_orders + 1,
      total_spent = total_spent + NEW.total
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_customer_metrics
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_metrics();

-- =====================================================
-- TRIGGER PARA INCREMENTAR USO DE CUPOM
-- =====================================================

CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coupon_id IS NOT NULL THEN
    UPDATE coupons
    SET usage_count = usage_count + 1
    WHERE id = NEW.coupon_id;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_increment_coupon
  AFTER INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.coupon_id IS NOT NULL)
  EXECUTE FUNCTION increment_coupon_usage();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em tabelas sensíveis
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes (acessam apenas seus próprios dados)
CREATE POLICY "Customers can view own data" ON customers
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Customers can update own data" ON customers
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Customers can view own addresses" ON addresses
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can view own orders" ON orders
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Customers can view own order items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- Políticas públicas (leitura para todos)
CREATE POLICY "Anyone can view active products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active categories" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view brands" ON brands
  FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view approved reviews" ON product_reviews
  FOR SELECT USING (status = 'approved');

-- Habilitar RLS nas tabelas públicas também
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product variants" ON product_variants
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE is_active = true)
  );

CREATE POLICY "Anyone can view product images" ON product_images
  FOR SELECT USING (
    product_id IN (SELECT id FROM products WHERE is_active = true)
  );

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Cupom de boas-vindas
INSERT INTO coupons (code, description, discount_type, discount_value, first_purchase_only, is_active)
VALUES ('BEMVINDO10', 'Desconto de 10% na primeira compra', 'percentage', 10, true, true)
ON CONFLICT (code) DO NOTHING;

-- Categorias principais
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Tratamentos', 'tratamentos', 1),
  ('Coloração', 'coloracao', 2),
  ('Finalizadores', 'finalizadores', 3),
  ('Shampoos', 'shampoos', 4),
  ('Condicionadores', 'condicionadores', 5),
  ('Máscaras', 'mascaras', 6),
  ('Kits', 'kits', 7)
ON CONFLICT (slug) DO NOTHING;

-- Marcas principais
INSERT INTO brands (name, slug) VALUES
  ('L''Oréal Professionnel', 'loreal-professionnel'),
  ('Kérastase', 'kerastase'),
  ('Wella Professionals', 'wella'),
  ('Schwarzkopf', 'schwarzkopf'),
  ('Keune', 'keune'),
  ('Alfaparf Milano', 'alfaparf'),
  ('Cadiveu', 'cadiveu'),
  ('Sebastian', 'sebastian'),
  ('Itallian Color', 'itallian')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION generate_unique_slug(base_slug TEXT, table_name TEXT)
RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  new_slug := base_slug;

  LOOP
    EXECUTE format('SELECT 1 FROM %I WHERE slug = $1', table_name)
    USING new_slug;

    IF NOT FOUND THEN
      RETURN new_slug;
    END IF;

    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular média de reviews
CREATE OR REPLACE FUNCTION get_product_rating(p_product_id UUID)
RETURNS TABLE(average_rating DECIMAL, review_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG(rating)::DECIMAL(3,2), 0) as average_rating,
    COUNT(*)::INTEGER as review_count
  FROM product_reviews
  WHERE product_id = p_product_id AND status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- Função para verificar estoque
CREATE OR REPLACE FUNCTION check_stock_availability(
  p_product_id UUID,
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  available_stock INTEGER;
BEGIN
  IF p_variant_id IS NOT NULL THEN
    SELECT stock_quantity INTO available_stock
    FROM product_variants WHERE id = p_variant_id;
  ELSE
    SELECT stock_quantity INTO available_stock
    FROM products WHERE id = p_product_id;
  END IF;

  RETURN available_stock >= p_quantity;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE products IS 'Catálogo de produtos da loja';
COMMENT ON TABLE orders IS 'Pedidos realizados pelos clientes';
COMMENT ON TABLE customers IS 'Base de clientes cadastrados';
COMMENT ON TABLE coupons IS 'Cupons de desconto';
