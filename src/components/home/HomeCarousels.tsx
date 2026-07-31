import { useMemo } from "react";
import { ProductCarousel } from "./ProductCarousel";
import { SLOT_LABELS, type Slot } from "@/lib/home-featured.functions";
import type { Product } from "@/data/products";

interface HomeCarouselsProps {
  data: Partial<Record<Slot, Product[]>>;
}

// Quantos produtos cada prateleira mostra. Abaixo dos 12 que o loader traz:
// a home nao precisa despejar o catalogo, e o excedente serve de folga para
// o dedupe abaixo trocar um repetido sem esvaziar a prateleira.
const MAX_POR_PRATELEIRA = 8;

// Prateleiras da home. Sao DUAS, nao quatro.
//
// "Novidades" e "Kits" sairam daqui porque a home tinha 4 grids parecidos
// repetindo produtos entre si. As duas continuam alcancaveis pelo menu, que
// filtra por `productType` casando com `products.category` em Title Case.
// "Novidades" em especial nao tinha sentido como prateleira: `is_new` esta
// marcado em 1213 dos 1234 produtos ativos (medido 2026-07-31), ou seja, a
// flag nao distingue nada.
export function HomeCarousels({ data }: HomeCarouselsProps) {
  // Dedupe: nenhum produto aparece nas duas prateleiras.
  //
  // "Em Promocao" tem prioridade porque o criterio dela e objetivo (tem
  // desconto no banco), enquanto "Mais Vendidos" depende de curadoria e cai
  // no aleatorio quando o admin nao promoveu nada — entao e o slot que pode
  // ceder um item sem perder significado.
  const { bestsellers, onSale } = useMemo(() => {
    const promo = (data.on_sale ?? []).slice(0, MAX_POR_PRATELEIRA);
    const idsPromo = new Set(promo.map((p) => p.id));
    const best = (data.bestsellers ?? [])
      .filter((p) => !idsPromo.has(p.id))
      .slice(0, MAX_POR_PRATELEIRA);
    return { bestsellers: best, onSale: promo };
  }, [data.bestsellers, data.on_sale]);

  return (
    <>
      <ProductCarousel
        title={SLOT_LABELS.bestsellers}
        subtitle="Top escolhas"
        viewAllTo="/produtos"
        products={bestsellers}
      />
      <ProductCarousel
        title={SLOT_LABELS.on_sale}
        subtitle="Por tempo limitado"
        // `ofertas` e um search param real de /produtos (validateSearch), que
        // filtra so os produtos com desconto. Antes isto apontava para
        // `?filter=sale`, param que a rota nao valida — o link nao filtrava
        // nada. `/produtos?filter=new` e `/categoria/kits` tinham o mesmo
        // problema (a rota `/categoria` nem existe) e sairam junto.
        viewAllTo="/produtos"
        viewAllSearch={{ ofertas: true }}
        products={onSale}
      />
    </>
  );
}
