import { motion } from "framer-motion";
import { CheckCircle2, Star, ShieldCheck, Award, Users } from "lucide-react";

const MotionDiv = motion.div as any;

const STATS = [
  { icon: Users, title: "+28 mil Seguidores", detail: "Comunidade ativa e engajada." },
  { icon: ShieldCheck, title: "100% Originais", detail: "Produtos com garantia de procedência." },
  { icon: Award, title: "Distribuidor Oficial", detail: "Parceria direta com as grandes marcas." },
];

export const SocialProof = () => {
  return (
    <section className="py-24 bg-white border-y border-black/[0.03]">
      <div className="container mx-auto px-4 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="section-label">
              <span>Nossa Autoridade</span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl mb-8 font-light leading-tight">
              A Boutique de Luxo <span className="italic text-[#B8955A]">Consolidada</span> no Mercado Profissional
            </h2>
            <p className="text-[#1C1C1A]/50 text-sm mb-12 leading-relaxed font-light">
              Com anos de experiência e milhares de pedidos enviados para todo o Brasil, a Fragranciaria é referência em curadoria de cosméticos profissionais. Unimos a elegância de uma boutique com a solidez de uma grande operação.
            </p>
            
            <div className="space-y-8">
              {STATS.map((stat, i) => (
                <MotionDiv 
                  key={stat.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6"
                >
                  <div className="w-12 h-12 bg-[#F8F6F2] flex items-center justify-center shrink-0">
                    <stat.icon className="h-5 w-5 text-[#B8955A] stroke-[1.2]" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C1C1A] mb-1">{stat.title}</h4>
                    <p className="text-[11px] text-[#1C1C1A]/40 font-bold uppercase tracking-widest">{stat.detail}</p>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden">
                <img 
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop" 
                alt="Autoridade"
                className="w-full h-full object-cover grayscale opacity-80"
                />
            </div>
            <div className="absolute -bottom-10 -left-10 bg-[#1C1C1A] p-12 text-white hidden md:block">
                <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#B8955A] text-[#B8955A]" />
                    ))}
                </div>
                <h3 className="font-serif text-3xl mb-2">4.9/5</h3>
                <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 font-bold">Baseado em milhares<br />de avaliações reais</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
