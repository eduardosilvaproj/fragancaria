import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus, Check } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useProducts } from "@/hooks/useProducts";
import { sugerirComplementos, labelTipo } from "@/lib/cart-suggestions";
import { trackAddToCart } from "@/lib/analytics";
import { toast } from "sonner";

// Bloco "leve junto" do carrinho. Fica abaixo dos itens, nunca no checkout:
// interromper na etapa de pagamento custa conversão.
//
// Sugestão é determinística (ver lib/cart-suggestions.ts): roda em memória
// sobre o catálogo que a página já tem, sem await e sem chamada externa. Se
// nenhuma regra casar — carrinho só com Variedades, por exemplo — o bloco
// simplesmente não renderiza.
export function CartComplements() {
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addItem);
  const { products } = useProducts();

  // A linha do carrinho tem id `productId` ou `productId::variationId`, e
  // productId só existe em itens novos. Vale para os dois casos.
  const idsNoCarrinho = useMemo(
    () => items.map((i) => i.productId ?? i.id.split("::")[0]),
    [items],
  );

  const sugestoes = useMemo(
    () => sugerirComplementos({ idsNoCarrinho, catalogo: products, max: 3 }),
    [idsNoCarrinho, products],
  );

  if (sugestoes.length === 0) return null;

  const formatPrice = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
                  onClick={() => {
                    // Um clique adiciona e fica na página. Complemento não tem
                    // variação a escolher, então não redireciona pro produto.
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
                  }}
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
