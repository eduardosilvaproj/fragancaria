import { memo } from "react";
import { INSTALLMENTS_LABEL } from "@/config/mercadopago";

interface AnnouncementMarqueeProps {
  /**
   * Mensagens exibidas na barra. Quando omitido ou vazio, rende o
   * conteúdo fixo (fallback) — garantindo que outras rotas que não
   * o SSR de banners continuem mostrando as benefits atuais.
   */
  messages?: string[];
}

const DEFAULT_MESSAGES = [
  "Frete grátis acima de R$199",
  "Cupom BEMVINDO10 · 10% OFF",
  // Sem "sem juros": ver o comentario em config/mercadopago.ts.
  INSTALLMENTS_LABEL,
  "Produtos 100% originais c/ NF-e",
];

export const AnnouncementMarquee = memo(function AnnouncementMarquee({
  messages,
}: AnnouncementMarqueeProps) {
  // Fallback: quando não há mensagens dinâmicas (SSR ausente ou
  // sem banners ativos no slot ticker), usa o conteúdo fixo.
  const items = messages && messages.length > 0 ? messages : DEFAULT_MESSAGES;

  return (
    <div className="bg-[#0F3A3E] text-[#F3EEE3] overflow-hidden">
      {/* reduce-motion: sem animação, texto em uma única linha sem loop.
          O marquee continua acessível (role="marquee") mas não se move. */}
      <div
        className="flex w-max animate-marquee py-2 motion-reduce:animate-none"
        role="marquee"
        aria-label="Benefícios da loja"
      >
        {/* First set of messages */}
        <div className="flex">
          {items.map((msg, i) => (
            <span
              key={`a-${i}`}
              className="text-[11px] font-medium tracking-[0.16em] uppercase px-[30px] whitespace-nowrap flex items-center gap-[30px] text-white/90"
            >
              {msg}
              <span className="text-[#E8C25A]">✦</span>
            </span>
          ))}
        </div>
        {/* Duplicate for seamless loop */}
        <div className="flex" aria-hidden="true">
          {items.map((msg, i) => (
            <span
              key={`b-${i}`}
              className="text-[11px] font-medium tracking-[0.16em] uppercase px-[30px] whitespace-nowrap flex items-center gap-[30px] text-white/90"
            >
              {msg}
              <span className="text-[#E8C25A]">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});
