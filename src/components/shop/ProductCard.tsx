import { Button } from "../ui/button";
import { ShoppingBag, Star, Plus, Heart, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { ShopifyProduct } from "@/lib/shopify/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

interface ProductCardProps {
  product: ShopifyProduct;
}

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
      className="group flex flex-col h-full bg-white transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]"
    >
      <Link 
        to={`/produto/${product.node.handle}` as any}
        className="relative aspect-[4/5] overflow-hidden bg-[#F8F6F2] mb-6 block"
      >
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {product.node.vendor === "Kérastase" && (
            <span className="bg-[#1C1C1A] text-white text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 font-medium">
              Best Seller
            </span>
          )}
          {product.node.vendor === "Wella Professionals" && (
            <span className="bg-primary text-white text-[9px] uppercase tracking-[0.2em] px-3 py-1.5 font-medium">
              Exclusivo
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1C1C1A] hover:bg-primary hover:text-white transition-all shadow-sm">
            <Heart className="h-4 w-4 stroke-[1.2]" />
          </button>
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1C1C1A] hover:bg-primary hover:text-white transition-all shadow-sm">
            <Eye className="h-4 w-4 stroke-[1.2]" />
          </button>
        </div>

        {/* Image */}
        {mainImage ? (
          <img 
            src={mainImage.url} 
            alt={mainImage.altText || product.node.title}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground italic font-serif">
            Sem imagem
          </div>
        )}

        {/* Add to Cart Overlay Button */}
        <div className="absolute inset-x-4 bottom-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-10">
          <Button 
            onClick={handleAddToCart}
            disabled={isLoading || !selectedVariant}
            className="w-full bg-[#1C1C1A] hover:bg-primary text-white border-none h-12 text-[11px] uppercase tracking-[0.2em] font-bold transition-all"
            size="lg"
          >
            {isLoading ? "Processando..." : "Adicionar à Sacola"}
          </Button>
        </div>
      </Link>

      <div className="flex flex-col flex-1 px-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-medium mb-3">
          {product.node.vendor}
        </p>
        
        <Link 
          to={`/produto/${product.node.handle}` as any}
          className="font-serif text-xl leading-tight mb-3 hover:text-primary transition-colors text-[#1C1C1A]"
        >
          {product.node.title}
        </Link>
        
        <div className="flex items-center justify-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-2.5 w-2.5 fill-primary text-primary" />
          ))}
          <span className="text-[9px] text-muted-foreground ml-1 tracking-widest">(24)</span>
        </div>
        
        <div className="mt-auto pt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            {product.node.vendor === "Kérastase" && (
              <span className="text-sm text-muted-foreground line-through opacity-60">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price * 1.2)}
              </span>
            )}
            <span className="text-base font-medium text-[#1C1C1A] tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
