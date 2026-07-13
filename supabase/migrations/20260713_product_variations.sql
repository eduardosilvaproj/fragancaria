-- Variações de produto (ex.: tons de coloração de cabelo).
-- Armazenadas como JSONB no próprio produto; sem tabela separada porque não
-- há preço nem estoque por variação (preço único do produto). Segue o
-- precedente de external_ids/orders.items que também são JSONB.
--
-- Shape de cada elemento:
--   { "id": "8f3a1c22", "name": "Loiro Dourado 7.3", "color": "#C9A45C", "image": "https://..." }
--   - id: gerado no admin, estável entre edições (liga carrinho/pedido de volta)
--   - name: obrigatório; color/image: opcionais

alter table public.products
  add column if not exists variations jsonb not null default '[]'::jsonb;
