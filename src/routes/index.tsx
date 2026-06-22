import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Mouse,
  ChevronDown,
  Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify/client";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGridSkeleton } from "@/components/shop/ProductSkeleton";
import { BenefitBar } from "@/components/shop/BenefitBar";
import { RitualSection } from "@/components/shop/RitualSection";
import { ConsultancySection } from "@/components/shop/ConsultancySection";
import { AIQuiz } from "@/components/shop/AIQuiz";
import { Testimonials } from "@/components/shop/Testimonials";
import { HeroRefinement } from "@/components/shop/HeroRefinement";
import { CampaignBanner } from "@/components/shop/CampaignBanner";
import { SocialProof } from "@/components/shop/SocialProof";
import { ShopByCategory } from "@/components/shop/ShopByCategory";
import { GlobalStyleSync } from "@/components/GlobalStyleSync";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

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

const GET_FEATURED_PRODUCTS = `
  query GetFeaturedProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          vendor
          productType
          tags
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          compareAtPriceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 5) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
                availableForSale
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    }
  }
`;

const BRANDS_DISPLAY = [
  { name: "L'Oréal Professionnel", image: "https://http2.mlstatic.com/D_Q_NP_2X_787894-MLA109316797766_042026-E.webp", desc: "Expertise francesa" },
  { name: "Wella Professionals", image: "https://http2.mlstatic.com/D_Q_NP_2X_797893-MLA110167764332_042026-E.webp", desc: "Excelência em cor" },
  { name: "Keune", image: "https://http2.mlstatic.com/D_Q_NP_2X_960184-MLA112462500109_052026-E.webp", desc: "Tecnologia holandesa" },
  { name: "Schwarzkopf", image: "https://http2.mlstatic.com/D_Q_NP_2X_688264-MLA110409088670_052026-E.webp", desc: "Inovação alemã" },
];

