import { Button } from "../ui/button";
import { Heart, Eye, ShoppingBag } from "lucide-react";
import { Product } from "@/data/products";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";

interface LocalProductCardProps {
  product: Product;
}

const MotionDiv = motion.div as any;

export const LocalProductCard = ({ product }: LocalProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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
      className="group flex flex-col h-full bg-white transition-all duration-1000 hover:shadow-[0_30px_60px_rgba(15,58,69,0.06)] p-2"
    >
      <Link
        to={`/produto/${product.id}` as any}
        className="relative aspect-[3/4] overflow-hidden bg-[#F7F5F2] mb-4 block"
      >
        {/* Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          {hasDiscount && discount > 0 && (
            <span className="bg-[#D4AF37] text-[#0F3A45] text-[8px] uppercase tracking-[0.2em] px-4 py-2 font-bold">
              -{discount}% OFF
            </span>
          )}
          {product.isNew && (
            <span className="bg-[#0F3A45] text-white text-[8px] uppercase tracking-[0.2em] px-4 py-2 font-bold">
              Novo
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
          <button className="w-11 h-11 bg-white flex items-center justify-center text-[#0F3A45] hover:bg-[#D4AF37] hover:text-[#0F3A45] transition-all shadow-sm">
            <Heart className="h-4 w-4 stroke-[1.2]" />
          </button>
          <button className="w-11 h-11 bg-white flex items-center justify-center text-[#0F3A45] hover:bg-[#D4AF37] hover:text-[#0F3A45] transition-all shadow-sm">
            <Eye className="h-4 w-4 stroke-[1.2]" />
          </button>
        </div>

        {/* Image */}
        <div className="w-full h-full relative">
          <img
            src={product.images[0]}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
          />
        </div>

        {/* Add to Cart Overlay Button */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] z-10">
          <Button
            onClick={handleAddToCart}
            className="w-full bg-[#0F3A45] hover:bg-[#D4AF37] hover:text-[#0F3A45] text-white border-none h-12 text-[10px] uppercase tracking-[0.3em] font-bold transition-all rounded-none"
            size="lg"
          >
            <span className="flex items-center gap-3">
              <ShoppingBag className="h-4 w-4" />
              Adicionar à Sacola
            </span>
          </Button>
        </div>
      </Link>

      <div className="flex flex-col flex-1 px-3 text-center pb-4">
        <p className="text-[8px] uppercase tracking-[0.5em] text-[#D4AF37] font-bold mb-2">
          {product.brand}
        </p>

        <Link
          to={`/produto/${product.id}` as any}
          className="font-serif text-[16px] leading-tight mb-4 hover:text-[#D4AF37] transition-colors text-[#1A1A1A] font-light line-clamp-2"
        >
          {product.name}
        </Link>

        <div className="mt-auto pt-4 flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            {hasDiscount && product.originalPrice && (
              <span className="text-sm text-[#1A1A1A]/30 line-through font-light">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.originalPrice)}
              </span>
            )}
            <span className="text-[22px] font-light text-[#1A1A1A] tracking-tighter">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
            </span>
          </div>
          <div className="text-[9px] text-[#1A1A1A]/40 uppercase tracking-[0.2em] font-bold">
            ou 10x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price / 10)} sem juros
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};
