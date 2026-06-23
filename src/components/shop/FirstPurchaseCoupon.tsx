import { motion } from "framer-motion";
import { Ticket, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MotionDiv = motion.div as any;

// Cupom configurável
const COUPON_CODE = "BEMVINDO10";
const COUPON_DISCOUNT = "10%";
const COUPON_DESCRIPTION = "na primeira compra";

export const FirstPurchaseCoupon = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(COUPON_CODE);
    setCopied(true);
    toast.success("Cupom copiado!", {
      description: `Use ${COUPON_CODE} no checkout para ${COUPON_DISCOUNT} de desconto.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-gradient-to-r from-[#B07B1E] to-[#B8962E] py-6">
      <div className="container mx-auto px-4">
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8"
        >
          <div className="flex items-center gap-3">
            <Ticket className="h-6 w-6 text-[#0F3A3E]" />
            <span className="text-[#0F3A3E] font-bold text-sm md:text-base uppercase tracking-wide">
              Primeira compra?
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[#0F3A3E]/80 text-sm">
              Use o cupom
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-[#0F3A3E] text-white px-4 py-2 font-mono font-bold text-sm hover:bg-[#0F3A3E]/90 transition-colors"
            >
              <span>{COUPON_CODE}</span>
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <span className="text-[#0F3A3E] font-bold text-lg">
              {COUPON_DISCOUNT} OFF
            </span>
            <span className="text-[#0F3A3E]/70 text-sm hidden md:inline">
              {COUPON_DESCRIPTION}
            </span>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
};
