-- =====================================================
-- FRAGRANCIARIA - Setup do Banco de Dados Supabase
-- Execute este SQL no Editor SQL do Supabase
-- =====================================================

-- 1. Dropar tabela existente (se quiser recriar do zero)
-- DROP TABLE IF EXISTS orders;

-- 2. Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Dados do cliente
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_cpf TEXT,
  payer_email TEXT,

  -- Endereço de entrega
  shipping_address JSONB,

  -- Itens do pedido
  items JSONB DEFAULT '[]'::jsonb,

  -- Valores
  subtotal DECIMAL(10,2),
  shipping_price DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2),
  amount DECIMAL(10,2),

  -- Pagamento
  payment_method TEXT,
  payment_id TEXT,
  payment_status TEXT DEFAULT 'pending',

  -- Entrega
  shipping_method TEXT,
  tracking_code TEXT,
  estimated_delivery DATE,

  -- Status do pedido
  status TEXT DEFAULT 'pending',
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Dados brutos do Mercado Pago
  raw JSONB DEFAULT '{}'::jsonb,

  -- Metadados extras
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Adicionar colunas que podem estar faltando (se tabela já existe)
DO $$
BEGIN
  -- Adicionar payer_email se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payer_email') THEN
    ALTER TABLE orders ADD COLUMN payer_email TEXT;
  END IF;

  -- Adicionar raw se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'raw') THEN
    ALTER TABLE orders ADD COLUMN raw JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Adicionar metadata se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'metadata') THEN
    ALTER TABLE orders ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Adicionar payment_status se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Habilitar RLS (Row Level Security)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 8. Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Anyone can read orders by id" ON orders;
DROP POLICY IF EXISTS "Service role can insert orders" ON orders;
DROP POLICY IF EXISTS "Service role can update orders" ON orders;
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;
DROP POLICY IF EXISTS "Allow all operations" ON orders;

-- 9. Criar política que permite todas as operações (para service role)
CREATE POLICY "Allow all operations"
ON orders FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- VERIFICAÇÃO - Execute para confirmar estrutura
-- =====================================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- ORDER BY ordinal_position;

-- =====================================================
-- FIM DO SETUP
-- =====================================================
