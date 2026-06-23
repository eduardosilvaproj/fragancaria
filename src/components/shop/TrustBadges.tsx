import { motion } from "framer-motion";
import { ShieldCheck, Truck, CreditCard, RotateCcw, FileText, Award } from "lucide-react";

const MotionDiv = motion.div as any;

const TRUST_BADGES = [
  {
    icon: ShieldCheck,
    title: "Compra Segura",
    description: "Site 100% protegido",
  },
  {
    icon: FileText,
    title: "Nota Fiscal",
    description: "Em toda compra",
  },
  {
    icon: CreditCard,
    title: "Mercado Pago",
    description: "Pagamento seguro",
  },
  {
    icon: RotateCcw,
    title: "Troca Garantida",
    description: "7 dias para trocar",
  },
  {
    icon: Award,
    title: "Produtos Originais",
    description: "Garantia de procedência",
  },
  {
    icon: Truck,
    title: "Entrega Rápida",
    description: "Para todo Brasil",
  },
];

export const TrustBadges = () => {
  return (
    <section className="bg-[#F3EEE3] py-12 border-y border-black/5">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-4">
          {TRUST_BADGES.map((badge, i) => (
            <MotionDiv
              key={badge.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow border border-[#B07B1E]/20">
                <badge.icon className="h-5 w-5 text-[#B07B1E]" />
              </div>
              <h4 className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#1C302E] mb-1">
                {badge.title}
              </h4>
              <p className="text-[10px] text-[#1C302E]/50">
                {badge.description}
              </p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
};
