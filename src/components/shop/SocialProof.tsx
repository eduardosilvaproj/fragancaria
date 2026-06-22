import { motion } from "framer-motion";
import { ShieldCheck, Truck, Package } from "lucide-react";

const MotionDiv = motion.div as any;

const STATS = [
  { icon: ShieldCheck, title: "Produtos Originais", detail: "Garantia de procedência em todos os itens." },
  { icon: Truck, title: "Entrega para Todo Brasil", detail: "Envio seguro e rastreável." },
  { icon: Package, title: "Embalagem Cuidadosa", detail: "Produtos protegidos para chegarem perfeitos." },
];

export const SocialProof = () => {
  return (
    <section className="py-16 bg-white border-y border-black/[0.03]">
      <div className="container mx-auto px-4 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-[1px] bg-[#D4AF37]" />
              <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#D4AF37]">
                Por que escolher a Fragranciaria
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl mb-6 font-light leading-tight">
              Sua Boutique de <span className="italic text-[#D4AF37]">Cosméticos Profissionais</span>
            </h2>
            <p className="text-[#1A1A1A]/50 text-sm mb-12 leading-relaxed font-light">
              Selecionamos os melhores produtos capilares profissionais para você cuidar dos seus fios em casa com qualidade de salão.
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
                  <div className="w-12 h-12 bg-[#F7F5F2] flex items-center justify-center shrink-0">
                    <stat.icon className="h-5 w-5 text-[#D4AF37] stroke-[1.2]" />
                  </div>
                  <div>
                    <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1">{stat.title}</h4>
                    <p className="text-[11px] text-[#1A1A1A]/40 font-bold uppercase tracking-widest">{stat.detail}</p>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200&auto=format&fit=crop"
                alt="Cosméticos profissionais"
                className="w-full h-full object-cover grayscale opacity-80"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
