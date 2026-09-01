import { Link } from "@tanstack/react-router";
import type { SiteBanner } from "@/lib/site-banners.functions";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ArrowRight } from "lucide-react";

interface FaixaMeioSectionProps {
  banners: SiteBanner[];
}

export function FaixaMeioSection({ banners }: FaixaMeioSectionProps) {
  // Filtra apenas os banners ativos no slot "faixa_meio" e pega no máximo 2
  const faixaBanners = (banners ?? [])
    .filter((b) => b.slot === "faixa_meio" && b.ativo)
    .slice(0, 2);

  // Regra 4/b: 0 banners ativos => seção inteira NÃO renderiza (nada de espaço vazio ou placeholder)
  if (faixaBanners.length === 0) {
    return null;
  }

  const isDouble = faixaBanners.length === 2;

  return (
    <section className="py-10 md:py-14 px-6 md:px-14 bg-[#F3EEE3]">
      <div className="max-w-[1280px] mx-auto">
        <ScrollReveal>
          <div
            className={`grid gap-6 md:gap-8 ${
              isDouble ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {faixaBanners.map((banner, index) => {
              // f) Visual: Um dos dois (o segundo ou o único) em fundo escuro para contraste
              // Se for apenas 1 banner ativo, usamos fundo escuro por padrão
              const isDark = !isDouble || index === 1;

              return (
                <div
                  key={banner.id}
                  className={`relative overflow-hidden w-full rounded-2xl border transition-all duration-300 group ${
                    isDark
                      ? "bg-[#0F3A3E] border-[#0A292C] text-white"
                      : "bg-[#F8F4EA] border-[#E0D8C7] text-[#0F3A3E]"
                  } ${
                    isDouble
                      ? "min-h-[300px] md:min-h-[360px] lg:min-h-[400px]"
                      : "min-h-[280px] md:min-h-[340px] lg:min-h-[380px]"
                  }`}
                >
                  {/* d) Imagem com <picture>, usando imagem_mobile_url em telas estreitas e imagem_url no desktop */}
                  {banner.imagem_url ? (
                    <picture className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                      {banner.imagem_mobile_url && (
                        <source
                          media="(max-width: 767px)"
                          srcSet={banner.imagem_mobile_url}
                        />
                      )}
                      <img
                        src={banner.imagem_url}
                        alt={banner.imagem_alt ?? ""}
                        width={isDouble ? 600 : 1200}
                        height={isDouble ? 400 : 500}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </picture>
                  ) : banner.imagem_mobile_url ? (
                    <picture className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                      <img
                        src={banner.imagem_mobile_url}
                        alt={banner.imagem_alt ?? ""}
                        width={800}
                        height={600}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </picture>
                  ) : null}

                  {/* Gradiente de overlay para garantir legibilidade impecável dos textos */}
                  {(banner.imagem_url || banner.imagem_mobile_url) && (
                    <div
                      className={`absolute inset-0 z-10 pointer-events-none ${
                        isDark
                          ? "bg-gradient-to-r from-[#0F3A3E]/95 via-[#0F3A3E]/70 to-transparent"
                          : "bg-gradient-to-r from-[#F8F4EA]/95 via-[#F8F4EA]/70 to-transparent"
                      }`}
                    />
                  )}

                  {/* Conteúdo de texto */}
                  <div className="relative z-20 flex flex-col justify-center h-full p-7 md:p-10 lg:p-12 max-w-[85%] md:max-w-[75%] lg:max-w-[65%] min-w-0">
                    {/* kicker */}
                    {banner.kicker && (
                      <span
                        className={`text-[10px] md:text-[11px] tracking-[0.25em] uppercase font-semibold mb-3 ${
                          isDark ? "text-[#E8C25A]" : "text-[#B07B1E]"
                        }`}
                      >
                        {banner.kicker}
                      </span>
                    )}

                    {/* título */}
                    {banner.titulo && banner.titulo.trim().length > 0 && (
                      <h3
                        className={`font-serif font-medium leading-[1.15] mb-3 md:mb-4 ${
                          isDouble
                            ? "text-[22px] md:text-[28px] lg:text-[32px]"
                            : "text-[26px] md:text-[34px] lg:text-[40px]"
                        } ${isDark ? "text-white" : "text-[#0F3A3E]"}`}
                      >
                        {banner.titulo.split("\n").map((line, i) => (
                          <span key={i}>
                            {line}
                            {i < banner.titulo!.split("\n").length - 1 && <br />}
                          </span>
                        ))}
                      </h3>
                    )}

                    {/* subtítulo */}
                    {banner.subtitulo && banner.subtitulo.trim().length > 0 && (
                      <p
                        className={`text-[13px] md:text-[14px] leading-[1.6] mb-6 md:mb-8 ${
                          isDark ? "text-white/80" : "text-[#51635F]"
                        }`}
                      >
                        {banner.subtitulo}
                      </p>
                    )}

                    {/* botão */}
                    {banner.cta_texto && banner.cta_url && (
                      <div className="flex">
                        <Link
                          to={banner.cta_url}
                          className={`inline-flex items-center gap-2 text-[11px] md:text-[12px] tracking-[0.16em] uppercase font-medium border-b-2 pb-[3px] transition-all duration-300 ${
                            isDark
                              ? "text-[#E8C25A] border-[#E8C25A] hover:text-white hover:border-white"
                              : "text-[#0F3A3E] border-[#B07B1E] hover:text-[#B07B1E] hover:border-[#0F3A3E]"
                          }`}
                        >
                          {banner.cta_texto}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
