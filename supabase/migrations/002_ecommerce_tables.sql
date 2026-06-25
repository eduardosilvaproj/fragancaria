-- ============================================
-- MIGRATION: Tabela de Produtos para E-commerce
-- Fragranciaria - Sincronização com Shopify
-- ============================================

-- Tabela de Produtos
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificadores
  shopify_id TEXT UNIQUE,
  handle TEXT UNIQUE,
  sku TEXT,

  -- Informações básicas
  name TEXT NOT NULL,
  description TEXT,
  description_html TEXT,
  brand TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Preços
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  cost_price DECIMAL(10, 2),

  -- Imagens
  thumbnail TEXT,
  images TEXT[] DEFAULT '{}',

  -- Estoque
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'backorder')),
  low_stock_threshold INTEGER DEFAULT 5,
  track_inventory BOOLEAN DEFAULT true,

  -- Variantes (JSON array)
  variants JSONB DEFAULT '[]',

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Peso e dimensões (para frete)
  weight_grams INTEGER,
  length_cm DECIMAL(5, 2),
  width_cm DECIMAL(5, 2),
  height_cm DECIMAL(5, 2),

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Datas Shopify
  shopify_created_at TIMESTAMPTZ,
  shopify_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,

  -- Datas do sistema
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_shopify_id ON products(shopify_id);
CREATE INDEX IF NOT EXISTS idx_products_handle ON products(handle);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- ============================================
-- Tabela de Pedidos
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificadores
  order_number SERIAL UNIQUE,
  shopify_order_id TEXT UNIQUE,

  -- Cliente
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_document TEXT,

  -- Endereço de entrega
  shipping_address JSONB,
  billing_address JSONB,

  -- Itens (JSON array com id, name, price, quantity, etc)
  items JSONB NOT NULL DEFAULT '[]',

  -- Valores
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,

  -- Cupom aplicado
  coupon_id UUID REFERENCES coupons(id),
  coupon_code TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  )),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN (
    'pending', 'processing', 'paid', 'failed', 'refunded', 'chargeback'
  )),
  fulfillment_status TEXT DEFAULT 'unfulfilled' CHECK (fulfillment_status IN (
    'unfulfilled', 'partial', 'fulfilled'
  )),

  -- Pagamento
  payment_method TEXT,
  payment_id TEXT,
  payment_details JSONB,
  paid_at TIMESTAMPTZ,

  -- Envio
  shipping_method TEXT,
  shipping_carrier TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  estimated_delivery DATE,

  -- Notas
  customer_notes TEXT,
  internal_notes TEXT,

  -- Afiliado
  affiliate_id UUID REFERENCES affiliates(id),
  affiliate_commission DECIMAL(10, 2),

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_id ON orders(affiliate_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================
-- Tabela de Clientes
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth
  user_id UUID REFERENCES auth.users(id),

  -- Identificadores
  shopify_customer_id TEXT UNIQUE,

  -- Informações básicas
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
  ) STORED,
  phone TEXT,
  document TEXT,
  document_type TEXT DEFAULT 'cpf' CHECK (document_type IN ('cpf', 'cnpj')),

  -- Endereços (JSON array)
  addresses JSONB DEFAULT '[]',
  default_address_index INTEGER DEFAULT 0,

  -- Marketing
  accepts_marketing BOOLEAN DEFAULT false,
  marketing_opt_in_at TIMESTAMPTZ,

  -- Métricas
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10, 2) DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Loyalty
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier TEXT DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),

  -- Datas
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_shopify_id ON customers(shopify_customer_id);

-- ============================================
-- Tabela de Cupons
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Código
  code TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Tipo de desconto
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_shipping')),
  discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Limites
  minimum_order_value DECIMAL(10, 2),
  maximum_discount DECIMAL(10, 2),

  -- Uso
  usage_limit INTEGER,
  usage_limit_per_customer INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,

  -- Restrições
  first_purchase_only BOOLEAN DEFAULT false,
  specific_products JSONB,
  specific_categories TEXT[],
  specific_customers UUID[],

  -- Validade
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_expires_at ON coupons(expires_at);

-- ============================================
-- Tabela de Itens do Pedido (normalizada)
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),

  -- Dados do produto (snapshot no momento da compra)
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_image TEXT,
  variant_title TEXT,

  -- Valores
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  quantity INTEGER NOT NULL DEFAULT 1,
  total DECIMAL(10, 2) GENERATED ALWAYS AS (price * quantity) STORED,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- ============================================
-- Tabela de Histórico de Estoque
-- ============================================

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID NOT NULL REFERENCES products(id),

  -- Movimento
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase', 'sale', 'return', 'adjustment', 'transfer', 'damage'
  )),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,

  -- Referência
  reference_type TEXT,
  reference_id UUID,

  -- Notas
  notes TEXT,

  -- Datas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para produtos (leitura pública, escrita apenas autenticado)
CREATE POLICY "Products são públicos para leitura"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin pode gerenciar produtos"
  ON products FOR ALL
  USING (auth.role() = 'authenticated');

-- Políticas para pedidos (apenas o próprio cliente ou admin)
CREATE POLICY "Clientes veem próprios pedidos"
  ON orders FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode gerenciar pedidos"
  ON orders FOR ALL
  USING (auth.role() = 'authenticated');

-- Políticas para cupons (leitura pública de ativos, escrita admin)
CREATE POLICY "Cupons ativos são públicos"
  ON coupons FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admin pode gerenciar cupons"
  ON coupons FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- Funções auxiliares
-- ============================================

-- Função para calcular total do pedido
CREATE OR REPLACE FUNCTION calculate_order_total(order_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  subtotal DECIMAL;
  shipping DECIMAL;
  discount DECIMAL;
BEGIN
  SELECT COALESCE(SUM(price * quantity), 0) INTO subtotal
  FROM order_items WHERE order_items.order_id = $1;

  SELECT COALESCE(orders.shipping_cost, 0), COALESCE(orders.discount_amount, 0)
  INTO shipping, discount
  FROM orders WHERE orders.id = $1;

  RETURN subtotal + shipping - discount;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar estoque após venda
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Reduzir estoque
    UPDATE products
    SET stock_quantity = stock_quantity - (
      SELECT quantity FROM order_items WHERE order_items.product_id = products.id AND order_items.order_id = NEW.id
    )
    WHERE id IN (SELECT product_id FROM order_items WHERE order_id = NEW.id);
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Devolver estoque
    UPDATE products
    SET stock_quantity = stock_quantity + (
      SELECT quantity FROM order_items WHERE order_items.product_id = products.id AND order_items.order_id = NEW.id
    )
    WHERE id IN (SELECT product_id FROM order_items WHERE order_id = NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualização de estoque
DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON orders;
CREATE TRIGGER trigger_update_stock_on_order
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_order();

-- ============================================
-- Dados iniciais (cupom de boas-vindas)
-- ============================================

INSERT INTO coupons (code, description, discount_type, discount_value, minimum_order_value, maximum_discount, first_purchase_only, expires_at)
VALUES (
  'BEMVINDO10',
  '10% de desconto na primeira compra',
  'percentage',
  10,
  100,
  50,
  true,
  '2025-12-31 23:59:59'
)
ON CONFLICT (code) DO NOTHING;
