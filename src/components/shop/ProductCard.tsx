import { Button } from "../ui/button";
import { Star, Heart, Eye, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ShopifyProduct } from "@/lib/shopify/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ProductCardProps {
  product: ShopifyProduct;
}

const MotionDiv = motion.div as any;
const MotionImg = motion.img as any;

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  const [isHovered, setIsHovered] = useState(false);
  
  const selectedVariant = product.node.variants.edges[0]?.node;
  const images = product.node.images.edges;
  const mainImage = images[0]?.node;
  const secondImage = images[1]?.node || images[0]?.node;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedVariant) return;
    
    await addItem({
      product,
      variantId: selectedVariant.id,
      variantTitle: selectedVariant.title,
      price: selectedVariant.price,
      quantity: 1,
      selectedOptions: selectedVariant.selectedOptions || []
    });
    
    toast.success("Adicionado à sacola", {
      description: `${product.node.title} foi adicionado com sucesso.`,
    });
  };

  const price = parseFloat(product.node.priceRange.minVariantPrice.amount);
  const currencyCode = product.node.priceRange.minVariantPrice.currencyCode;

  return (
    <MotionDiv 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col h-full bg-white transition-all duration-1000 hover:shadow-[0_30px_60px_rgba(0,0,0,0.04)] p-2"
    >
      <Link 
        to={`/produto/${product.node.handle}` as any}
        className="relative aspect-[3/4] overflow-hidden bg-[#F8F6F2] mb-4 block"
      >
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {product.node.vendor === "Kérastase" && (
            <span className="bg-[#1C1C1A] text-white text-[8px] uppercase tracking-[0.2em] px-4 py-2 font-bold">
              Mais Vendido
            </span>
          )}
          {product.node.handle.includes('serum') && (
            <span className="bg-[#B8955A] text-white text-[8px] uppercase tracking-[0.2em] px-4 py-2 font-bold">
              Escolha dos Especialistas
            </span>
          )}
          {!product.node.vendor && (
            <span className="bg-[#B8955A] text-white text-[8px] uppercase tracking-[0.2em] px-4 py-2 font-bold">
              Novo
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
          <button className="w-11 h-11 bg-white flex items-center justify-center text-[#1C1C1A] hover:bg-[#B8955A] hover:text-white transition-all shadow-sm">
            <Heart className="h-4 w-4 stroke-[1.2]" />
          </button>
          <button className="w-11 h-11 bg-white flex items-center justify-center text-[#1C1C1A] hover:bg-[#B8955A] hover:text-white transition-all shadow-sm">
            <Eye className="h-4 w-4 stroke-[1.2]" />
          </button>
        </div>

        {/* Image with Fade Transition */}
        <div className="w-full h-full relative">
          <AnimatePresence initial={false}>
            {!isHovered ? (
              <MotionImg 
                key="main"
                src={mainImage?.url} 
                alt={mainImage?.altText || product.node.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 w-full h-full object-cover"
                transition={{ duration: 0.8 }}
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
                transition={{ duration: 0.8 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Add to Cart Overlay Button */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] z-10">
          <Button 
            onClick={handleAddToCart}
            disabled={isLoading || !selectedVariant}
            className="w-full bg-[#1C1C1A] hover:bg-[#B8955A] text-white border-none h-12 text-[10px] uppercase tracking-[0.3em] font-bold transition-all rounded-none"
            size="lg"
          >
            {isLoading ? "Processando..." : (
              <span className="flex items-center gap-3">
                <ShoppingBag className="h-4 w-4" />
                Comprar Rápido
              </span>
            )}
          </Button>
        </div>
      </Link>

      <div className="flex flex-col flex-1 px-3 text-center pb-4">
        <p className="text-[8px] uppercase tracking-[0.5em] text-[#B8955A] font-bold mb-2">
          {product.node.vendor}
        </p>
        
        <Link 
          to={`/produto/${product.node.handle}` as any}
          className="font-serif text-[18px] leading-tight mb-1 hover:text-[#B8955A] transition-colors text-[#1C1C1A] font-light"
        >
          {product.node.title}
        </Link>
        
        <div className="flex items-center justify-center gap-1 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-[#B8955A] text-[#B8955A]" />
          ))}
          <span className="text-[9px] text-[#1C1C1A]/40 ml-2 tracking-widest font-bold">4.9/5</span>
        </div>

        <div className="mt-auto pt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#1C1C1A]/20 line-through font-light">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price * 1.15)}
            </span>
            <span className="text-[22px] font-light text-[#1C1C1A] tracking-tighter">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price)}
            </span>
          </div>
          <div className="text-[9px] text-[#1C1C1A]/40 uppercase tracking-[0.2em] font-bold">
            ou 10x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price / 10)}
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};
