import { motion } from "framer-motion";
import { Truck, ShieldCheck, CreditCard, Lock } from "lucide-react";

const MotionDiv = motion.div as any;

const BENEFITS = [
  { icon: Lock, text: "Compra Segura", detail: "Site protegido SSL" },
  { icon: ShieldCheck, text: "Produtos Autênticos", detail: "Garantia de Procedência" },
  { icon: CreditCard, text: "Até 10x sem juros", detail: "Cartão de Crédito" },
  { icon: Truck, text: "Frete Rastreável", detail: "Entrega para todo Brasil" },
];

export const BenefitBar = () => {
  return (
    <section className="bg-[#0F3A3E]/98 backdrop-blur-xl py-8 border-b border-[#B07B1E]/10 overflow-hidden hidden md:block shadow-[0_-20px_50px_rgba(0,0,0,0.1)] mx-4 md:mx-12 lg:mx-32">
      <div className="container mx-auto px-4 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {BENEFITS.map((item, index) => (
            <MotionDiv
              key={item.text}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-4 group cursor-default"
            >
              <div className="shrink-0">
                <item.icon className="h-5 w-5 text-[#B07B1E] stroke-[1.5] transition-transform duration-700 group-hover:scale-110" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-0.5">{item.text}</h4>
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/40 font-medium">{item.detail}</p>
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
};
