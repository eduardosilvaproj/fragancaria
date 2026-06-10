import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight,
  Sparkles
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
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const MotionDiv = motion.div as any;
const MotionSection = motion.section as any;
const MotionH1 = motion.h1 as any;
const MotionH2 = motion.h2 as any;

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
  { label: "Antifrizz", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=400&auto=format&fit=crop" },
  { label: "Oleosidade", image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop" },
  { label: "Coloração", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=400&auto=format&fit=crop" },
  { label: "Química", image: "https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=400&auto=format&fit=crop" },
  { label: "Cacheados", image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=400&auto=format&fit=crop" },
  { label: "Couro cabeludo", image: "https://images.unsplash.com/photo-1585232351009-aa87416fca90?q=80&w=400&auto=format&fit=crop" },
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
  },
  {
    node: {
      id: "5",
      title: "Care Vital Nutrition Mask",
      handle: "keune-care-vital-nutrition-mask",
      vendor: "Keune",
      description: "Máscara hidratante intensiva para fios fragilizados.",
      priceRange: { minVariantPrice: { amount: "176.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=800&auto=format&fit=crop", altText: "Keune Mask" } }] },
      variants: { edges: [{ node: { id: "v5", title: "Default", price: { amount: "176.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  },
  {
    node: {
      id: "6",
      title: "Trilliance Shampoo",
      handle: "sebastian-trilliance-shampoo",
      vendor: "Sebastian Professional",
      description: "Shampoo de brilho sublime com extrato de cristal de rocha.",
      priceRange: { minVariantPrice: { amount: "112.00", currencyCode: "BRL" } },
      images: { edges: [{ node: { url: "https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=800&auto=format&fit=crop", altText: "Sebastian Shampoo" } }] },
      variants: { edges: [{ node: { id: "v6", title: "Default", price: { amount: "112.00", currencyCode: "BRL" }, availableForSale: true } }] }
    }
  }
];

function Index() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef as any,
    offset: ["start start", "end start"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const { data: productsData } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => storefrontApiRequest(GET_FEATURED_PRODUCTS, { first: 6 }),
  });

  const products = productsData?.data?.products?.edges?.length > 0 
    ? productsData.data.products.edges 
    : FEATURED_PRODUCTS_MOCK;

  return (
    <div className="min-h-screen bg-[#F8F6F2] text-[#1C1C1A] selection:bg-[#B8955A]/20 font-sans" ref={containerRef}>
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <MotionSection 
          style={{ opacity: heroOpacity }} 
          className="relative h-[100vh] min-h-[700px] md:min-h-[800px] flex items-center overflow-hidden bg-black"
        >
          {/* Background Image with Parallax & Ken Burns */}
          <MotionDiv style={{ y: heroY }} className="absolute inset-0 z-0">
            <div className="w-full h-full overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2000&auto=format&fit=crop" 
                alt="Boutique de luxo"
                className="w-full h-full object-cover animate-ken-burns scale-110 md:object-[center_right]"
              />
              {/* Dynamic Overlay: Darker on the left for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent md:from-black/85 md:via-black/30 md:to-transparent" />
            </div>
          </MotionDiv>

          <div className="container mx-auto px-6 md:px-12 relative z-10 py-20 md:py-24">
            <div className="w-full md:max-w-[45%] flex flex-col items-center md:items-start text-center md:text-left">
              {/* Subtitle with gold line */}
              <MotionDiv 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8"
              >
                <div className="hidden md:block w-16 md:w-20 h-[1px] bg-[#B8955A]" />
                <span className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">
                  Especialista em Cabelo Profissional
                </span>
              </MotionDiv>
              
              {/* Main Headline - Editorial Style */}
              <MotionH1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                className="font-serif text-[40px] md:text-[64px] lg:text-[86px] font-light mb-8 md:mb-12 leading-[1.1] tracking-tighter text-white"
              >
                A excelência do salão<br />
                <span className="md:block">na sua <span className="italic underline decoration-[#B8955A]/30">intimidade</span></span>
              </MotionH1>
              
              {/* Benefits List - Single axis alignment */}
              <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.4 }}
                className="flex flex-col md:flex-row flex-wrap md:items-center gap-y-4 md:gap-x-10 mb-12 md:mb-16"
              >
                {[
                  "Produtos Originais", "Distribuidor Oficial", "Atendimento Especializado", "Curadoria Premium"
                ].map((label, idx) => (
                  <span key={label} className="flex items-center justify-center md:justify-start gap-3 text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-bold text-white/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#B8955A]" />
                    {label}
                    {idx < 3 && <div className="hidden lg:block ml-10 w-[1px] h-3 bg-white/10" />}
                  </span>
                ))}
              </MotionDiv>

              {/* Action Buttons */}
              <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-6 md:gap-10 items-center w-full md:w-auto"
              >
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto bg-[#B8955A] hover:bg-white text-black hover:text-[#1C1C1A] border-none px-12 md:px-20 h-14 md:h-18 text-[11px] md:text-[12px] uppercase tracking-[0.4em] font-black transition-all duration-500 shadow-[0_20px_50px_rgba(184,149,90,0.2)] group rounded-none hover:-translate-y-1"
                >
                  Comprar Agora
                  <ArrowRight className="ml-4 h-4 w-4 transition-transform group-hover:translate-x-2" />
                </Button>
                <button className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-bold text-white/60 hover:text-white transition-all duration-300 border-b border-white/10 hover:border-white/40 pb-2">
                  Descobrir meu Ritual
                </button>
              </MotionDiv>
            </div>
          </div>

          {/* Scroll Indicator */}
          <MotionDiv 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 1.5 }}
            className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 cursor-pointer hidden sm:flex"
          >
            <span className="text-[9px] uppercase tracking-[0.4em] text-white/40 font-bold">Scroll</span>
            <div className="w-[1px] h-12 md:h-16 bg-gradient-to-b from-[#B8955A] to-transparent" />
          </MotionDiv>
        </MotionSection>

        <BenefitBar />

        {/* BRANDS SECTION */}
        <section className="py-40 bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-24">
              <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-center gap-6 mb-8"
              >
                <div className="w-16 h-[1px] bg-[#B8955A]" />
                <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">Curadoria Exclusiva</span>
                <div className="w-16 h-[1px] bg-[#B8955A]" />
              </MotionDiv>
              <MotionH2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-serif text-5xl md:text-7xl font-light text-[#1C1C1A]"
              >
                As Marcas Mais <span className="italic text-[#B8955A]">Desejadas</span>
              </MotionH2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {BRANDS.map((brand, i) => (
                <MotionDiv 
                  key={brand.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group relative aspect-[3/4] overflow-hidden bg-[#F8F6F2] cursor-pointer"
                >
                  <img 
                    src={brand.image} 
                    alt={brand.name} 
                    className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-[#B8955A]/40 transition-all duration-700" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                    <h3 className="text-white font-serif text-3xl md:text-4xl text-center mb-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700">{brand.name}</h3>
                    <Button className="bg-white text-black hover:bg-[#1C1C1A] hover:text-white px-8 h-12 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100">
                      Explorar Coleção
                    </Button>
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </section>

        {/* RESULTS FILTER */}
        <section className="py-40 bg-[#F8F6F2]">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-24">
              <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-center gap-6 mb-8"
              >
                <div className="w-16 h-[1px] bg-[#B8955A]" />
                <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">Filtro Especializado</span>
                <div className="w-16 h-[1px] bg-[#B8955A]" />
              </MotionDiv>
              <MotionH2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="font-serif text-5xl md:text-6xl font-light text-[#1C1C1A]"
              >
                Qual resultado você <span className="italic text-[#B8955A]">almeja?</span>
              </MotionH2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              {NEEDS.map((need, i) => (
                <MotionDiv 
                  key={need.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-square overflow-hidden mb-6 bg-white shadow-xl transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-2xl">
                    <img 
                      src={need.image} 
                      alt={need.label}
                      className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-all duration-700" />
                  </div>
                  <div className="flex items-center justify-center gap-4 overflow-hidden">
                    <div className="w-0 h-[1px] bg-[#B8955A] transition-all duration-500 group-hover:w-8" />
                    <span className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#1C1C1A]/60 group-hover:text-[#B8955A] transition-colors whitespace-nowrap">
                      {need.label}
                    </span>
                    <div className="w-0 h-[1px] bg-[#B8955A] transition-all duration-500 group-hover:w-8" />
                  </div>
                </MotionDiv>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="py-40 bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
              <div className="max-w-3xl">
                <MotionDiv 
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-6 mb-8"
                >
                  <div className="w-20 h-[1px] bg-[#B8955A]" />
                  <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">Destaques da Boutique</span>
                </MotionDiv>
                <MotionH2 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="font-serif text-5xl md:text-[80px] font-light text-[#1C1C1A] leading-tight"
                >
                  Rituais de Alta <br /><span className="italic">Performance</span>
                </MotionH2>
              </div>
              <Button variant="link" className="text-[12px] uppercase tracking-[0.4em] font-black group h-auto p-0 text-[#1C1C1A] hover:text-[#B8955A] transition-colors border-b-2 border-transparent hover:border-[#B8955A] pb-2">
                Ver Todo o Acervo <ArrowRight className="ml-4 h-4 w-4 transition-transform group-hover:translate-x-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
              {products.map((product: any) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
            
            <div className="mt-32 text-center">
               <Button className="bg-[#1C1C1A] hover:bg-[#B8955A] text-white px-20 h-18 rounded-none text-[12px] uppercase tracking-[0.4em] font-bold transition-all duration-700 shadow-2xl">
                 Ver Todos os Produtos
               </Button>
            </div>
          </div>
        </section>

        <RitualSection />
        
        <ConsultancySection />

        <AIQuiz />

        <Testimonials />

        <InstagramFeed />
      </main>

      <Footer />
    </div>
  );
}