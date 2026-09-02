import { ProductCarousel } from "./ProductCarousel";
import type { Product } from "@/data/products";
import type { Campanha } from "@/lib/home-campanha.functions";

interface CampanhaSectionProps {
  campanha: Campanha;
  produtos: Product[];
}

/**
 * Prateleira de Campanha - renderiza acima do HomeCarousels.
 *
 * Só renderiza se houver campanha ativa dentro da janela de datas
 * E com produtos válidos. Produto inativo é IGNORADO silenciosamente
 * na leitura (no server function getProdutosCampanhaAtiva).
 */
export function CampanhaSection({ campanha, produtos }: CampanhaSectionProps) {
  return (
    <ProductCarousel
      title={campanha.titulo}
      subtitle={campanha.subtitulo ?? undefined}
      viewAllTo="/produtos"
      products={produtos}
    />
  );
}
