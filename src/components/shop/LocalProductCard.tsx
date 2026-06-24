import { Button } from "../ui/button";
import { Heart, Eye, ShoppingBag } from "lucide-react";
import { Product } from "@/data/products";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { useCartStore } from "@/stores/cartStore";

interface LocalProductCardProps {
  product: Product;
}

const MotionDiv = motion.div as any;

export const LocalProductCard = ({ product }: LocalProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAdding(true);
    addItem({
      id: product.id,
      title: product.name,
      price: product.price,
      quantity: 1,
      image: product.images[0] || "",
      vendor: product.brand || "",
    });
    setTimeout(() => setIsAdding(false), 800);

    toast.success("Adicionado à sacola", {
      description: `${product.name} foi adicionado com sucesso.`,
    });
  };

  // Só mostrar desconto se originalPrice vier do Shopify (compare_at_price)
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discount = hasDiscount && product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col h-full bg-white border border-[#E9E1D2] transition-all duration-300 hover:shadow-[0_18px_40px_rgba(15,58,62,0.10)] hover:-translate-y-1"
    >
      <Link
        to={`/produto/${product.id}` as any}
        className="relative aspect-square overflow-hidden bg-[#F8F4EA] block"
      >
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {hasDiscount && discount > 0 && (
            <span className="bg-[#0F3A3E] text-white text-[11px] font-semibold tracking-[0.04em] px-3 py-1.5">
              -{discount}% OFF
            </span>
          )}
          {product.isNew && (
            <span className="bg-[#B07B1E] text-white text-[11px] font-semibold tracking-[0.04em] px-3 py-1.5">
              Novo
            </span>
          )}
        </div>

        {/* Quick Actions - só desktop */}
        <div className="hidden md:flex absolute top-4 right-4 z-10 flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <button className="w-10 h-10 rounded-full bg-[#0F3A3E]/10 flex items-center justify-center text-[#0F3A3E] hover:bg-[#B07B1E] hover:text-white transition-all">
            <Heart className="h-4 w-4" />
          </button>
        </div>

        {/* Image */}
        <div className="w-full h-full relative p-6">
          <img
            src={product.images[0]}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4 md:p-5">
        {/* Brand eyebrow */}
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#B07B1E] font-medium mb-2">
          {product.brand}
        </p>

        {/* Product name */}
        <Link
          to={`/produto/${product.id}` as any}
          className="font-serif text-[17px] md:text-[18px] leading-tight mb-3 text-[#0F3A3E] font-medium line-clamp-2 hover:text-[#B07B1E] transition-colors"
        >
          {product.name}
        </Link>

        {/* Price section */}
        <div className="mt-auto pt-3 border-t border-[#E9E1D2]">
          <div className="flex items-baseline gap-3 mb-1">
            {hasDiscount && product.originalPrice && (
              <span className="text-[13px] text-[#C3BCA8] line-through">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.originalPrice)}
              </span>
            )}
            <span className="font-serif text-[22px] text-[#0F3A3E]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
            </span>
          </div>
          <p className="text-[11px] text-[#8A938E] mb-4">
            ou <strong className="text-[#0F3A3E]">10x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price / 10)}</strong> sem juros
          </p>

          {/* Add to cart button */}
          <Button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full bg-[#0F3A3E] hover:bg-[#16504F] text-white h-12 text-[12px] uppercase tracking-[0.16em] font-medium transition-all rounded-none"
            size="lg"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              {isAdding ? "Adicionando..." : "Adicionar ao Carrinho"}
            </span>
          </Button>
        </div>
      </div>
    </MotionDiv>
  );
};
