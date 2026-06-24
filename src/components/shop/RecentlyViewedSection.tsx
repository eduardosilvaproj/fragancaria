import { Link } from "@tanstack/react-router";
import { useRecentlyViewedStore } from "@/stores/recentlyViewedStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface RecentlyViewedSectionProps {
  excludeProductId?: string;
  title?: string;
  className?: string;
}

export function RecentlyViewedSection({
  excludeProductId,
  title = "Vistos Recentemente",
  className,
}: RecentlyViewedSectionProps) {
  const getRecentItems = useRecentlyViewedStore((state) => state.getRecentItems);
  const items = getRecentItems(8, excludeProductId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScrollability();
    window.addEventListener("resize", checkScrollability);
    return () => window.removeEventListener("resize", checkScrollability);
  }, [items]);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 280; // roughly one card width
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Don't render if no items
  if (items.length === 0) return null;

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <section className={cn("py-12 md:py-16 bg-[#F3EEE3]", className)}>
      <div className="max-w-[1280px] mx-auto px-6 md:px-14">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <div>
            <span className="text-[11px] md:text-[12px] tracking-[0.25em] text-[#B07B1E] uppercase">
              Continue explorando
            </span>
            <h2 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E] mt-1">
              {title}
            </h2>
          </div>

          {/* Navigation arrows - desktop only */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={cn(
                "w-10 h-10 flex items-center justify-center border border-[#E0D8C7] transition-colors",
                canScrollLeft
                  ? "text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white hover:border-[#0F3A3E]"
                  : "text-[#C4BBA8] cursor-not-allowed"
              )}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={cn(
                "w-10 h-10 flex items-center justify-center border border-[#E0D8C7] transition-colors",
                canScrollRight
                  ? "text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white hover:border-[#0F3A3E]"
                  : "text-[#C4BBA8] cursor-not-allowed"
              )}
              aria-label="Próximo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          onScroll={checkScrollability}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item) => (
            <Link
              key={item.id}
              to="/produto/$id"
              params={{ id: item.id }}
              className="flex-shrink-0 w-[180px] md:w-[220px] snap-start group"
            >
              <article className="bg-white border border-[#E9E1D2] transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                {/* Image */}
                <div className="bg-white p-4 aspect-square flex items-center justify-center">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="p-3 md:p-4">
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.14em] text-[#B07B1E] font-medium">
                    {item.vendor}
                  </p>
                  <h3 className="font-serif text-[14px] md:text-[16px] text-[#0F3A3E] leading-tight mt-1 line-clamp-2 min-h-[36px] md:min-h-[40px]">
                    {item.title}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-[10px] md:text-[11px] text-[#b0a98f] line-through">
                        {formatPrice(item.originalPrice)}
                      </span>
                    )}
                    <span className="font-serif text-[16px] md:text-[18px] text-[#0F3A3E]">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
