import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";
import { PRODUCTS } from "@/data/products";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/ui/ScrollReveal";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/lib/seo";

export const Route = createFileRoute("/")({
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
  const featuredProducts = useMemo(() => {
    const withDiscount = PRODUCTS.filter(
      (p) => p.originalPrice && p.originalPrice > p.price
    ).slice(0, 4);
    if (withDiscount.length >= 4) return withDiscount;
    return PRODUCTS.slice(0, 4);
  }, []);

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
                className="text-[12px] md:text-[13px] tracking-[0.16em] md:tracking-[0.18em] text-[#0F3A3E] uppercase border-b border-[#B07B1E] pb-[5px] hover:text-[#B07B1E] transition-colors"
              >
                Descobrir meu Ritual
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 mt-7 md:mt-9 animate-[fadeUp_1s_ease_0.65s_both]">
              <div className="flex items-center gap-2 text-[11px] md:text-[12px] tracking-[0.04em] text-[#3A4A3A]">
                <span className="text-[#B07B1E] text-[14px]">➟</span>
                Frete grátis acima de R$199
              </div>
              <div className="flex items-center gap-2 text-[11px] md:text-[12px] tracking-[0.04em] text-[#3A4A3A]">
                <span className="text-[#B07B1E] text-[14px]">◈</span>
                Até 10x sem juros
              </div>
            </div>
          </div>

          {/* Mobile Hero Image - subtle overlay */}
          <div className="lg:hidden absolute inset-0 -z-10">
            <img
              src="/images/hero-model-nobg.png"
              alt="Modelo"
              className="w-full h-full object-contain object-right-bottom opacity-20"
            />
          </div>
        </section>

        {/* ===== BRAND MARQUEE ===== */}
        <section className="bg-[#0F3A3E] py-5 md:py-[26px] overflow-hidden">
          <div
            className="flex gap-0 w-max animate-marquee"
            style={{ animationDuration: '28s' }}
          >
            {/* First set */}
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
                    <div className="p-4 md:p-7">
                      <div className="font-serif text-[12px] md:text-[14px] text-[#B07B1E]">
                        {need.num}
                      </div>
                      <div className="font-serif text-[18px] md:text-[26px] text-[#0F3A3E] mt-2 md:mt-3">
                        {need.title}
                      </div>
                      <div className="text-[11px] md:text-[12px] text-[#75827E] mt-1 md:mt-2 leading-[1.4] md:leading-[1.5] hidden sm:block">
                        {need.desc}
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ===== MAIS VENDIDOS ===== */}
        <section className="py-16 md:py-[110px] px-6 md:px-14 bg-[#F3EEE3]">
          <div className="max-w-[1280px] mx-auto">
            {/* Header */}
            <ScrollReveal className="text-center mb-10 md:mb-14">
              <span className="text-[11px] md:text-[12px] tracking-[0.25em] md:tracking-[0.3em] text-[#B07B1E] uppercase">
                Destaques
              </span>
              <h2 className="font-serif font-medium text-[28px] md:text-[42px] lg:text-[52px] text-[#0F3A3E] mt-2 md:mt-3">
                Mais Vendidos da <em className="text-[#B07B1E]">Semana</em>
              </h2>
            </ScrollReveal>

            {/* Grid de 4 produtos */}
            <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" staggerDelay={0.1}>
              {featuredProducts.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCardEditorial
                    id={product.id}
                    title={product.name}
                    vendor={product.brand || ""}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={product.images[0]}
                    rating={4.5}
                    reviewCount={Math.floor(Math.random() * 100) + 20}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Ver todos */}
            <ScrollReveal delay={0.4} className="text-center mt-10 md:mt-12">
              <Link
                to="/produtos"
                className="inline-flex items-center gap-2 text-[12px] md:text-[13px] tracking-[0.16em] md:tracking-[0.18em] text-[#0F3A3E] uppercase border-b border-[#B07B1E] pb-[5px] hover:text-[#B07B1E] transition-colors"
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
