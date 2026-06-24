import { memo } from "react";

interface AnnouncementMarqueeProps {
  messages?: string[];
}

const DEFAULT_MESSAGES = [
  "Frete grátis acima de R$199",
  "Cupom BEMVINDO10 · 10% OFF",
  "Até 10x sem juros",
  "Produtos 100% originais c/ NF-e",
];

export const AnnouncementMarquee = memo(function AnnouncementMarquee({
  messages = DEFAULT_MESSAGES,
}: AnnouncementMarqueeProps) {
  return (
    <div className="bg-[#0F3A3E] text-[#F3EEE3] overflow-hidden">
      <div className="flex w-max animate-marquee py-2">
        {/* First set of messages */}
        <div className="flex">
          {messages.map((msg, i) => (
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
          {messages.map((msg, i) => (
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
