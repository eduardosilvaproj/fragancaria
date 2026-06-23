import { Button } from "../ui/button";
import { Heart, Eye, ShoppingBag, Check } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ShopifyProduct } from "@/lib/shopify/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";

interface ProductCardProps {
  product: ShopifyProduct;
  index?: number; // Para stagger animation
}

const MotionDiv = motion.div as any;
const MotionImg = motion.img as any;

export const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const selectedVariant = product.node.variants.edges[0]?.node;
  const images = product.node.images.edges;
  const mainImage = images[0]?.node;
  const secondImage = images[1]?.node || images[0]?.node;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedVariant || isAdded) return;

    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || []
    });

    // Feedback visual de sucesso
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);

    toast.success("Adicionado à sacola", {
      description: `${product.node.title} foi adicionado com sucesso.`,
    });
  };

  const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
  const currencyCode = product.node.priceRange.minVariantPrice.currencyCode;

  // Usa compareAtPrice do Shopify para preço "de" (se existir)
  const compareAtPrice = selectedVariant?.compareAtPrice
    ? parseFloat(selectedVariant.compareAtPrice.amount)
    : null;
  const hasDiscount = compareAtPrice && compareAtPrice > price;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col h-full bg-white transition-all duration-500 hover:shadow-[0_30px_60px_rgba(15,58,69,0.08)] p-2 hover:-translate-y-1"
    >
      <Link
        to={`/produto/${product.node.handle}` as any}
        className="relative aspect-[3/4] overflow-hidden bg-[#F3EEE3] mb-4 block"
      >
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {hasDiscount && (
            <span className="bg-[#B07B1E] text-[#0F3A3E] text-[8px] uppercase tracking-[0.2em] px-4 py-2 font-bold">
              Oferta
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
          <button className="w-11 h-11 bg-white flex items-center justify-center text-[#0F3A3E] hover:bg-[#B07B1E] hover:text-[#0F3A3E] transition-all shadow-sm">
            <Heart className="h-4 w-4 stroke-[1.2]" />
          </button>
          <button className="w-11 h-11 bg-white flex items-center justify-center text-[#0F3A3E] hover:bg-[#B07B1E] hover:text-[#0F3A3E] transition-all shadow-sm">
            <Eye className="h-4 w-4 stroke-[1.2]" />
          </button>
        </div>

        {/* Image with Fade Transition and Lazy Loading */}
        <div className="w-full h-full relative">
          {/* Placeholder skeleton while loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#F3EEE3] to-[#EBE8E4] animate-pulse" />
          )}
          <AnimatePresence initial={false}>
            {!isHovered ? (
              <MotionImg
                key="main"
                src={mainImage?.url}
                alt={mainImage?.altText || product.node.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: imageLoaded ? 1 : 0 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 w-full h-full object-cover"
                transition={{ duration: 0.5 }}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <MotionImg
                key="second"
                src={secondImage?.url}
                alt={secondImage?.altText || product.node.title}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 w-full h-full object-cover"
                transition={{ duration: 0.5 }}
                loading="lazy"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Add to Cart Overlay Button */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] z-10">
          <Button
            onClick={handleAddToCart}
            disabled={isLoading || !selectedVariant || isAdded}
            className={`w-full border-none h-12 text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-300 rounded-none ${
              isAdded
                ? "bg-[#22c55e] text-white"
                : "bg-[#0F3A3E] hover:bg-[#B07B1E] hover:text-[#0F3A3E] text-white"
            }`}
            size="lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adicionando...
              </span>
            ) : isAdded ? (
              <span className="flex items-center gap-3">
                <Check className="h-4 w-4" />
                Adicionado!
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <ShoppingBag className="h-4 w-4" />
                Adicionar à Sacola
              </span>
            )}
          </Button>
        </div>
      </Link>

      <div className="flex flex-col flex-1 px-3 text-center pb-4">
        <p className="text-[8px] uppercase tracking-[0.5em] text-[#B07B1E] font-bold mb-2">
          {product.node.vendor}
        </p>

        <Link
          to={`/produto/${product.node.handle}` as any}
          className="font-serif text-[18px] leading-tight mb-4 hover:text-[#B07B1E] transition-colors text-[#1C302E] font-light"
        >
          {product.node.title}
        </Link>

        <div className="mt-auto pt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            {hasDiscount && compareAtPrice && (
              <span className="text-sm text-[#1C302E]/30 line-through font-light">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(compareAtPrice)}
              </span>
            )}
            <span className="text-[22px] font-light text-[#1C302E] tracking-tighter">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price)}
            </span>
            {hasDiscount && compareAtPrice && (
              <span className="bg-[#B07B1E] text-[#0F3A3E] text-[9px] px-2 py-0.5 font-bold">
                -{Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}%
              </span>
            )}
          </div>
          <div className="text-[10px] text-green-600 font-semibold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price * 0.95)} no PIX
          </div>
          <div className="text-[9px] text-[#1C302E]/40 uppercase tracking-[0.2em] font-bold">
            ou 10x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price / 10)} sem juros
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};
