import { Truck, CreditCard, Percent, Timer } from "lucide-react";

// Valor mínimo para frete grátis - configurável
const FREE_SHIPPING_MIN = 299;
const PIX_DISCOUNT = 5;
const MAX_INSTALLMENTS = 10;

export const FreeShippingBar = () => {
  return (
    <div className="bg-[#0F3A45] text-white py-2.5 text-center sticky top-0 z-50 border-b border-[#D4AF37]/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-[10px] md:text-[11px] uppercase tracking-[0.15em] font-medium">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Frete grátis acima de <strong className="text-[#D4AF37]">R$ {FREE_SHIPPING_MIN}</strong></span>
          </div>
          <span className="hidden md:inline text-white/20">|</span>
          <div className="flex items-center gap-2">
            <CreditCard className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Até <strong className="text-[#D4AF37]">{MAX_INSTALLMENTS}x</strong> sem juros</span>
          </div>
          <span className="hidden md:inline text-white/20">|</span>
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span><strong className="text-[#D4AF37]">{PIX_DISCOUNT}% OFF</strong> no PIX</span>
          </div>
        </div>
      </div>
    </div>
  );
};
