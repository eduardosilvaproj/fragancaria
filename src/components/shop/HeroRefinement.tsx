import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const MotionDiv = motion.div as any;

export const HeroRefinement = () => {
  return (
    <div className="flex flex-col items-center md:items-start gap-6 mt-8 md:mt-10 pb-6 md:pb-10 w-full">
      {/* Trust Badges Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.2em] font-bold text-[#B07B1E]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 opacity-60" />
          <span>Produtos 100% Originais</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 opacity-60" />
          <span>Entrega para Todo Brasil</span>
        </div>
      </div>
    </div>
  );
};
