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
import { BenefitBar } from "@/components/shop/BenefitBar";
import { RitualSection } from "@/components/shop/RitualSection";
import { ConsultancySection } from "@/components/shop/ConsultancySection";
import { AIQuiz } from "@/components/shop/AIQuiz";
import { Testimonials } from "@/components/shop/Testimonials";
import { InstagramFeed } from "@/components/shop/InstagramFeed";
import { HeroRefinement } from "@/components/shop/HeroRefinement";
import { CampaignBanner } from "@/components/shop/CampaignBanner";
import { FlashOffer } from "@/components/shop/FlashOffer";
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
      { title: "Fragranciaria | Boutique de Cosméticos Profissionais de Luxo" },
      { name: "description", content: "Distribuidor oficial Kérastase, Wella, Keune e Sebastian. Experiência premium com consultoria especializada e produtos 100% originais." },
      { property: "og:title", content: "Fragranciaria | Boutique Premium" },
      { property: "og:description", content: "A excelência do salão na sua intimidade." },
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
          priceRange {
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

const BRANDS = [
  { name: "Kérastase", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=800&auto=format&fit=crop" },
  { name: "Keune", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=800&auto=format&fit=crop" },
  { name: "Wella Professionals", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=800&auto=format&fit=crop" },
  { name: "Sebastian", image: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=800&auto=format&fit=crop" },
];

const NEEDS = [
  { label: "Hidratação", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=400&auto=format&fit=crop" },
  { label: "Nutrição", image: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=400&auto=format&fit=crop" },
  { label: "Reconstrução", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=400&auto=format&fit=crop" },
  { label: "Loiros", image: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?q=80&w=400&auto=format&fit=crop" },
];

const FEATURED_PRODUCTS_MOCK = [
  {
    node: {
      id: "1",
      title: "Nutritive Masquintense Riche",
      handle: "kerastase-nutritive-masquintense-riche",
      vendor: "Kérastase",
      description: "Máscara ultra-nutritiva para cabelos muito ressecados.",
      priceRange: { minVariantPrice: { amount: "289.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=800&auto=format&fit=crop", altText: "Kérastase Nutritive" } }] },
      variants: { edges: [{ node: { id: "v1", title: "Default", price: { amount: "289.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  },
  {
    node: {
      id: "2",
      title: "Blond Absolu Sérum Cicanuit",
      handle: "kerastase-blond-absolu-serum-cicanuit",
      vendor: "Kérastase",
      description: "Sérum de noite para recuperação intensa de loiros.",
      priceRange: { minVariantPrice: { amount: "245.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=800&auto=format&fit=crop", altText: "Kérastase Blond Absolu" } }] },
      variants: { edges: [{ node: { id: "v2", title: "Default", price: { amount: "245.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  },
  {
    node: {
      id: "3",
      title: "INVIGO Aqua Pure Shampoo 300ml",
      handle: "wella-invigo-aqua-pure-shampoo",
      vendor: "Wella Professionals",
      description: "Shampoo de limpeza profunda com extrato de lótus.",
      priceRange: { minVariantPrice: { amount: "134.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?q=80&w=800&auto=format&fit=crop", altText: "Wella INVIGO" } }] },
      variants: { edges: [{ node: { id: "v3", title: "Default", price: { amount: "134.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  },
  {
    node: {
      id: "4",
      title: "Fusion Intense Repair Mask",
      handle: "wella-fusion-intense-repair-mask",
      vendor: "Wella Professionals",
      description: "Tratamento de reparação profunda para cabelos danificados.",
      priceRange: { minVariantPrice: { amount: "198.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1626784215021-2e39ccf971cd?q=80&w=800&auto=format&fit=crop", altText: "Wella Fusion" } }] },
      variants: { edges: [{ node: { id: "v4", title: "Default", price: { amount: "198.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  }
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

  const { data: productsData } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => storefrontApiRequest(GET_FEATURED_PRODUCTS, { first: 6 }),
  });

  const products = productsData?.data?.products?.edges?.length > 0 
    ? productsData.data.products.edges 
    : FEATURED_PRODUCTS_MOCK;

  return (
    <div className="min-h-screen bg-white text-[#1C1C1A] selection:bg-[#B8955A]/20 font-sans" ref={containerRef}>
      <GlobalStyleSync />
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <MotionSection 
          style={{ opacity: heroOpacity }} 
          className="relative min-h-[90vh] md:min-h-screen flex items-center overflow-hidden bg-black"
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
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent h-1/2 bottom-0" />
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
                <div className="w-12 md:w-16 h-[1px] bg-[#B8955A]" />
                <span className="text-[9px] md:text-[11px] uppercase tracking-[0.5em] font-bold text-[#B8955A]">
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
                na sua <span className="italic underline underline-offset-8 decoration-[#B8955A]/30">intimidade</span>
              </MotionH1>

              <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 md:gap-6 items-center mb-8 md:mb-12"
              >
                <Button 
                  size="lg" 
                  onClick={scrollToBrands}
                  className="w-full sm:w-auto bg-[#B8955A] hover:bg-white text-black hover:text-[#1C1C1A] px-10 md:px-14 h-12 md:h-14 text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-black transition-all duration-700 rounded-none shadow-[0_20px_50px_rgba(184,149,90,0.2)] hover:-translate-y-1 group relative overflow-hidden"
                >
                  <span className="relative z-10">Explorar Coleções</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <ArrowRight className="relative z-10 ml-4 h-4 w-4 transition-transform group-hover:translate-x-2" />
                </Button>
                <button 
                  onClick={scrollToQuiz}
                  className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-bold text-white/50 hover:text-white transition-all duration-500 border-b border-white/10 hover:border-white/40 pb-2"
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
                <span className="text-[8px] md:text-[9px] uppercase tracking-[0.4em] font-bold text-white/40 group-hover:text-[#B8955A] transition-colors duration-500">
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
                  <div className="w-[1px] h-10 bg-gradient-to-b from-[#B8955A] to-transparent opacity-60" />
                  <ChevronDown className="h-4 w-4 text-[#B8955A]/60 -mt-1" />
                </MotionDiv>
              </button>

              <MotionDiv
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.5, duration: 2 }}
                className="mt-4 text-center px-4"
              >
                <div className="flex items-center gap-2 justify-center mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-2 w-2 fill-[#B8955A] text-[#B8955A] opacity-60" />
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

        <div ref={quizRef}>
          <AIQuiz />
        </div>

        {/* BRANDS SECTION */}
        <section ref={brandsRef} className="bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label">
                <span>Curadoria Exclusiva</span>
              </div>
              <h2 className="font-serif font-light text-[#1C1C1A] text-3xl md:text-4xl">
                As Marcas Mais <span className="italic text-[#B8955A]">Desejadas</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {BRANDS.map((brand, i) => (
                <MotionDiv 
                  key={brand.name}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                  className="group relative aspect-[3/4] overflow-hidden bg-[#F8F6F2] cursor-pointer"
                >
                  <img 
                    src={brand.image} 
                    alt={brand.name} 
                    className="w-full h-full object-cover grayscale transition-all duration-[2000ms] group-hover:grayscale-0 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-[#B8955A]/20 transition-all duration-1000" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700">
                    <h3 className="text-white font-serif text-3xl text-center mb-8">{brand.name}</h3>
                    <Button className="bg-white text-black hover:bg-[#1C1C1A] hover:text-white px-10 h-14 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500">
                      Explorar Coleção
                    </Button>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </section>

        {/* NEEDS SECTION */}
        <section className="bg-[#F8F6F2]">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label">
                <span>Necessidades</span>
              </div>
              <h2 className="font-serif font-light text-[#1C1C1A] text-3xl md:text-4xl">
                Tratamento por <span className="italic text-[#B8955A]">Desejo</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {NEEDS.map((need, i) => (
                <MotionDiv 
                  key={need.label}
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
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-[#1C1C1A]/60 transition-all duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-serif text-2xl md:text-3xl border-b border-white/0 group-hover:border-white/30 pb-2 transition-all duration-500">{need.label}</span>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </section>

        <CampaignBanner />
        <ShopByCategory />

        {/* PRODUCTS SECTION */}
        <section className="bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label">
                <span>Destaques</span>
              </div>
              <h2 className="font-serif font-light text-[#1C1C1A] text-3xl md:text-4xl">
                Mais Vendidos da <span className="italic text-[#B8955A]">Semana</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {products.map((product: any) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
            
            <div className="mt-20 flex justify-center">
                <Button variant="outline" className="border-black/10 hover:border-black px-16 h-18 rounded-none text-[11px] uppercase tracking-[0.4em] font-bold transition-all duration-700">
                    Ver Toda a Coleção
                </Button>
            </div>
          </div>
        </section>

        {/* NOVIDADES SECTION */}
        <section className="bg-[#F8F6F2]">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-16">
              <div className="section-label">
                <span>Lançamentos</span>
              </div>
              <h2 className="font-serif font-light text-[#1C1C1A] text-3xl md:text-4xl">
                Novidades <span className="italic text-[#B8955A]">Recém-Chegadas</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {products.slice(0, 4).map((product: any) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        <FlashOffer />
        <RitualSection />
        {/* BANNER INSTITUCIONAL ENTRE SEÇÕES */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="bg-[#1C1C1A] text-white p-12 md:p-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
                    <img 
                        src="https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=800" 
                        className="w-full h-full object-cover"
                        alt="Background"
                    />
                </div>
                <div className="relative z-10 max-w-xl">
                    <h3 className="font-serif text-4xl md:text-5xl mb-6 font-light">Curadoria Exclusiva</h3>
                    <p className="text-white/40 text-xs uppercase tracking-[0.4em] font-bold mb-10">Os melhores produtos utilizados pelos principais salões do Brasil.</p>
                    <Button className="bg-[#B8955A] hover:bg-white text-black hover:text-[#1C1C1A] px-12 h-14 rounded-none text-[10px] uppercase tracking-[0.4em] font-black transition-all duration-700">
                        Conhecer Coleção
                    </Button>
                </div>
            </div>
          </div>
        </section>

        <SocialProof />
        <ConsultancySection />
        <Testimonials />
        <InstagramFeed />
      </main>

      <Footer />
    </div>
  );
}

export default Index;
