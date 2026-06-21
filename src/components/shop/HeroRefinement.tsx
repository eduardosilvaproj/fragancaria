import { motion } from "framer-motion";
import { Star, CheckCircle2 } from "lucide-react";

const MotionDiv = motion.div as any;

export const HeroRefinement = () => {
  return (
    <div className="flex flex-col items-center md:items-start gap-6 mt-8 md:mt-10 pb-6 md:pb-10 w-full">
      {/* Social Proof Row */}
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.2em] font-bold text-white/70">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 mr-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-2.5 w-2.5 fill-[#D4AF37] text-[#D4AF37]" />
            ))}
          </div>
          <span>4.9/5 • +28 mil seguidores</span>
        </div>
      </div>

      {/* Trust Badges Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.2em] font-bold text-[#D4AF37]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 opacity-60" />
          <span>Produtos 100% Originais</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 opacity-60" />
          <span>Distribuidor Oficial</span>
        </div>
      </div>
    </div>
  );
};
