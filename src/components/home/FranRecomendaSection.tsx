import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

interface FranRecomendaProduto {
  id: string;
  selo?: string | null;
  frase?: string | null;
  produto: {
    id: string;
    name: string;
    brand: string;
    price: number;
    originalPrice?: number | null;
    images: string[];
    slug: string | null;
    inStock: boolean;
    sku?: string | null;
  };
}

interface FranRecomendaSectionProps {
  produtos: FranRecomendaProduto[];
  onFranClick?: () => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price);
}

function getSeloStyle(selo: string | null | undefined): string {
  if (!selo) return "bg-[#E8C25A] text-[#0F3A3E]";
  if (selo.includes("Fran indica"))
    return "bg-[#E8C25A] text-[#0F3A3E] border border-[#E8C25A]";
  if (selo.includes("Fran usa"))
    return "bg-[#B07B1E] text-white border border-[#B07B1E]";
  if (selo.includes("Fran ama"))
    return "bg-[#FF6B6B] text-white border border-[#FF6B6B]";
  return "bg-[#E8C25A] text-[#0F3A3E] border border-[#E8C25A]";
}

/**
 * Bloco "Fran Recomenda" - layout horizontal compacto.
 *
 * Layout Desktop (md+): foto da Fran na borda esquerda (sangrando), texto de
 * apoio ao lado, três produtos à direita sem card branco.
 *
 * Layout Mobile: texto em cima, produtos em carrossel horizontal com swipe.
 */
