import { motion } from "framer-motion";
import { Droplets, Sparkles, Dna, Palette, Wind, Sun, Scissors, Heart } from "lucide-react";

const MotionDiv = motion.div as any;

const CATEGORIES = [
  { label: "Hidratação", icon: Droplets },
  { label: "Nutrição", icon: Heart },
  { label: "Reconstrução", icon: Dna },
  { label: "Coloração", icon: Palette },
  { label: "Finalização", icon: Wind },
  { label: "Proteção Solar", icon: Sun },
  { label: "Tratamentos", icon: Sparkles },
  { label: "Corte e Styling", icon: Scissors },
];

export const ShopByCategory = () => {
  return (
    <section className="py-24 bg-[#F7F5F2]">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-16">
          <div className="section-label !justify-center">
            <span>Objetivos</span>
          </div>
          <h2 className="font-serif font-light text-[#1A1A1A] text-3xl md:text-4xl">
            Por <span className="italic text-[#D4AF37]">Necessidade</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-6">
          {CATEGORIES.map((cat, i) => {
            const IconComponent = cat.icon;
            return (
              <MotionDiv
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col items-center gap-4 group cursor-pointer"
              >
                <div className="w-20 h-20 bg-white border border-[#0F3A45]/10 flex items-center justify-center group-hover:bg-[#0F3A45] group-hover:border-[#0F3A45] transition-all duration-700">
                  <IconComponent className="h-7 w-7 text-[#0F3A45] group-hover:text-[#D4AF37] stroke-[1.2] transition-colors duration-500" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors text-center">
                  {cat.label}
                </span>
              </MotionDiv>
            );
          })}
        </div>
      </div>
    </section>
  );
};
