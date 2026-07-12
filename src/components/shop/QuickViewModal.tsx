import { X, Heart, Minus, Plus, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";

const MotionDiv = motion.div as any;

interface QuickViewModalProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ productId, isOpen, onClose }: QuickViewModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);

  const addToCart = useCartStore((state) => state.addItem);
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { products } = useProducts();

  const product = productId ? products.find((p) => p.id === productId) : null;
  const isWishlisted = product ? isInWishlist(product.id) : false;

  if (!product) return null;

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({
      id: product.id,
      title: product.name,
      price: product.price,
      quantity,
      image: product.images[0],
      vendor: product.brand || "",
    });

    toast.success(`${quantity}x ${product.name} adicionado ao carrinho`, {
      duration: 2500,
    });

    setTimeout(() => {
      setIsAdding(false);
      setQuantity(1);
      onClose();
    }, 800);
  };

  const handleWishlist = () => {
    const wasAdded = toggleItem({
      id: product.id,
      title: product.name,
      vendor: product.brand || "",
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.images[0],
    });

    toast.success(wasAdded ? "Adicionado aos favoritos" : "Removido dos favoritos", {
      duration: 2000,
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === product.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? product.images.length - 1 : prev - 1
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal */}
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white w-full max-w-[900px] max-h-[90vh] overflow-y-auto"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white text-[#0F3A3E] transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col md:flex-row">
              {/* Image Gallery */}
              <div className="relative md:w-1/2 bg-white">
                {/* Discount Badge */}
                {discount > 0 && (
                  <span className="absolute top-4 left-4 z-10 bg-[#0F3A3E] text-white text-[11px] font-semibold tracking-[0.06em] px-3 py-1.5">
                    -{discount}% OFF
                  </span>
                )}

                {/* Main Image */}
                <div className="relative aspect-square flex items-center justify-center p-8">
                  <img
                    src={product.images[currentImageIndex]}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain"
                  />

                  {/* Navigation Arrows */}
                  {product.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white text-[#0F3A3E] transition-colors"
                        aria-label="Imagem anterior"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white text-[#0F3A3E] transition-colors"
                        aria-label="Próxima imagem"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="flex justify-center gap-2 pb-4">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={cn(
                          "w-12 h-12 border-2 transition-colors",
                          currentImageIndex === idx
                            ? "border-[#B07B1E]"
                            : "border-transparent hover:border-[#E0D8C7]"
                        )}
                      >
                        <img
                          src={img}
                          alt={`${product.name} - imagem ${idx + 1}`}
                          className="w-full h-full object-contain bg-white"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                {/* Brand */}
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#B07B1E] font-medium">
                  {product.brand}
                </p>

                {/* Name */}
                <h2 className="font-serif text-[24px] md:text-[28px] text-[#0F3A3E] leading-[1.2] mt-2">
                  {product.name}
                </h2>

                {/* Price */}
                <div className="flex items-baseline gap-3 mt-4">
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-[14px] text-[#b0a98f] line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                  <span className="font-serif text-[28px] text-[#0F3A3E]">
                    {formatPrice(product.price)}
                  </span>
                </div>

                {/* Installments */}
                <p className="text-[13px] text-[#75827E] mt-1">
                  ou 10x de {formatPrice(product.price / 10)} sem juros
                </p>

                {/* Description */}
                {product.description && (
                  <p className="text-[14px] text-[#51635F] leading-[1.6] mt-6 line-clamp-4">
                    {product.description}
                  </p>
                )}

                {/* Quantity */}
                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#0F3A3E] font-medium mb-3">
                    Quantidade
                  </p>
                  <div className="flex items-center border border-[#E0D8C7] w-fit">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center text-[#0F3A3E] hover:bg-[#F8F4EA] transition-colors"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center text-[15px] font-medium text-[#0F3A3E]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-10 flex items-center justify-center text-[#0F3A3E] hover:bg-[#F8F4EA] transition-colors"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-4 text-[12px] uppercase tracking-[0.14em] font-semibold transition-all",
                      isAdding
                        ? "bg-[#1c6b4a] text-white"
                        : "bg-[#0F3A3E] text-white hover:bg-[#16504F]"
                    )}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {isAdding ? "Adicionado!" : "Adicionar ao Carrinho"}
                  </button>

                  <button
                    onClick={handleWishlist}
                    className={cn(
                      "w-12 flex items-center justify-center border transition-colors",
                      isWishlisted
                        ? "border-[#B07B1E] text-[#B07B1E] bg-[#B07B1E]/5"
                        : "border-[#E0D8C7] text-[#0F3A3E] hover:border-[#B07B1E] hover:text-[#B07B1E]"
                    )}
                    aria-label={isWishlisted ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Heart className={cn("h-5 w-5", isWishlisted && "fill-current")} />
                  </button>
                </div>

                {/* View Full Details Link */}
                <Link
                  to="/produto/$id"
                  params={{ id: product.id }}
                  onClick={onClose}
                  className="mt-6 text-center text-[13px] text-[#0F3A3E] underline hover:text-[#B07B1E] transition-colors"
                >
                  Ver detalhes completos →
                </Link>

                {/* Benefits */}
                <div className="mt-auto pt-6 border-t border-[#E0D8C7] grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-[#51635F]">
                    <span className="text-[#B07B1E]">✓</span>
                    Frete grátis +R$199
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#51635F]">
                    <span className="text-[#B07B1E]">✓</span>
                    Até 10x sem juros
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#51635F]">
                    <span className="text-[#B07B1E]">✓</span>
                    Produto original
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#51635F]">
                    <span className="text-[#B07B1E]">✓</span>
                    Troca garantida
                  </div>
                </div>
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
