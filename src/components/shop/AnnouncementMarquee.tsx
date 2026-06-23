/**
 * v3 Editorial Announcement Marquee
 * Faixa de anúncios com scroll infinito horizontal
 */

const ANNOUNCEMENTS = [
  "Frete grátis acima de R$199",
  "Cupom BEMVINDO10 · 10% OFF",
  "Até 10x sem juros",
  "Produtos 100% originais c/ NF-e",
];

export const AnnouncementMarquee = () => {
  // Duplicamos para criar o efeito seamless
  const items = [...ANNOUNCEMENTS, ...ANNOUNCEMENTS];

  return (
    <div className="bg-[#0F3A3E] text-white overflow-hidden sticky top-0 z-50">
      <div className="flex animate-marquee py-2">
        {/* Primeiro grupo */}
        <div className="flex shrink-0">
          {items.map((text, i) => (
            <span
              key={i}
              className="flex items-center gap-7 px-7 whitespace-nowrap text-[11px] font-medium tracking-[0.16em] uppercase text-white/90"
            >
              {text}
              <span className="text-[#E8C25A]">✦</span>
            </span>
          ))}
        </div>
        {/* Segundo grupo (duplicado para loop seamless) */}
        <div className="flex shrink-0" aria-hidden="true">
          {items.map((text, i) => (
            <span
              key={`dup-${i}`}
              className="flex items-center gap-7 px-7 whitespace-nowrap text-[11px] font-medium tracking-[0.16em] uppercase text-white/90"
            >
              {text}
              <span className="text-[#E8C25A]">✦</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementMarquee;
