import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ChevronDown,
  Star
} from "lucide-react";
import { LocalProductCard } from "@/components/shop/LocalProductCard";
import { PRODUCTS, BRANDS } from "@/data/products";
import { BenefitBar } from "@/components/shop/BenefitBar";
import { RitualSection } from "@/components/shop/RitualSection";
import { ConsultancySection } from "@/components/shop/ConsultancySection";
import { AIQuiz } from "@/components/shop/AIQuiz";
import { Testimonials } from "@/components/shop/Testimonials";
import { HeroRefinement } from "@/components/shop/HeroRefinement";
import { CampaignBanner } from "@/components/shop/CampaignBanner";
import { SocialProof } from "@/components/shop/SocialProof";
import { ShopByCategory } from "@/components/shop/ShopByCategory";
import { FirstPurchaseCoupon } from "@/components/shop/FirstPurchaseCoupon";
import { TrustBadges } from "@/components/shop/TrustBadges";
import { GlobalStyleSync } from "@/components/GlobalStyleSync";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useMemo } from "react";

const MotionDiv = motion.div as any;
const MotionSection = motion.section as any;
const MotionH1 = motion.h1 as any;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fragranciaria | Cosméticos Capilares Profissionais" },
      { name: "description", content: "Boutique online de cosméticos capilares profissionais. Produtos originais das melhores marcas com entrega para todo Brasil." },
      { property: "og:title", content: "Fragranciaria | Cosméticos Capilares Profissionais" },
      { property: "og:description", content: "Produtos profissionais para cuidar dos seus fios em casa." },
      { property: "og:image", content: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=1200" },
    ],
  }),
  component: Index,
});

// Marcas atualizadas - removido Schwarzkopf, adicionado Kérastase
const BRANDS_DISPLAY = [
  { name: "L'Oréal", desc: "Expertise francesa" },
  { name: "Wella", desc: "Excelência em cor" },
  { name: "Keune", desc: "Tecnologia holandesa" },
  { name: "Kérastase", desc: "Luxo capilar" },
];

const NEEDS = [
  { label: "Coloração", productType: "Coloração" },
  { label: "Finalizadores", productType: "Finalizador" },
  { label: "Shampoos", productType: "Shampoo" },
  { label: "Kits", productType: "Kit" },
];

