import { Button } from "../ui/button";
import { Star, Heart, Eye, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { ShopifyProduct } from "@/lib/shopify/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: ShopifyProduct;
}

const MotionDiv = motion.div as any;

export const ProductCard = ({ product }: ProductCardProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const isLoading = useCartStore((state) => state.isLoading);
  
  const selectedVariant = product.node.variants.edges[0]?.node;
  const mainImage = product.node.images.edges[0]?.node;

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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group flex flex-col h-full bg-white transition-all duration-700"
    >
      <Link 
        to={`/produto/${product.node.handle}` as any}
        className="relative aspect-[3/4] overflow-hidden bg-[#F8F6F2] mb-6 block"
      >
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {product.node.vendor === "Kérastase" && (
            <span className="bg-[#1C1C1A] text-white text-[9px] uppercase tracking-[0.2em] px-4 py-2 font-bold shadow-xl">
              Best Seller
            </span>
          )}
          {product.node.vendor === "Wella Professionals" && (
            <span className="bg-[#B8955A] text-white text-[9px] uppercase tracking-[0.2em] px-4 py-2 font-bold shadow-xl">
              Exclusivo
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
          <button className="w-12 h-12 bg-white rounded-none flex items-center justify-center text-[#1C1C1A] hover:bg-[#B8955A] hover:text-white transition-all shadow-xl">
            <Heart className="h-5 w-5 stroke-[1.2]" />
          </button>
          <button className="w-12 h-12 bg-white rounded-none flex items-center justify-center text-[#1C1C1A] hover:bg-[#B8955A] hover:text-white transition-all shadow-xl">
            <Eye className="h-5 w-5 stroke-[1.2]" />
          </button>
        </div>

        {/* Image */}
        {mainImage ? (
          <img 
            src={mainImage.url} 
            alt={mainImage.altText || product.node.title}
            className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground italic font-serif">
            Sem imagem
          </div>
        )}

        {/* Add to Cart Overlay Button */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-all duration-700 z-10">
          <Button 
            onClick={handleAddToCart}
            disabled={isLoading || !selectedVariant}
            className="w-full bg-[#1C1C1A] hover:bg-[#B8955A] text-white border-none h-14 text-[11px] uppercase tracking-[0.3em] font-bold transition-all rounded-none"
            size="lg"
          >
            {isLoading ? "Processando..." : (
              <span className="flex items-center gap-3">
                <ShoppingBag className="h-4 w-4" />
                Comprar Agora
              </span>
            )}
          </Button>
        </div>
      </Link>

      <div className="flex flex-col flex-1 px-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#B8955A] font-bold mb-4">
          {product.node.vendor}
        </p>
        
        <Link 
          to={`/produto/${product.node.handle}` as any}
          className="font-serif text-2xl leading-tight mb-4 hover:text-[#B8955A] transition-colors text-[#1C1C1A] font-light"
        >
          {product.node.title}
        </Link>
        
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-[#B8955A] text-[#B8955A]" />
          ))}
          <span className="text-[10px] text-[#1C1C1A]/40 ml-2 tracking-widest font-bold">({Math.floor(Math.random() * 100) + 40})</span>
        </div>

        <div className="mt-auto pt-4 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#1C1C1A]/30 line-through font-light">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price * 1.15)}
            </span>
            <span className="text-2xl font-light text-[#1C1C1A] tracking-tighter">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-[#1C1C1A]/60 uppercase tracking-[0.2em] font-medium">
              ou 10x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price / 10)}
            </div>
            <div className="text-[11px] text-[#B8955A] font-bold uppercase tracking-[0.2em] bg-[#B8955A]/5 px-4 py-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price * 0.95)} no Pix
            </div>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};