import { X, GitCompare, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCompareStore } from "@/stores/compareStore";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const MotionDiv = motion.div as any;

export function CompareBar() {
  const { items, isOpen, removeItem, clearItems, openCompare, closeCompare } = useCompareStore();

  // Don't show if no items
  if (items.length === 0) return null;

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <>
      {/* Floating Compare Button */}
      <AnimatePresence>
        {!isOpen && items.length > 0 && (
          <MotionDiv
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={openCompare}
              className="flex items-center gap-2 bg-[#0F3A3E] text-white px-5 py-3.5 shadow-lg hover:bg-[#16504F] transition-colors"
            >
              <GitCompare className="h-5 w-5" />
              <span className="text-[12px] uppercase tracking-[0.1em] font-semibold">
                Comparar ({items.length})
              </span>
            </button>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Compare Bar */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0D8C7] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-50"
          >
            <div className="max-w-[1280px] mx-auto px-6 py-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <GitCompare className="h-5 w-5 text-[#B07B1E]" />
                  <h3 className="font-serif text-[18px] text-[#0F3A3E]">
                    Comparar Produtos
                  </h3>
                  <span className="text-[12px] text-[#75827E]">
                    ({items.length}/4)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearItems}
                    className="text-[12px] text-[#C4433A] hover:underline"
                  >
                    Limpar tudo
                  </button>
                  <button
                    onClick={closeCompare}
                    className="w-8 h-8 flex items-center justify-center hover:bg-[#F8F4EA] transition-colors"
                  >
                    <X className="h-5 w-5 text-[#75827E]" />
                  </button>
                </div>
              </div>

              {/* Products */}
              <div className="flex gap-4 overflow-x-auto pb-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex-shrink-0 w-[180px] bg-[#F8F4EA] border border-[#E9E1D2] p-3 relative group"
                  >
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-white/90 text-[#C4433A] opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remover"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-[80px] object-contain mb-2"
                    />
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#B07B1E] font-medium">
                      {item.vendor}
                    </p>
                    <p className="text-[13px] text-[#0F3A3E] line-clamp-1 mt-1">
                      {item.title}
                    </p>
                    <p className="font-serif text-[15px] text-[#0F3A3E] mt-1">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                ))}

                {/* Empty slots */}
                {[...Array(4 - items.length)].map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex-shrink-0 w-[180px] border-2 border-dashed border-[#E0D8C7] p-3 flex items-center justify-center min-h-[150px]"
                  >
                    <p className="text-[12px] text-[#9AA39F] text-center">
                      Adicione mais<br />produtos
                    </p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex justify-end mt-4">
                <Link
                  to="/comparar"
                  onClick={closeCompare}
                  className={cn(
                    "px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-semibold transition-colors",
                    items.length >= 2
                      ? "bg-[#0F3A3E] text-white hover:bg-[#16504F]"
                      : "bg-[#C4BBA8] text-white cursor-not-allowed"
                  )}
                >
                  Comparar {items.length >= 2 ? `(${items.length})` : "(mín. 2)"}
                </Link>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
}
