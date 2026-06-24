import { Link } from "@tanstack/react-router";
import { Heart, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useQuickViewStore } from "@/stores/quickViewStore";
import { useState } from "react";
import { toast } from "sonner";
import { trackAddToCart } from "@/lib/analytics";

export interface ProductCardEditorialProps {
  id: string;
  title: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  image: string;
  variants?: { name: string; value: string }[];
  badge?: string;
  rating?: number;
  reviewCount?: number;
  className?: string;
}

export function ProductCardEditorial({
  id,
  title,
  vendor,
  price,
  originalPrice,
  image,
  badge,
  rating,
  reviewCount,
  className,
}: ProductCardEditorialProps) {
  const addToCart = useCartStore((state) => state.addItem);
  const { toggleItem, isInWishlist } = useWishlistStore();
  const openQuickView = useQuickViewStore((state) => state.openQuickView);
  const [isAdding, setIsAdding] = useState(false);
  const isWishlisted = isInWishlist(id);

  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAdding(true);

    addToCart({
      id,
      title,
      price,
      quantity: 1,
      image,
      vendor,
    });

    // Track add to cart event
    trackAddToCart({
      id,
      name: title,
      brand: vendor,
      price,
      quantity: 1,
    });

    toast.success("Produto adicionado ao carrinho", {
      duration: 2200,
    });

    setTimeout(() => setIsAdding(false), 1300);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const wasAdded = toggleItem({
      id,
      title,
      vendor,
      price,
      originalPrice,
      image,
    });

    toast.success(
      wasAdded ? "Adicionado aos favoritos" : "Removido dos favoritos",
      { duration: 2000 }
    );
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(id);
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <Link
      to="/produto/$id"
      params={{ id }}
      className={cn("block group", className)}
    >
      <article
        className="bg-white border border-[#E9E1D2] transition-all duration-[250ms] hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,58,62,0.10)]"
      >
        {/* Image Container */}
        <div className="relative bg-[#F8F4EA] p-4 md:p-8">
          {/* Discount Badge */}
          {discount > 0 && (
            <span className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-[#0F3A3E] text-white text-[10px] md:text-[11px] font-semibold tracking-[0.06em] px-2 py-1 md:px-3 md:py-1.5">
              -{discount}% OFF
            </span>
          )}

          {/* Custom Badge */}
          {badge && !discount && (
            <span className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-[#B07B1E] text-white text-[10px] md:text-[11px] font-semibold tracking-[0.06em] px-2 py-1 md:px-3 md:py-1.5">
              {badge}
            </span>
          )}

          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className={cn(
              "absolute top-2 right-2 md:top-4 md:right-4 z-10 w-8 h-8 md:w-9 md:h-9 flex items-center justify-center transition-all duration-200",
              isWishlisted
                ? "text-[#B07B1E]"
                : "text-[#0F3A3E]/40 hover:text-[#B07B1E]"
            )}
            aria-label={isWishlisted ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart className={cn("h-4 w-4 md:h-5 md:w-5", isWishlisted && "fill-current")} />
          </button>

          {/* Quick View Button - appears on hover */}
          <button
            onClick={handleQuickView}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 md:bottom-4 z-10 flex items-center gap-1.5 px-3 py-2 bg-white/95 text-[#0F3A3E] text-[10px] md:text-[11px] uppercase tracking-[0.1em] font-medium opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:bg-white shadow-sm"
            aria-label="Visualização rápida"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver rápido</span>
          </button>

          {/* Product Image */}
          <img
            src={image}
            alt={title}
            className="w-full h-[140px] md:h-[190px] object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        </div>

        {/* Product Info */}
        <div className="p-4 md:p-[22px]">
          {/* Vendor */}
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.14em] md:tracking-[0.18em] text-[#B07B1E] font-medium">
            {vendor}
          </p>

          {/* Title */}
          <h3 className="font-serif text-[16px] md:text-[20px] text-[#0F3A3E] leading-[1.2] md:leading-[1.25] mt-1.5 md:mt-2 min-h-[40px] md:min-h-[50px] line-clamp-2">
            {title}
          </h3>

          {/* Rating - hidden on small mobile */}
          {rating && (
            <div className="hidden sm:flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[12px] md:text-[13px]",
                      i < Math.floor(rating) ? "text-[#E8C25A]" : "text-[#DDD4C2]"
                    )}
                  >
                    ★
                  </span>
                ))}
              </div>
              {reviewCount && (
                <span className="text-[11px] md:text-[12px] text-[#75827E]">
                  ({reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-1.5 md:gap-2.5 mt-2 md:mt-3">
            {originalPrice && originalPrice > price && (
              <span className="text-[11px] md:text-[13px] text-[#b0a98f] line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <span className="font-serif text-[18px] md:text-[23px] text-[#0F3A3E]">
              {formatPrice(price)}
            </span>
          </div>

          {/* Installments */}
          <p className="text-[10px] md:text-[12px] text-[#75827E] mt-1">
            ou 3x de {formatPrice(price / 3)} sem juros
          </p>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className={cn(
              "w-full mt-3 md:mt-4 py-3 md:py-3.5 text-[10px] md:text-[11px] uppercase tracking-[0.12em] md:tracking-[0.16em] font-semibold transition-all duration-200",
              isAdding
                ? "bg-[#1c6b4a] text-white"
                : "bg-[#0F3A3E] text-white hover:bg-[#16504F]"
            )}
          >
            {isAdding ? "✓ Adicionado" : "Adicionar"}
          </button>
        </div>
      </article>
    </Link>
  );
}