export function FranRecomendaSection({
  produtos,
  onFranClick,
}: FranRecomendaSectionProps) {
  if (!produtos || produtos.length === 0) {
    return null;
  }

  const itens = produtos.slice(0, 3);

  return (
    <section className="w-full bg-[#0F3A3E] text-white overflow-hidden">
      <div className="max-w-[1280px] mx-auto">

        {/* ===== DESKTOP LAYOUT (md+) ===== */}
        <div className="hidden md:flex h-[340px] items-stretch">

          {/* Coluna 1: Foto da Fran (largura fixa) */}
          <div className="w-[200px] h-full flex-shrink-0 flex items-center justify-center bg-[#164a4e] border-r border-white/5">
            <span className="text-[10px] text-[#E8C25A] text-center leading-tight tracking-[0.1em] font-medium uppercase p-4">
              Reservado para foto da Fran
            </span>
          </div>

          {/* Coluna 2: Texto de Apoio (ao lado da foto) */}
          <div className="flex-1 flex flex-col justify-center pl-8 pr-6 pt-4">
            <span className="text-[11px] tracking-[0.25em] text-[#E8C25A] uppercase font-medium mb-1">
              Curadoria Fran
            </span>
            <h2 className="font-serif font-medium text-[24px] text-white leading-tight mb-2">
              Fran recomenda
            </h2>
            <p className="text-[14px] text-white/80 leading-[1.5] mb-5">
              As escolhas que eu faço com carinho para deixar sua rotina de
              beleza ainda mais especial.
            </p>
            {onFranClick && (
              <button
                onClick={onFranClick}
                className="w-fit inline-flex items-center gap-2 px-5 py-3 bg-[#E8C25A] hover:bg-[#D4B04A] text-[#0F3A3E] text-[11px] tracking-[0.18em] uppercase font-medium transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Falar com a Fran
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Lado Direito: Produtos sem card branco */}
          <div className="flex-1 flex items-center justify-end gap-5 pl-6 pr-0 py-6 z-10">
            {itens.map((item) => {
              const produto = item.produto;
              const selo = item.selo || "";
              const frase = item.frase || "";
              const [imgError, setImgError] = useState(false);

              const hasDiscount =
                produto.originalPrice !== null &&
                produto.originalPrice !== undefined &&
                produto.originalPrice > produto.price;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 w-[170px] flex-shrink-0"
                >
                  {/* Imagem do produto direto no fundo escuro */}
                  <Link
                    to="/produto/$id"
                    params={{ id: produto.id }}
                    className="block relative group aspect-square overflow-hidden"
                  >
                    {produto.images?.[0] && !imgError ? (
                      <img
                        src={produto.images[0]}
                        alt={produto.name}
                        width={200}
                        height={200}
                        loading="lazy"
                        onError={() => setImgError(true)}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-[#E8C25A]/40" />
                      </div>
                    )}

                    {/* Selo */}
                    {selo && (
                      <span
                        className={`absolute top-2 left-2 text-[8px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${getSeloStyle(selo)}`}
                      >
                        {selo}
                      </span>
                    )}
                  </Link>

                  {/* Nome + Frase + Preço */}
                  <div className="flex flex-col gap-1">
                    <Link
                      to="/produto/$id"
                      params={{ id: produto.id }}
                      className="text-[12px] text-white font-medium hover:text-[#E8C25A] transition-colors line-clamp-2 leading-tight"
                    >
                      {produto.name}
                    </Link>

                    {frase && (
                      <p className="text-[10.5px] text-white/60 italic leading-snug line-clamp-2">
                        "{frase}"
                      </p>
                    )}

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[13px] font-serif font-medium text-[#E8C25A]">
                        {formatPrice(produto.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-[10px] text-white/40 line-through">
                          {formatPrice(produto.originalPrice!)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* ===== MOBILE LAYOUT (<md) ===== */}
        <div className="md:hidden py-10 flex flex-col gap-6 px-6">
          {/* Texto e botão */}
          <div>
            <span className="text-[10px] tracking-[0.2em] text-[#E8C25A] uppercase font-medium">
              Curadoria Fran
            </span>
            <h2 className="font-serif font-medium text-[22px] text-white mt-1 leading-tight mb-2">
              Fran recomenda
            </h2>
            <p className="text-[14px] text-white/80 leading-[1.5] mb-4">
              As escolhas que eu faço com carinho para deixar sua rotina de
              beleza ainda mais especial.
            </p>
            {onFranClick && (
              <button
                onClick={onFranClick}
                className="w-fit inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#E8C25A] hover:bg-[#D4B04A] text-[#0F3A3E] text-[11px] tracking-[0.16em] uppercase font-medium transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Falar com a Fran
              </button>
            )}
          </div>

          {/* Carrossel de Produtos */}
          <div
            className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {itens.map((item) => {
              const produto = item.produto;
              const selo = item.selo || "";
              const frase = item.frase || "";
              const [imgError, setImgError] = useState(false);

              const hasDiscount =
                produto.originalPrice !== null &&
                produto.originalPrice !== undefined &&
                produto.originalPrice > produto.price;

              return (
                <div
                  key={item.id}
                  className="snap-start w-[140px] flex-shrink-0 flex flex-col gap-2"
                >
                  <Link
                    to="/produto/$id"
                    params={{ id: produto.id }}
                    className="block relative group aspect-square overflow-hidden"
                  >
                    {produto.images?.[0] && !imgError ? (
                      <img
                        src={produto.images[0]}
                        alt={produto.name}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-contain p-3"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-[#E8C25A]/40" />
                      </div>
                    )}

                    {selo && (
                      <span
                        className={`absolute top-1.5 left-1.5 text-[7px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${getSeloStyle(selo)}`}
                      >
                        {selo}
                      </span>
                    )}
                  </Link>

                  <div className="flex flex-col gap-0.5">
                    <Link
                      to="/produto/$id"
                      params={{ id: produto.id }}
                      className="text-[11px] text-white font-medium line-clamp-1 leading-tight"
                    >
                      {produto.name}
                    </Link>
                    {frase && (
                      <p className="text-[10px] text-white/60 italic leading-tight line-clamp-2">
                        "{frase}"
                      </p>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-[12px] font-serif font-medium text-[#E8C25A]">
                        {formatPrice(produto.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-[9px] text-white/40 line-through">
                          {formatPrice(produto.originalPrice!)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}