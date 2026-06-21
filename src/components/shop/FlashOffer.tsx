import { motion } from "framer-motion";
import { Timer, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";

const MotionDiv = motion.div as any;

const FLASH_PRODUCTS = [
  {
    node: {
      id: "f1",
      title: "Resistance Masque Thérapiste",
      handle: "kerastase-resistance-masque",
      vendor: "Kérastase",
      description: "Reconstrução profunda para cabelos muito danificados.",
      priceRange: { minVariantPrice: { amount: "258.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=800&auto=format&fit=crop", altText: "Kérastase Resistance" } }] },
      variants: { edges: [{ node: { id: "vf1", title: "Default", price: { amount: "258.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  },
  {
    node: {
      id: "f2",
      title: "Oil Reflections Light Oil",
      handle: "wella-oil-reflections",
      vendor: "Wella Professionals",
      description: "Óleo leve para luminosidade instantânea.",
      priceRange: { minVariantPrice: { amount: "185.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1597354984706-fac992d9306f?q=80&w=800&auto=format&fit=crop", altText: "Wella Oil" } }] },
      variants: { edges: [{ node: { id: "vf2", title: "Default", price: { amount: "185.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  }
];

export const FlashOffer = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 45, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-24 bg-[#F7F5F2]">
      <div className="container mx-auto px-4 md:px-12">
        <div className="bg-white border border-black/[0.03] p-12 md:p-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-md">
              <div className="flex items-center gap-3 text-[#D4AF37] mb-6">
                <Timer className="h-5 w-5" />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold">OFERTA RELÂMPAGO</span>
              </div>
              <h2 className="font-serif text-4xl mb-6 font-light">Campanha <span className="italic">Limitada</span></h2>
              <p className="text-[#1A1A1A]/50 text-sm mb-10 leading-relaxed font-light">
                Seleção exclusiva de produtos profissionais com condições especiais por tempo limitado. 
              </p>
              
              <div className="flex gap-4 mb-10">
                {[
                  { label: "Hrs", value: timeLeft.hours },
                  { label: "Min", value: timeLeft.minutes },
                  { label: "Seg", value: timeLeft.seconds }
                ].map(unit => (
                  <div key={unit.label} className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-[#0F3A45] text-white flex items-center justify-center font-serif text-2xl font-light">
                      {unit.value.toString().padStart(2, '0')}
                    </div>
                    <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A]/30 mt-2">{unit.label}</span>
                  </div>
                ))}
              </div>

              <Button variant="outline" className="border-[#0F3A45]/20 hover:border-[#0F3A45] hover:bg-[#0F3A45] hover:text-white px-12 h-14 rounded-none text-[10px] uppercase tracking-[0.4em] font-bold transition-all">
                Ver Todas as Ofertas
                <ArrowRight className="ml-4 h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 flex-1">
              {FLASH_PRODUCTS.map(product => (
                <ProductCard key={product.node.id} product={product as any} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
