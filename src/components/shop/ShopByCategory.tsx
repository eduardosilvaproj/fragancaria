import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

const MotionDiv = motion.div as any;

const CATEGORIES = [
  { label: "Hidratação", icon: "💧" },
  { label: "Nutrição", icon: "🍯" },
  { label: "Reconstrução", icon: "🧬" },
  { label: "Frizz", icon: "☁️" },
  { label: "Coloração", icon: "🎨" },
  { label: "Loiros", icon: "✨" },
  { label: "Cacheados", icon: "➰" },
  { label: "Cronograma", icon: "📅" },
];

export const ShopByCategory = () => {
  return (
    <section className="py-24 bg-[#F8F6F2]">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-20">
            <div className="section-label !justify-center">
                <span>Curadoria Especializada</span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl mb-6 font-light">Compre como um <span className="italic">Profissional</span></h2>
            <p className="text-[#1C1C1A]/40 text-sm uppercase tracking-[0.3em] font-bold">Qual seu objetivo hoje?</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {CATEGORIES.map((cat, i) => (
            <MotionDiv
              key={cat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative bg-white p-8 md:p-12 text-center border border-black/[0.03] hover:border-[#B8955A] transition-all cursor-pointer overflow-hidden"
            >
              <div className="relative z-10">
                <div className="text-4xl mb-6 grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110">{cat.icon}</div>
                <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#1C1C1A] group-hover:text-[#B8955A] transition-colors">{cat.label}</h4>
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#B8955A]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </MotionDiv>
          ))}
        </div>
        
        <div className="mt-16 flex justify-center">
            <button className="flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] font-bold text-[#1C1C1A] hover:text-[#B8955A] transition-all group">
                Ver todos os tratamentos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
            </button>
        </div>
      </div>
    </section>
  );
};
