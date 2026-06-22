import { motion } from "framer-motion";
import { Sparkles, Brain, ShieldCheck, MessageCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "@tanstack/react-router";

const MotionDiv = motion.div as any;
const MotionH2 = motion.h2 as any;

const PILLARS = [
  { icon: Brain, title: "Diagnóstico IA", desc: "Algoritmos avançados para entender seu fio" },
  { icon: Sparkles, title: "Protocolos Profissionais", desc: "Os mesmos rituais dos melhores salões" },
  { icon: ShieldCheck, title: "Suporte Pós Compra", desc: "Acompanhamento real dos seus resultados" },
  { icon: MessageCircle, title: "Especialistas WhatsApp", desc: "Consultores prontos para te guiar" },
];

export const ConsultancySection = () => {
  return (
    <section className="py-48 bg-[#F7F5F2]/30 overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="flex flex-col lg:flex-row items-center gap-20">
          <div className="flex-1">
            <MotionDiv 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-6 mb-8"
            >
              <div className="w-16 h-[1px] bg-[#D4AF37]" />
              <span className="text-[11px] uppercase tracking-[0.5em] font-bold text-[#D4AF37]">Muito mais que uma loja</span>
            </MotionDiv>
            <MotionH2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-serif text-5xl md:text-7xl font-light text-[#1A1A1A] mb-10 leading-tight"
            >
              Além do comércio.<br /><span className="italic">Uma Consultoria.</span>
            </MotionH2>
            <p className="text-[#1A1A1A]/60 text-lg mb-12 max-w-xl font-light leading-relaxed">
              Você não compra apenas um produto. Recebe orientação baseada em protocolos utilizados pelos melhores profissionais do Brasil. Nossa missão é indicar o ritual ideal para transformar seus cabelos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
              {PILLARS.map((pillar, i) => (
                <MotionDiv 
                  key={pillar.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4"
                >
                  <pillar.icon className="h-6 w-6 text-[#D4AF37] shrink-0" />
                  <div>
                    <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold mb-1.5">{pillar.title}</h4>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-[#1A1A1A]/40 leading-relaxed">{pillar.desc}</p>
                  </div>
                </MotionDiv>
              ))}
            </div>
            <Link to="/contato">
              <Button className="bg-[#0F3A45] hover:bg-[#D4AF37] text-white hover:text-[#0F3A45] px-12 h-16 rounded-none text-[12px] uppercase tracking-[0.3em] font-bold transition-all duration-500">
                Falar com Especialista
              </Button>
            </Link>
          </div>
          
          <div className="flex-1 relative">
            <div className="absolute inset-0 bg-[#D4AF37]/5 -rotate-3 scale-105" />
            <div className="relative aspect-[4/5] overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=800&auto=format&fit=crop" 
                alt="Consultoria"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};