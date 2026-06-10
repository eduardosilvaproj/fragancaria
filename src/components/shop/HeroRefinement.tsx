import { motion } from "framer-motion";
import { Star, Truck, ShieldCheck, CreditCard, Gift, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

const MotionDiv = motion.div as any;

export const HeroRefinement = () => {
  return (
    <div className="flex flex-col items-center gap-8 mt-12 pb-12">
      <div className="flex flex-wrap justify-center gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C1C1A]/70">
        <div className="flex items-center gap-2">
          <Star className="h-3 w-3 fill-[#B8955A] text-[#B8955A]" />
          <span>4.9/5 Avaliações</span>
        </div>
        <div className="w-[1px] h-3 bg-black/10" />
        <div>+28 mil seguidores</div>
        <div className="w-[1px] h-3 bg-black/10" />
        <div>Produtos 100% Originais</div>
        <div className="w-[1px] h-3 bg-black/10" />
        <div>Distribuidor Oficial</div>
      </div>
    </div>
  );
};