const NEEDS = [
  { label: "Coloração", image: "https://http2.mlstatic.com/D_Q_NP_2X_776597-MLA107889014479_032026-E.webp", slug: "coloracao", productType: "Coloração" },
  { label: "Finalizadores", image: "https://http2.mlstatic.com/D_Q_NP_2X_611634-MLU74610413953_022024-E.webp", slug: "finalizadores", productType: "Finalizador" },
  { label: "Shampoos", image: "https://http2.mlstatic.com/D_Q_NP_2X_774537-MLA112858976689_062026-E.webp", slug: "shampoos", productType: "Shampoo" },
  { label: "Kits", image: "https://http2.mlstatic.com/D_Q_NP_2X_904887-MLA107488640188_032026-E.webp", slug: "kits", productType: "Kit" },
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

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => storefrontApiRequest(GET_FEATURED_PRODUCTS, { first: 20 }),
  });

  // Produtos do Shopify
  const allProducts = productsData?.data?.products?.edges || [];

  // Primeiros 4 para "Mais Vendidos"
  const featuredProducts = allProducts.slice(0, 4);

  // Produtos com desconto para "Promoções" (compareAtPrice > price)
  const saleProducts = allProducts.filter((p: any) => {
    const variant = p.node.variants?.edges?.[0]?.node;
    if (!variant?.compareAtPrice?.amount) return false;
    const price = parseFloat(variant.price?.amount || "0");
    const compareAt = parseFloat(variant.compareAtPrice.amount);
    return compareAt > price;
  }).slice(0, 4);

  // Se não houver produtos com desconto, mostrar outros 4
  const displaySaleProducts = saleProducts.length > 0 ? saleProducts : allProducts.slice(4, 8);

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#1A1A1A] selection:bg-[#D4AF37]/20 font-sans" ref={containerRef}>
      <GlobalStyleSync />
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <MotionSection
          style={{ opacity: heroOpacity }}
          className="relative min-h-[90vh] md:min-h-screen flex items-center overflow-hidden bg-[#0F3A45]"
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
              <div className="absolute inset-0 bg-gradient-to-r from-[#0F3A45]/95 via-[#0F3A45]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A45]/80 via-transparent to-transparent h-1/2 bottom-0" />
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
                <div className="w-12 md:w-16 h-[1px] bg-[#D4AF37]" />
                <span className="text-[9px] md:text-[11px] uppercase tracking-[0.5em] font-bold text-[#D4AF37]">
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
                na sua <span className="italic underline underline-offset-8 decoration-[#D4AF37]/40">intimidade</span>
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
                  className="w-full sm:w-auto bg-[#D4AF37] hover:bg-white text-[#0F3A45] hover:text-[#0F3A45] px-10 md:px-14 h-12 md:h-16 text-[10px] md:text-[11px] uppercase tracking-[0.5em] font-black transition-all duration-1000 rounded-none shadow-[0_30px_60px_rgba(212,175,55,0.25)] hover:-translate-y-1.5 group relative overflow-hidden"
                >
                  <span className="relative z-10">Explorar Coleções</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <ArrowRight className="relative z-10 ml-4 h-4 w-4 transition-transform group-hover:translate-x-2" />
                </Button>
                <button
                  onClick={scrollToQuiz}
                  className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-bold text-white/50 hover:text-[#D4AF37] transition-all duration-500 border-b border-white/10 hover:border-[#D4AF37]/40 pb-2"
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
                <span className="text-[8px] md:text-[9px] uppercase tracking-[0.4em] font-bold text-white/40 group-hover:text-[#D4AF37] transition-colors duration-500">
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
                  <div className="w-[1px] h-10 bg-gradient-to-b from-[#D4AF37] to-transparent opacity-60" />
                  <ChevronDown className="h-4 w-4 text-[#D4AF37]/60 -mt-1" />
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
                    <Star key={i} className="h-2 w-2 fill-[#D4AF37] text-[#D4AF37] opacity-60" />
                  ))}
                </div>
                <p className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-[0.2em] font-medium max-w-[280px] leading-relaxed">
                  Confiança premium: +28 mil clientes satisfeitos em nossa boutique.
                </p>
              </MotionDiv>
            </MotionDiv>
          </div>
        </MotionSection>

        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-20 -mt-16"
        >
          <BenefitBar />
        </MotionDiv>

        <MotionSection
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 1.2 }}
          ref={quizRef}
          className="bg-[#F7F5F2]"
        >
          <AIQuiz />
        </MotionSection>

        {/* BRANDS SECTION */}
        <section ref={brandsRef} className="bg-white py-32">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-24">
              <div className="section-label !justify-center">
                <span className="tracking-[0.5em]">Curadoria Exclusiva</span>
              </div>
              <h2 className="font-serif font-light text-[#1A1A1A] text-4xl md:text-5xl lg:text-6xl leading-tight">
                As Marcas Mais <span className="italic text-[#D4AF37]">Desejadas</span>
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
                    className="group relative aspect-[3/4] overflow-hidden bg-[#143E4A] cursor-pointer"
                  >
                    <img
                      src={brand.image}
                      alt={brand.name}
                      className="w-full h-full object-contain p-8 bg-white transition-all duration-[2000ms] group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-[#0F3A45]/60 group-hover:bg-[#D4AF37]/30 transition-all duration-1000" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                      <h3 className="text-white font-serif text-2xl md:text-3xl text-center mb-2">{brand.name}</h3>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#D4AF37] font-bold mb-6">{brand.desc}</p>
                      <span className="bg-[#D4AF37] text-[#0F3A45] hover:bg-white hover:text-[#0F3A45] px-10 h-14 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 flex items-center justify-center">
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
        <section className="bg-[#F7F5F2] py-32">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-24">
              <div className="section-label !justify-center">
                <span className="tracking-[0.5em]">Necessidades</span>
              </div>
              <h2 className="font-serif font-light text-[#1A1A1A] text-4xl md:text-5xl lg:text-6xl leading-tight">
                Tratamento por <span className="italic text-[#D4AF37]">Desejo</span>
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
                    className="group relative aspect-square overflow-hidden cursor-pointer"
                  >
                    <img
                      src={need.image}
                      alt={need.label}
                      className="w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-[#0F3A45]/30 group-hover:bg-[#0F3A45]/60 transition-all duration-700" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-serif text-2xl md:text-3xl border-b border-white/0 group-hover:border-[#D4AF37]/50 pb-2 transition-all duration-500">{need.label}</span>
                    </div>
                  </MotionDiv>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <CampaignBanner />
        <ShopByCategory />

        {/* PRODUCTS SECTION - DESTAQUES */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label !justify-center">
                <span>Destaques</span>
              </div>
              <h2 className="font-serif font-light text-[#1A1A1A] text-3xl md:text-4xl">
                Mais Vendidos da <span className="italic text-[#D4AF37]">Semana</span>
              </h2>
            </div>

            {isLoadingProducts ? (
              <ProductGridSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {featuredProducts.map((product: any) => (
                  <ProductCard key={product.node.id} product={product} />
                ))}
              </div>
            )}

            <div className="mt-20 flex justify-center">
              <Link to="/produtos">
                <Button variant="outline" className="border-[#0F3A45]/20 hover:border-[#0F3A45] hover:bg-[#0F3A45] hover:text-white px-16 h-18 rounded-none text-[11px] uppercase tracking-[0.4em] font-bold transition-all duration-700">
                    Ver Toda a Coleção
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* OFERTAS SECTION */}
        <section className="bg-[#F7F5F2] py-20">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label !justify-center">
                <span>Ofertas</span>
              </div>
              <h2 className="font-serif font-light text-[#1A1A1A] text-3xl md:text-4xl">
                Promoções <span className="italic text-[#D4AF37]">Imperdíveis</span>
              </h2>
            </div>

            {isLoadingProducts ? (
              <ProductGridSkeleton count={4} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {displaySaleProducts.map((product: any) => (
                  <ProductCard key={product.node.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        <RitualSection />
        {/* BANNER INSTITUCIONAL ENTRE SEÇÕES */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="bg-[#0F3A45] text-white p-12 md:p-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
                    <img
                        src="https://http2.mlstatic.com/D_Q_NP_2X_787894-MLA109316797766_042026-E.webp"
                        className="w-full h-full object-cover"
                        alt="Background"
                    />
                </div>
                <div className="relative z-10 max-w-xl">
                    <h3 className="font-serif text-4xl md:text-5xl mb-6 font-light">Curadoria Exclusiva</h3>
                    <p className="text-white/40 text-xs uppercase tracking-[0.4em] font-bold mb-10">Os melhores produtos utilizados pelos principais salões do Brasil.</p>
                    <Link to="/produtos">
                      <Button className="bg-[#D4AF37] hover:bg-white text-[#0F3A45] hover:text-[#0F3A45] px-12 h-14 rounded-none text-[10px] uppercase tracking-[0.4em] font-black transition-all duration-700">
                          Conhecer Coleção
                      </Button>
                    </Link>
                </div>
            </div>
          </div>
        </section>

        <SocialProof />
        <ConsultancySection />
        <Testimonials />
      </main>

      <Footer />
    </div>
  );
}

export default Index;
