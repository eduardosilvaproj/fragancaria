import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";

const MotionDiv = motion.div as any;

const RITUAL_STEPS = [
  { name: "Passo 01: Limpar", title: "Shampoo Nutritive", image: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?q=80&w=400&auto=format&fit=crop", brand: "Kérastase" },
  { name: "Passo 02: Tratar", title: "Máscara Fusion", image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=400&auto=format&fit=crop", brand: "Wella" },
  { name: "Passo 03: Blindar", title: "Leave-in Cicanuit", image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop", brand: "Kérastase" },
  { name: "Passo 04: Finalizar", title: "Óleo Elixir", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=400&auto=format&fit=crop", brand: "Kérastase" },
];

export const RitualSection = () => {
  return (
    <section className="bg-[#1C1C1A] text-white overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#B8955A] rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 md:px-12 relative z-10">
        <div className="text-center mb-24 py-24">
          <div className="section-label !justify-center">
            <span className="!text-white/40 tracking-[0.5em]">Experiência de Salão</span>
          </div>
          <h2 className="font-serif font-light text-white text-4xl md:text-5xl lg:text-7xl mb-12 leading-tight">
            Monte seu Ritual <span className="italic text-[#B8955A]">Completo</span>
          </h2>
          <div className="flex flex-col items-center gap-4 mb-10">
              <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">Economize até 15% comprando o ritual completo</span>
              <div className="flex flex-wrap justify-center gap-6 text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">
                  <span className="flex items-center gap-2">✔ Produtos compatíveis</span>
                  <span className="flex items-center gap-2">✔ Resultado potencializado</span>
                  <span className="flex items-center gap-2">✔ Seleção profissional</span>
              </div>
          </div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 max-w-2xl mx-auto font-bold opacity-0 h-0 overflow-hidden">
            A combinação exata de ativos para transformar a saúde dos seus fios. Economize até 15% na compra do ritual personalizado.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10 mb-16">
          {RITUAL_STEPS.map((step, index) => (
            <MotionDiv 
              key={step.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative"
            >
              <div className="aspect-[3/4] overflow-hidden mb-8 bg-white/[0.02] border border-white/[0.05] group-hover:border-[#B8955A]/30 transition-all duration-700">
                <img 
                  src={step.image} 
                  alt={step.name}
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110"
                />
              </div>
              <div className="text-center md:text-left">
                <span className="text-[9px] uppercase tracking-[0.4em] font-bold text-[#B8955A] block mb-2">{step.name}</span>
                <h4 className="text-[18px] font-serif font-light text-white">{step.title}</h4>
              </div>
            </MotionDiv>
          ))}
        </div>

        <div className="flex justify-center">
          <MotionDiv 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-white/[0.03] border border-white/[0.05] p-12 md:p-16 backdrop-blur-3xl flex flex-col md:flex-row items-center gap-12 w-full max-w-5xl"
          >
            <div className="flex-1 text-center md:text-left">
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B8955A] mb-4 block">Oferta de Curadoria</span>
              <h3 className="font-serif text-3xl mb-4 text-white font-light">Ritual de Reconstrução Absoluta</h3>
              <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold">Kérastase + Wella + Sebastian</p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-6">
                <div className="flex items-center gap-6">
                    <span className="text-white/20 line-through text-lg font-light">R$ 998,00</span>
                    <span className="text-[#B8955A] text-4xl font-light">R$ 842,00</span>
                </div>
                <Button className="bg-[#B8955A] hover:bg-white text-black hover:text-[#1C1C1A] px-16 h-18 rounded-none text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-700 w-full md:w-auto shadow-[0_20px_50px_rgba(184,149,90,0.1)]">
                Comprar Ritual Completo
                </Button>
            </div>
          </MotionDiv>
        </div>
      </div>
    </section>
  );
};
