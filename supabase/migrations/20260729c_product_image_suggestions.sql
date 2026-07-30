-- =====================================================
-- PRODUCT IMAGE SUGGESTIONS: candidatas a imagem via Serper
-- =====================================================
-- Cada linha = uma URL candidata para um produto. Um produto pode ter N
-- candidatas (tipicamente 5-10). O operador aprova ou rejeita cada uma.
--
-- Fluxo:
--   1. Batch search: Serper busca por nome + marca → insere N linhas com
--      status='pending' para cada produto sem imagem.
--   2. Revisao: tela /admin/produtos/imagens mostra produtos com candidatas
--      pendentes em grade. Operador clica na correta ou marca "nenhuma serve".
--   3. Aprovar: server fn baixa a imagem → upload pro Storage (product-images)
--      → grava URL em products.images → marca suggestion como 'approved'.
--   4. Rejeitar: marca suggestion como 'rejected'. Produto continua na fila
--      (pode receber novo lote de sugestoes depois).
--
-- Nao ha UNIQUE por product_id + image_url de proposito: o mesmo URL pode
-- aparecer em lotes diferentes se o operador rejeitou antes. Cada tentativa
-- e independente.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_image_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'serper',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pis_status ON public.product_image_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_pis_product ON public.product_image_suggestions(product_id);

-- =====================================================
-- RLS: nenhum acesso direto pelo browser
-- =====================================================
-- Mesmo padrao de store_settings: RLS ligado, ZERO policies. So server fn
-- (service role) toca esta tabela.
ALTER TABLE public.product_image_suggestions ENABLE ROW LEVEL SECURITY;

-- #####################################################################
-- #                                                                   #
-- #   ATENCAO: update_updated_at() E FUNCAO COMPARTILHADA.             #
-- #                                                                   #
-- #   Usada pelos triggers de:                                        #
-- #     - public.store_settings                                       #
-- #     - public.nfe_settings                                         #
-- #     - public.shipping_settings                                    #
-- #     - public.product_image_suggestions  (esta migration)            #
-- #                                                                   #
-- #   MUDAR O CORPO MUDA O COMPORTAMENTO DE TODAS.                    #
-- #                                                                   #
-- #####################################################################
DROP TRIGGER IF EXISTS product_image_suggestions_updated_at ON public.product_image_suggestions;
CREATE TRIGGER product_image_suggestions_updated_at
  BEFORE UPDATE ON public.product_image_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
