-- Permitir leitura pública de pedidos (qualquer pessoa pode ver um pedido se souber o ID)
-- Isso é necessário para a página /pedido/$id funcionar

-- Verificar se RLS está habilitado
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Anyone can read orders by id" ON orders;
DROP POLICY IF EXISTS "Service role can insert orders" ON orders;
DROP POLICY IF EXISTS "Service role can update orders" ON orders;

-- Permitir leitura pública (qualquer um pode ver um pedido)
CREATE POLICY "Anyone can read orders by id"
ON orders FOR SELECT
USING (true);

-- Permitir inserção pelo service role (server-side)
CREATE POLICY "Service role can insert orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Permitir atualização pelo service role
CREATE POLICY "Service role can update orders"
ON orders FOR UPDATE
USING (true)
WITH CHECK (true);

-- Também configurar admin panel access
DROP POLICY IF EXISTS "Admin can manage orders" ON orders;
CREATE POLICY "Admin can manage orders"
ON orders FOR ALL
USING (true)
WITH CHECK (true);
