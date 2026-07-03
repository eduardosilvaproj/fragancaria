import { ProductCarousel } from "./ProductCarousel";
import { SLOT_LABELS, type Slot } from "@/lib/home-featured.functions";
import type { Product } from "@/data/products";

interface HomeCarouselsProps {
  data: Partial<Record<Slot, Product[]>>;
}

// Wrapper dos 4 carrosseis da home. Espera os 4 slots ja resolvidos
// (vindos do loader SSR da rota `/`) para evitar pisca-pisca. Quando
// algum slot vem vazio, o `ProductCarousel` simplesmente nao renderiza.
export function HomeCarousels({ data }: HomeCarouselsProps) {
  return (
    <>
      <ProductCarousel
        title={SLOT_LABELS.bestsellers}
        subtitle="Top escolhas"
        viewAllHref="/produtos"
        products={data.bestsellers ?? []}
      />
      <ProductCarousel
        title={SLOT_LABELS.new_arrivals}
        subtitle="Acabou de chegar"
        viewAllHref="/produtos?filter=new"
        products={data.new_arrivals ?? []}
      />
      <ProductCarousel
        title={SLOT_LABELS.on_sale}
        subtitle="Por tempo limitado"
        viewAllHref="/produtos?filter=sale"
        products={data.on_sale ?? []}
      />
      <ProductCarousel
        title={SLOT_LABELS.kits}
        subtitle="Combinações perfeitas"
        viewAllHref="/categoria/kits"
        products={data.kits ?? []}
      />
    </>
  );
}