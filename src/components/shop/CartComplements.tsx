import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus, Check } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useProducts } from "@/hooks/useProducts";
import { sugerirComplementos, labelTipo } from "@/lib/cart-suggestions";
import { trackAddToCart } from "@/lib/analytics";
import { toast } from "sonner";
import type { Product } from "@/data/products";

// Bloco "leve junto". Sugestão é determinística (ver lib/cart-suggestions.ts):
// roda em memória sobre o catálogo que a página já tem, sem await e sem chamada
// externa. Se nenhuma regra casar — carrinho só com Variedades, por exemplo —
// não renderiza nada.
//
// Duas variantes, mesma lógica:
//
//   "drawer" — é a que o cliente realmente vê. O botão da sacola abre o drawer
//     e o CTA dele vai direto pro /checkout; NADA no site linka /carrinho (só o
//     routeTree gerado). Layout compacto porque o drawer tem max-w-[420px].
//
//   "page"  — /carrinho, alcançável só por URL digitada. Mantida porque a rota
//     existe e não custa nada.
//
// Não entra no checkout de propósito: interromper na etapa de pagamento custa
// conversão. O drawer é o momento de revisar o carrinho, não de pagar.
export function CartComplements({
  variant = "page",
}: {
  variant?: "page" | "drawer";
}) {
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addItem);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const { products } = useProducts();

  // A linha do carrinho tem id `productId` ou `productId::variationId`, e
  // productId só existe em itens novos. Vale para os dois casos.
  const idsNoCarrinho = useMemo(
    () => items.map((i) => i.productId ?? i.id.split("::")[0]),
    [items],
  );

  // Drawer é estreito: 2 cabem sem empurrar o resumo pra fora da vista.
  const max = variant === "drawer" ? 2 : 3;

  const sugestoes = useMemo(
    () => sugerirComplementos({ idsNoCarrinho, catalogo: products, max }),
    [idsNoCarrinho, products, max],
  );

  if (sugestoes.length === 0) return null;

  const formatPrice = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Um clique adiciona e fica onde está. Complemento não tem variação a
  // escolher, então não redireciona pro produto.
  const adicionar = (p: Product) => {
    addToCart({
      id: p.id,
      productId: p.id,
      title: p.name,
      price: p.price,
      quantity: 1,
      image: p.images[0],
      vendor: p.brand,
    });
    trackAddToCart({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      quantity: 1,
    });
    toast.success("Adicionado ao carrinho", { duration: 2000 });
  };

  if (variant === "drawer") {
    return (
      <div className="mt-2 pt-5 border-t border-[#E0D8C7]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#B07B1E] mb-3">
          Leve junto
        </p>

        <div className="space-y-2.5">
          {sugestoes.map((s) => {
            const p = s.product;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-white border border-[#E9E1D2] p-2"
              >
                <Link
                  to="/produto/$id"
                  params={{ id: p.id }}
                  onClick={() => setIsOpen(false)}
                  className="w-[52px] h-[62px] bg-white border border-[#E9E1D2] shrink-0"
                >
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-contain p-1"
                    loading="lazy"
                  />
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] uppercase tracking-[0.12em] text-[#B07B1E] font-medium">
                    {p.brand}
                  </p>
                  <Link
                    to="/produto/$id"
                    params={{ id: p.id }}
                    onClick={() => setIsOpen(false)}
                    className="block font-serif text-[13px] text-[#0F3A3E] leading-tight line-clamp-2 hover:text-[#B07B1E] transition-colors"
                  >
                    {p.name}
                  </Link>
                  <p className="text-[10px] text-[#75827E] mt-0.5 line-clamp-1">
                    {s.motivo}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-[13px] font-medium text-[#0F3A3E]">
                    {formatPrice(p.price)}
                  </span>
                  <button
                    type="button"
                    onClick={() => adicionar(p)}
                    aria-label={`Adicionar ${p.name} ao carrinho`}
                    title={`Adicionar ${labelTipo(s.tipo)}`}
                    className="w-9 h-9 flex items-center justify-center bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-10 pt-8 border-t border-[#E0D8C7]">
      <div className="mb-5">
        <span className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E]">
          Leve junto
        </span>
        <h2 className="font-serif text-[22px] text-[#0F3A3E] mt-1">
          Complete seu pedido
        </h2>
      </div>

      <div className="space-y-3">
        {sugestoes.map((s) => {
          const p = s.product;
          return (
            <div
              key={p.id}
              className="flex items-center gap-4 bg-white border border-[#E9E1D2] p-3"
            >
              <Link
                to="/produto/$id"
                params={{ id: p.id }}
                className="w-[72px] h-[86px] bg-white border border-[#E9E1D2] shrink-0"
              >
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-full h-full object-contain p-2"
                  loading="lazy"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#B07B1E] font-medium mb-0.5">
                  {p.brand}
                  {s.mesmaMarca && (
                    <span className="ml-2 normal-case tracking-normal text-[#1c6b4a] font-normal">
                      mesma marca
                    </span>
                  )}
                </p>
                <Link
                  to="/produto/$id"
                  params={{ id: p.id }}
                  className="block font-serif text-[15px] text-[#0F3A3E] leading-tight line-clamp-2 hover:text-[#B07B1E] transition-colors"
                >
                  {p.name}
                </Link>
                <p className="text-[12px] text-[#75827E] mt-1">
                  {s.motivo} · {labelTipo(s.tipo)}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-serif text-[17px] text-[#0F3A3E] mb-2">
                  {formatPrice(p.price)}
                </p>
                <button
                  type="button"
                  onClick={() => adicionar(p)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F3A3E] text-white text-[11px] uppercase tracking-[0.14em] font-semibold hover:bg-[#16504F] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[#9AA39F] mt-3 flex items-center gap-1.5">
        <Check className="h-3 w-3 text-[#1c6b4a]" />
        Sugestões com foto e em estoque, escolhidas pela combinação com o que já
        está no carrinho.
      </p>
    </section>
  );
}
