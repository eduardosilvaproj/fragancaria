import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag, Plus } from "lucide-react";
import { Button } from "../ui/button";

const MotionDiv = motion.div as any;

const RITUAL_STEPS = [
  { name: "Shampoo", image: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?q=80&w=400&auto=format&fit=crop", brand: "Kérastase" },
  { name: "Máscara", image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=400&auto=format&fit=crop", brand: "Wella" },
  { name: "Leave-in", image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop", brand: "Sebastian" },
  { name: "Óleo", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=400&auto=format&fit=crop", brand: "Kérastase" },
  { name: "Finalizador", image: "https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=400&auto=format&fit=crop", brand: "Keune" },
];

export const RitualSection = () => {
  return (
    <section className="py-40 bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#B8955A]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-1/3 h-full bg-[#B8955A]/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 md:px-12 relative z-10">
        <div className="text-center mb-24">
          <MotionDiv 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-6 mb-8"
          >
            <div className="w-16 h-[1px] bg-[#B8955A]" />
            <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">Experiência de Salão</span>
            <div className="w-16 h-[1px] bg-[#B8955A]" />
          </MotionDiv>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-serif text-5xl md:text-7xl font-light mb-8"
          >
            Monte seu Ritual <span className="italic">Completo</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-[12px] uppercase tracking-[0.3em] text-white/50 max-w-2xl mx-auto font-medium"
          >
            A combinação exata de ativos para transformar a saúde dos seus fios. Economize até 15% na compra do ritual completo.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-12 mb-24">
          {RITUAL_STEPS.map((step, index) => (
            <MotionDiv 
              key={step.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="aspect-[3/4] overflow-hidden mb-6 bg-white/5 border border-white/10 group-hover:border-[#B8955A]/50 transition-all duration-700">
                <img 
                  src={step.image} 
                  alt={step.name}
                  className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40" />
                <div className="absolute bottom-6 left-0 right-0 text-center">
                  <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">{step.name}</span>
                </div>
              </div>
              {index < RITUAL_STEPS.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 z-20 items-center justify-center">
                   <Plus className="h-4 w-4 text-[#B8955A]/40" />
                </div>
              )}
            </MotionDiv>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <MotionDiv 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/5 border border-white/10 p-12 backdrop-blur-xl flex flex-col md:flex-row items-center gap-12 w-full max-w-4xl"
          >
            <div className="flex-1">
              <h3 className="font-serif text-3xl mb-4">Ritual de Reconstrução Absoluta</h3>
              <p className="text-white/40 text-sm mb-6">Combo exclusivo: Kérastase + Wella + Sebastian</p>
              <div className="flex items-center gap-4">
                <span className="text-[#B8955A] text-3xl font-light">R$ 842,00</span>
                <span className="text-white/20 line-through text-lg">R$ 998,00</span>
                <span className="bg-[#B8955A] text-black text-[10px] font-bold px-3 py-1 uppercase tracking-widest">-15% OFF</span>
              </div>
            </div>
            <Button className="bg-[#B8955A] hover:bg-white text-black hover:text-[#1C1C1A] px-12 h-16 rounded-none text-[12px] uppercase tracking-[0.3em] font-bold transition-all duration-500 w-full md:w-auto">
              Comprar Ritual Completo
            </Button>
          </MotionDiv>
        </div>
      </div>
    </section>
  );
};