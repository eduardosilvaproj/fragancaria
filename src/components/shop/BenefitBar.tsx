import { motion } from "framer-motion";
import { ShieldCheck, Truck, RotateCcw, CheckCircle2, MessageCircle } from "lucide-react";

const MotionDiv = motion.div as any;

const BENEFITS = [
  { icon: Truck, text: "Entrega para todo Brasil", detail: "Frete grátis em compras selecionadas" },
  { icon: ShieldCheck, text: "Produtos 100% Originais", detail: "Distribuidor oficial das grandes marcas" },
  { icon: RotateCcw, text: "Troca sutil em 30 dias", detail: "Garantia de satisfação absoluta" },
  { icon: CheckCircle2, text: "Até 10x sem juros", detail: "Parcelamento facilitado no cartão" },
  { icon: MessageCircle, text: "Consultoria WhatsApp", detail: "Atendimento por especialistas" },
];

export const BenefitBar = () => {
  return (
    <section className="bg-white py-16 border-b border-black/5 overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 md:gap-8">
          {BENEFITS.map((item, index) => (
            <MotionDiv 
              key={item.text}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center group cursor-default"
            >
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-[#B8955A]/10 scale-0 group-hover:scale-150 rounded-full transition-transform duration-700" />
                <item.icon className="h-8 w-8 text-[#B8955A] stroke-[1] relative z-10 transition-transform duration-700 group-hover:scale-110" />
              </div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1C1C1A] mb-2">{item.text}</h4>
              <p className="text-[9px] uppercase tracking-widest text-[#1C1C1A]/40 font-medium">{item.detail}</p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
};