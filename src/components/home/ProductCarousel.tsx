import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { cn } from "@/lib/utils";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  products: Product[];
}

// Carrossel horizontal padrao da home. Padrao visual inspirado no
// `RecentlyViewedSection` (setas laterais, scroll-snap, esconde setas
// no mobile). Usa o `ProductCardEditorial` para wishlist/cart/quickview
// consistentes com o resto do site.
export function ProductCarousel({
  title,
  subtitle,
  viewAllHref,
  products,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, [products.length]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 260;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        {/* Header */}
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            {subtitle && (
              <span className="text-[11px] md:text-[12px] tracking-[0.25em] text-[#B07B1E] uppercase">
                {subtitle}
              </span>
            )}
            <h2 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E] mt-1">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {viewAllHref && (
              <Link
                to={viewAllHref}
                className="hidden md:inline-block text-[12px] tracking-[0.2em] uppercase text-[#0F3A3E] hover:text-[#B07B1E] transition-colors"
              >
                Ver todos
              </Link>
            )}
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className={cn(
                  "w-10 h-10 flex items-center justify-center border border-[#E0D8C7] transition-colors",
                  canScrollLeft
                    ? "text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white hover:border-[#0F3A3E]"
                    : "text-[#C4BBA8] cursor-not-allowed",
                )}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className={cn(
                  "w-10 h-10 flex items-center justify-center border border-[#E0D8C7] transition-colors",
                  canScrollRight
                    ? "text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white hover:border-[#0F3A3E]"
                    : "text-[#C4BBA8] cursor-not-allowed",
                )}
                aria-label="Proximo"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={checkScrollability}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          aria-label={title}
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="flex-shrink-0 w-[180px] md:w-[220px] snap-start scroll-ml-6 md:scroll-ml-0"
            >
              <ProductCardEditorial
                id={p.id}
                title={p.name}
                vendor={p.brand}
                price={p.price}
                originalPrice={p.originalPrice}
                image={p.images[0] ?? ""}
                badge={
                  p.originalPrice && p.originalPrice > p.price
                    ? `-${Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)}%`
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}