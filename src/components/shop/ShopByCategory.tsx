import { motion } from "framer-motion";
import { Droplets, Sparkles, Dna, Palette, Wind, Sun, Scissors, Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";

const MotionDiv = motion.div as any;

const CATEGORIES = [
  { label: "Hidratação", icon: Droplets, productType: "Hidratação" },
  { label: "Nutrição", icon: Heart, productType: "Nutrição" },
  { label: "Reconstrução", icon: Dna, productType: "Reconstrução" },
  { label: "Coloração", icon: Palette, productType: "Coloração" },
  { label: "Finalização", icon: Wind, productType: "Finalizador" },
  { label: "Proteção Solar", icon: Sun, productType: "Proteção" },
  { label: "Tratamentos", icon: Sparkles, productType: "Tratamento" },
  { label: "Corte e Styling", icon: Scissors, productType: "Styling" },
];

export const ShopByCategory = () => {
  return (
    <section className="py-24 bg-[#F3EEE3]">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-16">
          <div className="section-label !justify-center">
            <span>Objetivos</span>
          </div>
          <h2 className="font-serif font-light text-[#1C302E] text-3xl md:text-4xl">
            Por <span className="italic text-[#B07B1E]">Necessidade</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-6">
          {CATEGORIES.map((cat, i) => {
            const IconComponent = cat.icon;
            return (
              <Link
                key={cat.label}
                to="/produtos"
                search={{ productType: cat.productType }}
              >
                <MotionDiv
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-col items-center gap-4 group cursor-pointer"
                >
                  <div className="w-20 h-20 bg-white border border-[#0F3A3E]/10 flex items-center justify-center group-hover:bg-[#0F3A3E] group-hover:border-[#0F3A3E] transition-all duration-700">
                    <IconComponent className="h-7 w-7 text-[#0F3A3E] group-hover:text-[#B07B1E] stroke-[1.2] transition-colors duration-500" />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#1C302E] group-hover:text-[#B07B1E] transition-colors text-center">
                    {cat.label}
                  </span>
                </MotionDiv>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
