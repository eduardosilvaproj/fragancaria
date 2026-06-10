import { motion } from "framer-motion";
import { ShieldCheck, Truck, RotateCcw, CheckCircle2, MessageCircle } from "lucide-react";

const MotionDiv = motion.div as any;

const BENEFITS = [
  { icon: Truck, text: "Entrega Expressa", detail: "Todo o Brasil" },
  { icon: ShieldCheck, text: "100% Original", detail: "Distribuidor Oficial" },
  { icon: RotateCcw, text: "Troca Sutil", detail: "Satisfação Absoluta" },
  { icon: CheckCircle2, text: "Até 10x sem juros", detail: "Cartão de Crédito" },
  { icon: MessageCircle, text: "Consultoria Real", detail: "Via WhatsApp" },
];

export const BenefitBar = () => {
  return (
    <section className="bg-[#F8F6F2] py-20 border-y border-black/[0.03] overflow-hidden">
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
                <item.icon className="h-6 w-6 text-[#B8955A] stroke-[1.2] transition-transform duration-700 group-hover:scale-110" />
              </div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1C1C1A] mb-2">{item.text}</h4>
              <p className="text-[9px] uppercase tracking-widest text-[#1C1C1A]/30 font-bold">{item.detail}</p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
};
