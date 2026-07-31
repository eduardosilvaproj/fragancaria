import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { HomeCarousels } from "@/components/home/HomeCarousels";
import { listFeatured, type Slot } from "@/lib/home-featured.functions";
import type { Product } from "@/data/products";
import { ArrowRight, Link2 } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/ScrollReveal";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";
import { LojaFisicaSection } from "@/components/store/LojaFisicaSection";
import { getPublicStoreConfig, type StoreConfig } from "@/lib/store-settings.functions";
import { TrustBadges } from "@/components/shop/TrustBadges";

export const Route = createFileRoute("/")({
  loader: async () => {
    // 3 chamadas em paralelo. Mesmo se uma falhar (migration nao rodada),
    // a home ainda renderiza — os carrosseis sao independentes.
    //
    // Busca so os 2 slots que a home exibe. `new_arrivals` e `kits` seguem
    // existindo para o admin curar no VitrineManager, mas sairam da home
    // (ver HomeCarousels), entao buscar os 4 era varrer o catalogo 2x sem
    // ninguem consumir o resultado.
    const [best, promo, loja] = await Promise.all([
      listFeatured({ data: "bestsellers" }),
      listFeatured({ data: "on_sale" }),
      // .catch: getPublicStoreConfig nao lanca, mas se a chamada em si falhar
      // (rede, server fn fora do ar) a home nao pode cair por causa da secao
      // da loja fisica. null => a secao nao renderiza.
      getPublicStoreConfig({}).catch(() => null),
    ]);
    return {
      slots: {
        bestsellers: best.data ?? [],
        on_sale: promo.data ?? [],
      } as Partial<Record<Slot, Product[]>>,
      storeConfig: (loja?.success ? loja.data : null) as StoreConfig | null,
    };
  },
  head: () => ({
    meta: [
      { title: "Fragranciaria | Especialista em Cabelo Profissional" },
      { name: "description", content: "Curadoria profissional dos melhores cosméticos para cabelos — entregue na sua casa. Kérastase, Wella, L'Oréal Pro e mais." },
      { property: "og:title", content: "Fragranciaria | Especialista em Cabelo Profissional" },
      { property: "og:description", content: "A excelência do salão na sua casa." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fragranciaria.com.br" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index, follow" },
      { name: "keywords", content: "produtos capilares, shampoo profissional, coloração, tratamento capilar, Kérastase, Wella, L'Oréal, Schwarzkopf" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(generateOrganizationSchema()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(generateWebsiteSchema()),
      },
    ],
  }),
  component: IndexEditorial,
});

// Marcas para o marquee
const BRAND_MARQUEE = [
  "L'Oréal Professionnel",
  "Kérastase",
  "Wella",
  "Schwarzkopf",
  "Keune",
  "Alfaparf Milano",
  "Itallian Color",
  "Cadiveu",
  "Sebastian",
];

// 8 Cards de necessidade - baseado nas categorias reais do catálogo
const NEEDS = [
  { num: "01", title: "Shampoo", desc: "Limpeza profissional para todos os tipos.", image: "/images/needs/need-hidratacao.png", productType: "Shampoo" },
  { num: "02", title: "Condicionador", desc: "Desembaraça e prepara os fios.", image: "/images/needs/need-nutricao.png", productType: "Condicionador" },
  { num: "03", title: "Máscara", desc: "Tratamento intensivo e nutrição.", image: "/images/needs/need-reconstrucao.png", productType: "Máscara" },
  { num: "04", title: "Coloração", desc: "Cor, correção e manutenção.", image: "/images/needs/need-coloracao.png", productType: "Coloração" },
  { num: "05", title: "Finalizador", desc: "Definição, frizz e acabamento.", image: "/images/needs/need-finalizacao.png", productType: "Finalizador" },
  { num: "06", title: "Tratamento", desc: "Ampolas, seruns e reparadores.", image: "/images/needs/need-tratamentos.png", productType: "Tratamento" },
  { num: "07", title: "Maquiagem", desc: "Bruna Tavares e mais.", image: "/images/needs/need-protecao-solar.png", productType: "Maquiagem" },
  { num: "08", title: "Óleo", desc: "Brilho e nutrição intensiva.", image: "/images/needs/need-corte.png", productType: "Óleo" },
];

function IndexEditorial() {
  const { slots, storeConfig } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-[#F3EEE3] font-sans overflow-x-hidden">
      <NavbarEditorial />

      <main>
        {/* ===== HERO SECTION ===== */}
        <section
          className="relative min-h-[600px] md:min-h-[720px] flex items-center overflow-hidden"
          style={{
            backgroundColor: '#EDE5D2',
            backgroundImage: 'repeating-linear-gradient(45deg, rgba(150,120,70,0.045) 0px, rgba(150,120,70,0.045) 1px, transparent 1px, transparent 14px), repeating-linear-gradient(-45deg, rgba(150,120,70,0.045) 0px, rgba(150,120,70,0.045) 1px, transparent 1px, transparent 14px)'
          }}
        >
          {/* Arco âmbar decorativo - hidden on mobile */}
          <div
            className="hidden md:block absolute -top-[180px] -right-[60px] w-[900px] h-[900px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 34% 34%, rgba(198,163,98,0.34) 0%, rgba(198,163,98,0.14) 42%, transparent 66%)'
            }}
          />
          <div
            className="hidden md:block absolute -top-[100px] right-[20px] w-[720px] h-[720px] rounded-full border pointer-events-none"
            style={{ borderColor: 'rgba(190,152,78,0.26)' }}
          />
          <div
            className="hidden md:block absolute -top-[30px] right-[100px] w-[540px] h-[540px] rounded-full border pointer-events-none"
            style={{ borderColor: 'rgba(190,152,78,0.14)' }}
          />

          {/* Modelo - posicionada à direita, imagem completa sem corte */}
          <img
            src="/images/hero-model-nobg.png"
            alt="Modelo com produtos profissionais"
            className="hidden lg:block absolute bottom-0 right-0 h-[95%] w-auto object-contain animate-[heroIn_1.4s_ease_both]"
          />

          {/* Véu para legibilidade do texto */}
          <div
            className="absolute top-0 left-0 bottom-0 w-[48%] pointer-events-none hidden lg:block"
            style={{ background: 'linear-gradient(to right, rgba(237,229,210,0.46) 0%, transparent 100%)' }}
          />

          {/* Conteúdo de texto */}
          <div className="relative z-10 px-6 md:px-14 py-12 md:py-16 lg:py-[70px] w-full lg:w-auto lg:max-w-[600px]">
            {/* Label */}
            <div className="flex items-center gap-3.5 mb-5 md:mb-6 animate-[fadeUp_0.9s_ease_0.1s_both]">
              <span className="w-8 md:w-10 h-[1px] bg-[#B07B1E]" />
              <span className="text-[11px] md:text-[12px] tracking-[0.25em] md:tracking-[0.3em] text-[#B07B1E] uppercase">
                Especialista em Cabelo Profissional
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-serif font-medium text-[36px] md:text-[56px] lg:text-[80px] leading-[1] md:leading-[0.97] text-[#0F3A3E] tracking-[-0.01em] animate-[fadeUp_1s_ease_0.2s_both]">
              A excelência<br />do salão na<br />sua <em className="italic text-[#B07B1E]">casa</em>.
            </h1>

            {/* Subheadline */}
            <p className="text-[15px] md:text-[17px] text-[#4A5C4A] mt-5 md:mt-6 leading-[1.65] md:leading-[1.7] max-w-[320px] md:max-w-[420px] animate-[fadeUp_1s_ease_0.35s_both]">
              Curadoria profissional dos melhores cosméticos para cabelos — entregue na sua casa.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-7 mt-8 md:mt-10 animate-[fadeUp_1s_ease_0.5s_both]">
              <Link
                to="/produtos"
                className="bg-[#0F3A3E] hover:bg-[#16504F] text-white px-8 md:px-[42px] py-4 md:py-[18px] text-[12px] md:text-[13px] tracking-[0.18em] md:tracking-[0.2em] uppercase font-medium transition-colors"
              >
                Explorar Coleções
              </Link>
              <Link
                to="/produtos"
                search={{ productType: "Tratamento" }}
                className="text-[12px] md:text-[13px] tracking-[0.16em] md:tracking-[0.18em] text-[#0F3A3E] uppercase border-b border-[#B07B1E] pb-[5px] hover:text-[#B07B1E] transition-colors self-start md:self-auto"
              >
                Tratamentos capilares
              </Link>
            </div>
          </div>
        </section>

        {/* ===== BRAND MARQUEE ===== */}
        <section className="bg-[#0F3A3E] py-6 md:py-8 overflow-hidden">
          <div className="flex gap-0 animate-[marquee_30s_linear_infinite]">
            {/* Duplicate for seamless loop */}
            <div className="flex gap-0">
              {BRAND_MARQUEE.map((brand, i) => (
                <span
                  key={`a-${i}`}
                  className="font-serif text-[16px] md:text-[22px] text-white/85 px-6 md:px-10 whitespace-nowrap flex items-center gap-6 md:gap-10"
                >
                  {brand}
                  <span className="text-[#B07B1E]">✦</span>
                </span>
              ))}
            </div>
            {/* Duplicate for seamless loop */}
            <div className="flex gap-0" aria-hidden="true">
              {BRAND_MARQUEE.map((brand, i) => (
                <span
                  key={`b-${i}`}
                  className="font-serif text-[16px] md:text-[22px] text-white/85 px-6 md:px-10 whitespace-nowrap flex items-center gap-6 md:gap-10"
                >
                  {brand}
                  <span className="text-[#B07B1E]">✦</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SIMULADOR DE COR =====
            Versão discreta (2026-07-31). A anterior era um bloco verde-escuro
            de largura cheia com botão dourado sólido e 12 círculos de cor —
            competia com o hero e pesava no meio da home. Aqui o cartão é
            claro, com filete no lugar de fundo cheio, CTA como link
            sublinhado e uma fita fina de tons. O verde forte fica reservado
            para o hero e o CTA final. */}
        <section className="py-10 md:py-14 px-6 md:px-14 bg-[#F3EEE3]">
          <div className="max-w-[1280px] mx-auto">
            <Link
              to="/simulador"
              className="group block bg-[#F8F4EA] border border-[#E0D8C7] hover:border-[#C6A362] transition-colors duration-300"
              style={{ borderRadius: "12px" }}
            >
              <div className="grid md:grid-cols-[1.15fr_1fr] gap-0 min-w-0 items-center">
                {/* Texto */}
                <div className="p-7 md:p-11 lg:p-14 min-w-0">
                  <span className="text-[10px] md:text-[11px] tracking-[0.28em] uppercase text-[#B07B1E]">
                    Exclusivo Fragranciaria
                  </span>
                  <h2 className="font-serif font-medium text-[24px] md:text-[34px] text-[#0F3A3E] leading-[1.15] mt-3">
                    Encontre o tom <em className="italic text-[#B07B1E]">perfeito</em> para você
                  </h2>
                  <p className="text-[13px] md:text-[14px] text-[#51635F] mt-3 md:mt-4 leading-[1.7] max-w-[420px]">
                    Experimente cores na sua própria foto antes de comprar. A imagem
                    não sai do seu navegador.
                  </p>

                  {/* Passos como texto corrido, com separador em vez de círculos
                      numerados: mesma informação, menos peso visual. */}
                  <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-5 md:mt-7 text-[12px] md:text-[13px] text-[#75827E]">
                    <span>Envie sua foto</span>
                    <span aria-hidden="true" className="text-[#C6A362]">·</span>
                    <span>Escolha a cor</span>
                    <span aria-hidden="true" className="text-[#C6A362]">·</span>
                    <span>Veja o resultado</span>
                  </p>

                  <span className="inline-flex items-center gap-2 mt-6 md:mt-8 text-[12px] md:text-[13px] tracking-[0.16em] uppercase text-[#0F3A3E] border-b border-[#B07B1E] pb-[5px] group-hover:text-[#B07B1E] transition-colors">
                    Experimentar agora
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>

                {/* Par Antes/Depois. Mesma modelo, mesma pose, mesmo fundo e
                    enquadramento (501x648 e 502x661) — a unica diferenca que o
                    olho pega e a cor do cabelo, que e exatamente o que o
                    simulador faz. Um par com fotos diferentes prometeria um
                    resultado que nao vem da ferramenta.
                    WebP em vez dos PNG originais: 988 KB -> 53 KB (-95%) sem
                    perda visivel, gerado com sharp em q82. Os PNG nao ficaram
                    no repo: 1 MB de imagem na home penaliza conexao movel sem
                    ganho visivel. O par entra abaixo da dobra (depois do hero
                    e do marquee), por isso o `loading="lazy"` abaixo.
                    Nao usar `need-coloracao.png` aqui: ela ilustra o card
                    "Coloracao" na grade abaixo e repetiria na mesma home. */}
                <div className="min-w-0 px-7 pb-8 md:px-0 md:pb-0 md:pr-11 lg:pr-14">
                  <div className="flex items-stretch gap-3 md:gap-4">
                    {[
                      {
                        src: "/images/simulador-antes.webp",
                        etiqueta: "Antes",
                        alt: "Mulher de cabelo castanho escuro, antes da simulação de cor.",
                      },
                      {
                        src: "/images/simulador-depois.webp",
                        etiqueta: "Depois",
                        alt: "A mesma mulher, na mesma pose, com o cabelo em tom louro iluminado — resultado da simulação.",
                      },
                    ].map((foto) => (
                      // min-w-0 em cada metade: sem isso a imagem define a
                      // largura minima e o par estoura a coluna do grid.
                      <figure key={foto.src} className="relative min-w-0 flex-1">
                        <img
                          src={foto.src}
                          alt={foto.alt}
                          className="w-full h-full aspect-[3/4] object-cover rounded-lg"
                          loading="lazy"
                          decoding="async"
                        />
                        <figcaption className="absolute bottom-2 left-2 md:bottom-2.5 md:left-2.5 bg-white/85 backdrop-blur-sm text-[#0F3A3E] text-[9px] md:text-[10px] tracking-[0.14em] uppercase font-semibold px-2 py-1 rounded">
                          {foto.etiqueta}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  <p className="text-[11px] md:text-[12px] text-[#8A938E] mt-4">
                    24 tons profissionais para experimentar
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ===== CARROSSÉIS DA VITRINE (bestsellers + novidades + promo + kits) ===== */}
        <HomeCarousels data={slots} />

        {/* ===== POR NECESSIDADE ===== */}
        <section className="py-16 md:py-[110px] px-6 md:px-14 bg-[#F3EEE3]">
          <div className="max-w-[1280px] mx-auto">
            {/* Header */}
            <ScrollReveal>
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-5 mb-10 md:mb-14">
                <div>
                  <span className="text-[11px] md:text-[12px] tracking-[0.25em] md:tracking-[0.3em] text-[#B07B1E] uppercase">
                    Encontre por necessidade
                  </span>
                  <h2 className="font-serif font-medium text-[28px] md:text-[42px] lg:text-[52px] text-[#0F3A3E] mt-2 md:mt-3 leading-[1.1] md:leading-[1.05]">
                    O que seus fios <em className="text-[#B07B1E]">pedem</em> hoje?
                  </h2>
                </div>
                <Link
                  to="/produtos"
                  className="text-[12px] md:text-[13px] tracking-[0.16em] md:tracking-[0.18em] text-[#0F3A3E] uppercase border-b border-[#B07B1E] pb-[5px] hover:text-[#B07B1E] transition-colors self-start md:self-auto"
                >
                  Ver tudo →
                </Link>
              </div>
            </ScrollReveal>

            {/* Grid de 8 cards */}
            <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5" staggerDelay={0.08}>
              {NEEDS.map((need) => (
                <StaggerItem key={need.title}>
                  <Link
                    to="/produtos"
                    search={{ productType: need.productType }}
                    className="group block bg-white border border-[#E6DECE] overflow-hidden transition-all duration-[250ms] hover:-translate-y-[3px] hover:shadow-[0_14px_34px_rgba(15,58,62,0.10)]"
                  >
                    <img
                      src={need.image}
                      alt={need.title}
                      className="w-full h-[120px] md:h-[180px] object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="p-4 md:p-6">
                      <div className="font-serif text-[18px] md:text-[24px] text-[#0F3A3E] leading-tight">
                        {need.title}
                      </div>
                      <div className="text-[11px] md:text-[13px] text-[#75827E] mt-1 md:mt-2 leading-[1.45] md:leading-[1.55]">
                        {need.desc}
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ===== TRUST BADGES ===== */}
        <TrustBadges />

        {/* ===== LOJA FÍSICA ===== */}
        {/* Não renderiza se storeConfig for null (migration não aplicada ou
            query falhou) — a home segue de pé sem esta seção. */}
        <ScrollReveal>
          <LojaFisicaSection config={storeConfig} />
        </ScrollReveal>

        {/* ===== CARD AFILIADO (discreto) ===== */}
        <section className="px-6 md:px-14 pb-4 bg-[#F3EEE3]">
          <div className="max-w-[1280px] mx-auto">
            <Link
              to="/seja-afiliado"
              className="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 border border-[#D8D0BD] hover:border-[#B4862C] transition-colors"
              style={{ backgroundColor: "#F5F1E8", borderWidth: "0.5px", borderRadius: "12px", padding: "22px 26px" }}
            >
              <span className="flex-shrink-0 w-11 h-11 rounded-full bg-[#0E3B32] flex items-center justify-center">
                <Link2 className="h-5 w-5 text-[#B4862C]" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-[18px] md:text-[20px] text-[#123F35] leading-tight">
                  Trabalha com cabelo? Ganhe indicando.
                </p>
                <p className="text-[13px] md:text-[14px] text-[#6B6B63] mt-1">
                  Comissão de 8% a 15% em produtos profissionais.
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-[13px] tracking-[0.02em] font-medium text-[#8A6413] group-hover:gap-2.5 transition-all self-start sm:self-auto flex-shrink-0">
                Saiba mais
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section className="py-16 md:py-24 px-6 md:px-14 bg-[#0F3A3E]">
          <div className="max-w-[1280px] mx-auto text-center">
            <ScrollReveal>
              <span className="text-[11px] md:text-[12px] tracking-[0.25em] md:tracking-[0.3em] text-[#E8C25A] uppercase">
                Fragranciaria
              </span>
              <h2 className="font-serif font-medium text-[28px] md:text-[42px] text-white mt-3 max-w-[640px] mx-auto leading-tight">
                A curadoria que o seu salão confia, agora na sua casa.
              </h2>
              <Link
                to="/produtos"
                className="inline-flex items-center gap-2 mt-8 bg-[#E8C25A] hover:bg-[#D4B04A] text-[#0F3A3E] px-8 md:px-10 py-4 text-[12px] md:text-[13px] tracking-[0.18em] uppercase font-medium transition-colors"
              >
                Ver todos os produtos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </ScrollReveal>
          </div>
        </section>

        {/* ===== NEWSLETTER (já vem no Footer) ===== */}
      </main>

      <FooterEditorial />
    </div>
  );
}

export default IndexEditorial;