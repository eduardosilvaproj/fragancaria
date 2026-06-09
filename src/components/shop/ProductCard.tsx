import { Button } from "../ui/button";
import { ShoppingBag, Star, Plus } from "lucide-react";
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
    <div className="group flex flex-col h-full bg-white transition-all duration-300">
      <Link 
        to={`/produto/${product.node.handle}` as any}
        className="relative aspect-[3/4] overflow-hidden bg-secondary mb-4"
      >
        {/* Brand Tag */}
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-white/90 backdrop-blur-sm text-[10px] uppercase tracking-widest px-2 py-1 font-bold">
            {product.node.vendor}
          </span>
        </div>

        {/* Hover Action */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {mainImage ? (
          <img 
            src={mainImage.url} 
            alt={mainImage.altText || product.node.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground italic">
            Sem imagem
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <Button 
            onClick={handleAddToCart}
            disabled={isLoading || !selectedVariant}
            className="w-full shadow-xl"
            size="sm"
          >
            {isLoading ? "Adicionando..." : "Adicionar à Sacola"}
          </Button>
        </div>
      </Link>

      <div className="flex flex-col flex-1 px-1">
        <div className="flex items-center gap-1 mb-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-primary text-primary" />
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">(24)</span>
        </div>
        
        <Link 
          to={`/produto/${product.node.handle}` as any}
          className="font-serif text-lg leading-tight mb-2 hover:text-primary transition-colors"
        >
          {product.node.title}
        </Link>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1">
          {product.node.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
          <span className="font-medium">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currencyCode }).format(price)}
          </span>
          <button 
            onClick={handleAddToCart}
            className="md:hidden p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