function Index() {
  const containerRef = useRef<HTMLDivElement>(null);
  const brandsRef = useRef<HTMLElement>(null);
  const quizRef = useRef<HTMLDivElement>(null);

  const scrollToBrands = () => {
    brandsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToQuiz = () => {
    quizRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { scrollYProgress } = useScroll({
    target: containerRef as any,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  // Produtos em destaque (featured ou primeiros 8)
  const featuredProducts = useMemo(() => {
    const featured = PRODUCTS.filter(p => p.featured);
    if (featured.length >= 4) return featured.slice(0, 4);
    return PRODUCTS.slice(0, 4);
  }, []);

  // Produtos com desconto para "Promoções"
  const saleProducts = useMemo(() => {
    const withDiscount = PRODUCTS.filter(p => p.originalPrice && p.originalPrice > p.price);
    if (withDiscount.length >= 4) return withDiscount.slice(0, 4);
    return PRODUCTS.slice(4, 8);
  }, []);

  return (
    <div className="min-h-screen bg-[#F3EEE3] text-[#1C302E] selection:bg-[#B07B1E]/20 font-sans" ref={containerRef}>
      <GlobalStyleSync />
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <MotionSection
          style={{ opacity: heroOpacity }}
          className="relative min-h-[90vh] md:min-h-screen flex items-center overflow-hidden bg-[#0F3A3E]"
        >
          <MotionDiv
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
            style={{ y: heroY }}
            className="absolute inset-0 z-0"
          >
            <div className="w-full h-full overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2000&auto=format&fit=crop"
                alt="Boutique de luxo"
                className="w-full h-full object-cover md:object-[center_right] transition-transform duration-[20s] ease-out scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0F3A3E]/95 via-[#0F3A3E]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A3E]/80 via-transparent to-transparent h-1/2 bottom-0" />
            </div>
          </MotionDiv>

          <div className="container mx-auto px-4 md:px-12 relative z-10 pt-20 md:pt-0">
            <div className="w-full md:max-w-[55%] flex flex-col items-center md:items-start text-center md:text-left">
              <MotionDiv
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="flex items-center gap-4 md:gap-6 mb-4 md:mb-6"
              >
                <div className="w-12 md:w-16 h-[1px] bg-[#B07B1E]" />
                <span className="text-[9px] md:text-[11px] uppercase tracking-[0.5em] font-bold text-[#B07B1E]">
                  Especialista em Cabelo Profissional
                </span>
              </MotionDiv>

              <MotionH1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                className="font-serif font-light mb-8 md:mb-10 text-white text-4xl md:text-5xl lg:text-7xl leading-[1.1]"
              >
                A excelência do salão<br />
                na sua <span className="italic underline underline-offset-8 decoration-[#B07B1E]/40">intimidade</span>
              </MotionH1>

              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-6 md:gap-6 items-center mb-10 md:mb-12"
              >
                <Button
                  size="lg"
                  onClick={scrollToBrands}
                  className="w-full sm:w-auto bg-[#B07B1E] hover:bg-white text-[#0F3A3E] hover:text-[#0F3A3E] px-10 md:px-14 h-12 md:h-16 text-[10px] md:text-[11px] uppercase tracking-[0.5em] font-black transition-all duration-1000 rounded-none shadow-[0_30px_60px_rgba(212,175,55,0.25)] hover:-translate-y-1.5 group relative overflow-hidden"
                >
                  <span className="relative z-10">Explorar Coleções</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <ArrowRight className="relative z-10 ml-4 h-4 w-4 transition-transform group-hover:translate-x-2" />
                </Button>
                <button
                  onClick={scrollToQuiz}
                  className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-bold text-white/50 hover:text-[#B07B1E] transition-all duration-500 border-b border-white/10 hover:border-[#B07B1E]/40 pb-2"
                >
                  Descobrir meu Ritual
                </button>
              </MotionDiv>

              <HeroRefinement />
            </div>

            {/* SCROLL INDICATOR */}
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1.5 }}
              className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-20"
            >
              <button
                onClick={scrollToBrands}
                className="flex flex-col items-center gap-3 group"
              >
                <span className="text-[8px] md:text-[9px] uppercase tracking-[0.4em] font-bold text-white/40 group-hover:text-[#B07B1E] transition-colors duration-500">
                  Role para descobrir
                </span>
                <MotionDiv
                  animate={{ y: [0, 6, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="flex flex-col items-center"
                >
                  <div className="w-[1px] h-10 bg-gradient-to-b from-[#B07B1E] to-transparent opacity-60" />
                  <ChevronDown className="h-4 w-4 text-[#B07B1E]/60 -mt-1" />
                </MotionDiv>
              </button>

              <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5, duration: 2 }}
                className="mt-4 text-center px-4 hidden md:block"
              >
                <div className="flex items-center gap-2 justify-center mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-2 w-2 fill-[#B07B1E] text-[#B07B1E] opacity-60" />
                  ))}
                </div>
                <p className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-[0.2em] font-medium max-w-[280px] leading-relaxed">
                  Produtos 100% originais · Nota fiscal em todas as compras
                </p>
              </MotionDiv>
            </MotionDiv>
          </div>
        </MotionSection>

        {/* BENEFIT BAR */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-20 -mt-16"
        >
          <BenefitBar />
        </MotionDiv>

        {/* CUPOM PRIMEIRA COMPRA */}
        <FirstPurchaseCoupon />

        {/* PRODUTOS DESTAQUES - ANTES DO FOLD */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label !justify-center">
                <span>Destaques</span>
              </div>
              <h2 className="font-serif font-light text-[#1C302E] text-3xl md:text-4xl">
                Mais Vendidos da <span className="italic text-[#B07B1E]">Semana</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {featuredProducts.map((product) => (
                <LocalProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-16 flex justify-center">
              <Link to="/produtos">
                <Button variant="outline" className="border-[#0F3A3E]/20 hover:border-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white px-16 h-14 rounded-none text-[11px] uppercase tracking-[0.4em] font-bold transition-all duration-700">
                    Ver Toda a Coleção
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* OFERTAS SECTION */}
        <section className="bg-[#F3EEE3] py-20">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label !justify-center">
                <span>Ofertas</span>
              </div>
              <h2 className="font-serif font-light text-[#1C302E] text-3xl md:text-4xl">
                Promoções <span className="italic text-[#B07B1E]">Imperdíveis</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {saleProducts.map((product) => (
                <LocalProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* TRUST BADGES */}
        <TrustBadges />

        {/* BRANDS SECTION */}
        <section ref={brandsRef} className="bg-white py-32">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-24">
              <div className="section-label !justify-center">
                <span className="tracking-[0.5em]">Curadoria Exclusiva</span>
              </div>
              <h2 className="font-serif font-light text-[#1C302E] text-4xl md:text-5xl lg:text-6xl leading-tight">
                As Marcas Mais <span className="italic text-[#B07B1E]">Desejadas</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {BRANDS_DISPLAY.map((brand, i) => (
                <Link
                  key={brand.name}
                  to="/produtos"
                  search={{ vendor: brand.name }}
                >
                  <MotionDiv
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.8 }}
                    className="group relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-[#0F3A3E] to-[#16504F] cursor-pointer"
                  >
                    <div className="absolute inset-0 bg-[#B07B1E]/0 group-hover:bg-[#B07B1E]/10 transition-all duration-700" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                      <h3 className="text-white font-serif text-3xl md:text-4xl text-center mb-3">{brand.name}</h3>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#B07B1E] font-bold mb-8">{brand.desc}</p>
                      <span className="bg-[#B07B1E] text-[#0F3A3E] hover:bg-white hover:text-[#0F3A3E] px-10 h-14 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 flex items-center justify-center">
                        Explorar Coleção
                      </span>
                    </div>
                  </MotionDiv>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* NEEDS SECTION */}
        <section className="bg-[#F3EEE3] py-32">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-24">
              <div className="section-label !justify-center">
                <span className="tracking-[0.5em]">Categorias</span>
              </div>
              <h2 className="font-serif font-light text-[#1C302E] text-4xl md:text-5xl lg:text-6xl leading-tight">
                Encontre por <span className="italic text-[#B07B1E]">Tipo</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {NEEDS.map((need, i) => (
                <Link
                  key={need.label}
                  to="/produtos"
                  search={{ productType: need.productType }}
                >
                  <MotionDiv
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative aspect-square overflow-hidden cursor-pointer bg-gradient-to-br from-[#0F3A3E] to-[#1a4f5c]"
                  >
                    <div className="absolute inset-0 bg-[#B07B1E]/0 group-hover:bg-[#B07B1E]/20 transition-all duration-700" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-serif text-2xl md:text-3xl border-b border-white/0 group-hover:border-[#B07B1E]/50 pb-2 transition-all duration-500">{need.label}</span>
                    </div>
                  </MotionDiv>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <ShopByCategory />
        <CampaignBanner />

        {/* AI QUIZ - MOVIDO PARA METADE INFERIOR */}
        <MotionSection
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1.2 }}
          ref={quizRef}
          className="bg-[#F3EEE3]"
        >
          <AIQuiz />
        </MotionSection>

        <RitualSection />
        <ConsultancySection />
        <SocialProof />
        <Testimonials />

        {/* BANNER INSTITUCIONAL - SEM IMAGEM MLSTATIC */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="bg-gradient-to-br from-[#0F3A3E] to-[#16504F] text-white p-12 md:p-20 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#B07B1E] rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#B07B1E] rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 max-w-xl">
                    <h3 className="font-serif text-4xl md:text-5xl mb-6 font-light">Curadoria Exclusiva</h3>
                    <p className="text-white/40 text-xs uppercase tracking-[0.4em] font-bold mb-10">Os melhores produtos utilizados pelos principais salões do Brasil.</p>
                    <Link to="/produtos">
                      <Button className="bg-[#B07B1E] hover:bg-white text-[#0F3A3E] hover:text-[#0F3A3E] px-12 h-14 rounded-none text-[10px] uppercase tracking-[0.4em] font-black transition-all duration-700">
                          Conhecer Coleção
                      </Button>
                    </Link>
                </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Index;
