import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  MessageCircle,
  ArrowRight,
  Sparkles,
  Search,
  Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify/client";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fragranciaria | Especialista em Cabelo Profissional" },
      { name: "description", content: "Kérastase, Wella, Keune, Sebastian — 100% originais com consultoria especializada." },
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

const TRUST_BAR_ITEMS = [
  { icon: ShieldCheck, text: "Originais garantidos" },
  { icon: Truck, text: "Entrega em todo Brasil" },
  { icon: RotateCcw, text: "Troca fácil em 30 dias" },
  { icon: CheckCircle2, text: "Pagamento 100% seguro" },
  { icon: MessageCircle, text: "Consultoria via WhatsApp" },
];

const BRANDS = [
  { name: "Kérastase", subtitle: "Líder mundial em cuidados de luxo", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=800&auto=format&fit=crop", count: 48 },
  { name: "Keune", subtitle: "Tecnologia holandesa", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=800&auto=format&fit=crop", count: 32 },
  { name: "Wella Professionals", subtitle: "Excelência em coloração", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=800&auto=format&fit=crop", count: 56 },
  { name: "Sebastian", subtitle: "Vanguarda no estilo", image: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=800&auto=format&fit=crop", count: 24 },
  { name: "L'Oréal Professionnel", subtitle: "O toque dos melhores salões", image: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?q=80&w=800&auto=format&fit=crop", count: 42 },
];

const NEEDS = [
  { label: "Hidratação", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=400&auto=format&fit=crop" },
  { label: "Nutrição", image: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=400&auto=format&fit=crop" },
  { label: "Reconstrução", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=400&auto=format&fit=crop" },
  { label: "Loiros", image: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?q=80&w=400&auto=format&fit=crop" },
  { label: "Antifrizz", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=400&auto=format&fit=crop" },
  { label: "Coloração", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=400&auto=format&fit=crop" },
  { label: "Química", image: "https://images.unsplash.com/photo-1559599101-f09722fb4948?q=80&w=400&auto=format&fit=crop" },
  { label: "Cacheados", image: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=400&auto=format&fit=crop" },
  { label: "Oleosidade", image: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?q=80&w=400&auto=format&fit=crop" },
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
      compareAtPriceRange: { minVariantPrice: { amount: "340.00", currencyCode: "BRL" } },
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
      compareAtPriceRange: { minVariantPrice: { amount: "230.00", currencyCode: "BRL" } },
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
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => storefrontApiRequest(GET_FEATURED_PRODUCTS, { first: 6 }),
  });

  const products = productsData?.data?.products?.edges?.length > 0 
    ? productsData.data.products.edges 
    : FEATURED_PRODUCTS_MOCK;

  return (
    <div className="min-h-screen bg-[#F8F6F2] text-[#1C1C1A] selection:bg-[#B8955A]/20 font-sans">
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* Cinematic Video Placeholder - Usando uma imagem de alta qualidade com zoom lento via CSS */}
            <div className="w-full h-full overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2000&auto=format&fit=crop" 
                alt="Boutique de luxo"
                className="w-full h-full object-cover animate-ken-burns scale-110"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent" />
          </div>

          <div className="container mx-auto px-4 md:px-12 relative z-10 py-24">
            <div className="max-w-4xl text-white">
              <div className="flex items-center gap-6 mb-8 animate-fade-in opacity-0 fill-mode-forwards">
                <div className="w-20 h-[1px] bg-[#B8955A]" />
                <span className="text-[11px] uppercase tracking-[0.4em] font-medium text-[#B8955A]">
                  Especialista em Cabelo Profissional
                </span>
              </div>
              <h1 className="font-serif text-6xl md:text-[84px] font-light mb-10 leading-[1] animate-slide-up opacity-0 fill-mode-forwards">
                A excelência do salão<br /><span className="italic">na sua intimidade</span>
              </h1>
              
              <div className="flex flex-wrap gap-x-8 gap-y-4 mb-14 text-[10px] uppercase tracking-[0.2em] font-medium text-white/60 animate-slide-up opacity-0 fill-mode-forwards [animation-delay:200ms]">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[#B8955A]" /> Produtos 100% Originais</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[#B8955A]" /> Curadoria Especializada</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[#B8955A]" /> Distribuidor Oficial</span>
                <span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-[#B8955A]" /> Atendimento Especializado</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-8 animate-slide-up opacity-0 fill-mode-forwards [animation-delay:400ms]">
                <Button size="lg" className="bg-[#B8955A] hover:bg-[#A68449] border-none px-16 h-16 text-[12px] uppercase tracking-[0.3em] font-bold transition-all duration-500 shadow-2xl">
                  Comprar Agora
                </Button>
                <div className="flex items-center gap-4 px-6 py-2 border border-white/10 backdrop-blur-md bg-white/5">
                   <Sparkles className="h-5 w-5 text-[#B8955A]" />
                   <span className="text-[10px] uppercase tracking-widest">+ Milhares de clientes atendidos no Brasil</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Badges */}
          <div className="absolute bottom-20 right-4 md:right-12 hidden md:flex flex-col gap-6 items-end animate-fade-in opacity-0 fill-mode-forwards [animation-delay:600ms]">
            {[
              { label: "KÉRASTASE", text: "Ritual de Luxo" },
              { label: "WELLA", text: "Cor Profissional" },
              { label: "KEUNE", text: "Alta Tecnologia" }
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-6 group">
                <span className="text-[10px] font-serif italic text-[#B8955A] opacity-50 group-hover:opacity-100 transition-opacity">{badge.label}</span>
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 px-8 py-4 text-[10px] uppercase tracking-[0.3em] text-white font-medium shadow-2xl transition-all hover:bg-white/10">
                  {badge.text}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="bg-[#0A0A0A] text-white py-14 border-y border-white/5 relative z-10 overflow-hidden">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-12 md:gap-4">
              {TRUST_BAR_ITEMS.map((item, index) => (
                <div key={item.text} className="flex flex-1 items-center justify-center gap-6 group min-w-[200px] md:min-w-0 transition-transform duration-500 hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <item.icon className="h-4 w-4 text-[#B8955A] stroke-[1] transition-transform duration-500 group-hover:scale-125" />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-light text-white/60 group-hover:text-white transition-colors">{item.text}</span>
                  </div>
                  {index < TRUST_BAR_ITEMS.length - 1 && (
                    <div className="hidden md:block h-3 w-[1px] bg-[#B8955A]/20 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BRANDS BAR */}
        <section className="bg-white py-12 border-b border-black/5">
          <div className="container mx-auto px-4 overflow-hidden">
            <div className="flex items-center justify-center gap-16 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-700 overflow-x-auto pb-4 scrollbar-hide">
              {BRANDS.map(brand => (
                <span key={brand.name} className="font-serif text-2xl md:text-3xl tracking-widest whitespace-nowrap">{brand.name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* NEEDS SECTION */}
        <section className="py-32 bg-[#F8F6F2]">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-20">
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="w-12 h-[1px] bg-[#B8955A]" />
                <span className="text-[10px] uppercase tracking-[0.4em] font-medium text-[#B8955A]">
                  Escolha seu Resultado
                </span>
                <div className="w-12 h-[1px] bg-[#B8955A]" />
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-light text-[#1C1C1A]">Qual resultado você deseja?</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8">
              {NEEDS.map((need) => (
                <Link key={need.label} to="/" className="group flex flex-col items-center">
                  <div className="relative w-full aspect-square overflow-hidden mb-4 bg-white shadow-sm border border-black/5">
                    <img 
                      src={need.image} 
                      alt={need.label}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-all duration-700" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-[#1C1C1A]/80 group-hover:text-[#B8955A] transition-colors">
                    {need.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="py-40 bg-white">
          <div className="container mx-auto px-4 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
              <div className="max-w-2xl">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-[1px] bg-[#B8955A]" />
                  <span className="text-[11px] uppercase tracking-[0.4em] font-medium text-[#B8955A]">
                    Destaques da Boutique
                  </span>
                </div>
                <h2 className="font-serif text-5xl md:text-6xl font-light text-[#1C1C1A]">Rituais de Alta Performance</h2>
              </div>
              <Button variant="link" className="text-[12px] uppercase tracking-[0.3em] font-bold group h-auto p-0 text-[#1C1C1A] hover:text-[#B8955A] transition-colors">
                Ver Todo o Acervo <ArrowRight className="ml-4 h-4 w-4 transition-transform group-hover:translate-x-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
              {products.map((product: any) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* BRANDS SECTION - EXCLUSIVE BY BRAND */}
        <section className="py-40 bg-[#F8F6F2]">
          <div className="container mx-auto px-4 md:px-12">
            <div className="mb-24 text-center">
              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="w-12 h-[1px] bg-[#B8955A]" />
                <span className="text-[10px] uppercase tracking-[0.4em] font-medium text-[#B8955A]">
                  Compre por Marca
                </span>
                <div className="w-12 h-[1px] bg-[#B8955A]" />
              </div>
              <h2 className="font-serif text-5xl md:text-6xl font-light text-[#1C1C1A]">Curadoria por Grife</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {BRANDS.map((brand, idx) => (
                <div key={brand.name} className={cn(
                  "group cursor-pointer relative h-[500px] overflow-hidden bg-[#1C1C1A]",
                  idx % 2 !== 0 && "md:translate-y-12"
                )}>
                  <img 
                    src={brand.image} 
                    alt={brand.name}
                    className="w-full h-full object-cover opacity-60 transition-all duration-[1.5s] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:scale-110 group-hover:opacity-40"
                  />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                    <h3 className="font-serif text-4xl text-white tracking-widest mb-4 transition-transform duration-700 group-hover:-translate-y-4">
                      {brand.name}
                    </h3>
                    <div className="h-[1px] w-0 bg-[#B8955A] mb-4 transition-all duration-700 group-hover:w-16" />
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 opacity-0 group-hover:opacity-100 transition-all duration-700 transform translate-y-4 group-hover:translate-y-0 mb-4 font-light">
                      {brand.count}+ Produtos
                    </p>
                    <Button variant="outline" className="opacity-0 group-hover:opacity-100 transition-all duration-700 border-white/20 text-white text-[9px] uppercase tracking-[0.2em] h-10 px-6 rounded-none hover:bg-white hover:text-black">
                      Explorar Coleção
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INSTITUTIONAL BANNER - 50/50 */}
        <section className="flex flex-col md:flex-row min-h-[800px] bg-[#1C1C1A] overflow-hidden">
          <div className="md:w-1/2 relative h-[500px] md:h-auto overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=1200&auto=format&fit=crop" 
              alt="Ambiente de luxo Fragranciaria"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] hover:scale-110"
            />
          </div>
          <div className="md:w-1/2 p-16 md:p-32 flex flex-col justify-center bg-[#1C1C1A] text-white border-l border-white/5">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-[1px] bg-[#B8955A]" />
              <span className="text-[11px] uppercase tracking-[0.4em] font-medium text-[#B8955A]">
                Nossa Filosofia
              </span>
            </div>
            <h2 className="font-serif text-4xl md:text-6xl font-light mb-12 leading-tight">
              Curadoria para quem<br />exige <span className="italic">excelência</span>.
            </h2>
            <p className="text-white/60 text-lg md:text-xl font-light leading-relaxed mb-16 max-w-lg">
              "Nossa seleção reúne apenas produtos utilizados pelos melhores profissionais do mercado mundial, garantindo resultados extraordinários no conforto do seu lar."
            </p>
            <Button variant="outline" className="self-start border-[#B8955A]/30 text-[#B8955A] hover:bg-[#B8955A] hover:text-white transition-all duration-500 h-16 px-12 text-[12px] uppercase tracking-[0.3em] font-bold">
              Conheça Nossa História
            </Button>
          </div>
        </section>

        {/* SPECIALIST SECTION - 50/50 REFINED */}
        <section className="flex flex-col md:flex-row min-h-[900px]">
          <div className="md:w-1/2 bg-[#141414] text-white p-16 md:p-32 flex flex-col justify-center relative overflow-hidden">
            {/* Background Texture Effect */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-16 h-[1px] bg-[#B8955A]" />
                <span className="text-[11px] uppercase tracking-[0.4em] font-medium text-[#B8955A]">
                  O Especialista
                </span>
              </div>
              <h2 className="font-serif text-4xl md:text-6xl font-light mb-16 leading-tight">
                Além do comércio.<br /><span className="italic text-[#B8955A]">Uma Consultoria</span>.
              </h2>
              <div className="space-y-0 mb-20">
                {[
                  "Diagnóstico capilar personalizado via chat",
                  "Protocolos de uso originais de cada marca",
                  "Suporte pós-compra com especialistas de salão"
                ].map((text, idx) => (
                  <div key={text} className={cn(
                    "py-10 flex items-start gap-10 group border-b border-white/5",
                    idx === 0 && "border-t border-white/5"
                  )}>
                    <div className="w-10 h-10 rounded-full border border-[#B8955A]/30 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:bg-[#B8955A] group-hover:border-[#B8955A]">
                      <Sparkles className="h-4 w-4 text-[#B8955A] transition-colors group-hover:text-white" />
                    </div>
                    <span className="text-xl text-white/60 font-light leading-relaxed group-hover:text-white transition-colors">{text}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="border-[#B8955A]/30 text-[#B8955A] hover:bg-[#B8955A] hover:text-white transition-all duration-500 h-16 px-12 text-[12px] uppercase tracking-[0.3em] font-bold">
                <MessageCircle className="mr-4 h-5 w-5" /> Iniciar Diagnóstico
              </Button>
            </div>
          </div>
          <div className="md:w-1/2 relative h-[600px] md:h-auto overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1200&auto=format&fit=crop" 
              alt="Especialista em atendimento"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[5s] hover:scale-110"
            />
          </div>
        </section>

        {/* TESTIMONIALS - PREMIUM CAROUSEL */}
        <section className="py-40 bg-white overflow-hidden">
          <div className="container mx-auto px-4 md:px-12">
            <div className="text-center mb-24">
              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="w-12 h-[1px] bg-[#B8955A]" />
                <span className="text-[10px] uppercase tracking-[0.4em] font-medium text-[#B8955A]">
                  Experiências Reais
                </span>
                <div className="w-12 h-[1px] bg-[#B8955A]" />
              </div>
              <h2 className="font-serif text-5xl md:text-6xl font-light text-[#1C1C1A]">Vozes da <span className="italic">Excelência</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                { name: "Helena Soares", city: "São Paulo, SP", text: "A curadoria é impecável. Os produtos da Kérastase chegaram em uma embalagem que exala luxo, e o suporte via WhatsApp foi fundamental para escolher o ritual certo para meu loiro." },
                { name: "Beatriz Lins", city: "Rio de Janeiro, RJ", text: "Finalmente uma loja que entende a ciência por trás dos fios. A entrega foi surpreendentemente rápida e a qualidade dos produtos Wella é indiscutível. Sou cliente fiel." },
                { name: "Carolina Mendes", city: "Curitiba, PR", text: "O diagnóstico personalizado mudou minha rotina capilar. Meu cabelo nunca esteve tão saudável. A Fragranciaria não apenas vende, ela educa sobre o luxo capilar." }
              ].map((item, idx) => (
                <div key={idx} className="bg-[#F8F6F2] p-12 flex flex-col items-center text-center group hover:bg-[#1C1C1A] hover:text-white transition-all duration-700">
                  <div className="flex gap-1 mb-8">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-3 w-3 fill-[#B8955A] text-[#B8955A]" />)}
                  </div>
                  <p className="font-serif text-xl italic leading-relaxed mb-10 opacity-80">"{item.text}"</p>
                  <div className="mt-auto">
                    <p className="text-[11px] uppercase tracking-[0.3em] font-bold mb-2">{item.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">{item.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INSTAGRAM GRID */}
        <section className="bg-[#F8F6F2] py-40">
          <div className="container mx-auto px-4 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-center mb-24 gap-8">
              <div className="text-center md:text-left">
                <h2 className="font-serif text-4xl md:text-5xl font-light text-[#1C1C1A] mb-4">Siga a @Fragranciaria</h2>
                <p className="text-[11px] uppercase tracking-[0.4em] text-[#B8955A]">Inspiração Diária para Seus Fios</p>
              </div>
              <Button variant="outline" className="border-[#1C1C1A]/20 text-[#1C1C1A] hover:bg-[#1C1C1A] hover:text-white transition-all duration-500 h-14 px-10 text-[11px] uppercase tracking-[0.3em] font-bold">
                Seguir no Instagram
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=400&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=400&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=400&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1595475241949-0f02120dc6b2?q=80&w=400&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=400&auto=format&fit=crop"
              ].map((img, i) => (
                <div key={i} className="aspect-square overflow-hidden relative group cursor-pointer">
                  <img src={img} alt="Instagram post" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NEWSLETTER - REFINED */}
        <section className="py-40 bg-white">
          <div className="container mx-auto px-4 md:px-12 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="font-serif text-4xl md:text-5xl font-light mb-8 text-[#1C1C1A]">Mantenha-se <span className="italic">Inspirada</span></h2>
              <p className="text-muted-foreground text-sm uppercase tracking-[0.2em] mb-16 font-light">Assine nossa newsletter e receba rituais exclusivos e convites para eventos privados.</p>
              
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="email" 
                  placeholder="Seu endereço de e-mail" 
                  className="flex-1 bg-[#F8F6F2] border-none h-16 px-8 text-sm focus:ring-1 focus:ring-[#B8955A] outline-none transition-all placeholder:uppercase placeholder:tracking-[0.2em] placeholder:text-[10px]"
                />
                <Button className="bg-[#1C1C1A] text-white hover:bg-primary transition-all duration-500 h-16 px-12 text-[11px] uppercase tracking-[0.3em] font-bold">
                  Inscrever-se
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* HAIR QUIZ / DIAGNÓSTICO - PREMIUM EXPERIENCE */}
        <section className="py-40 bg-[#F8F6F2] relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-8 relative z-10 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-12 shadow-sm border border-[#B8955A]/10">
                <Sparkles className="h-10 w-10 text-[#B8955A]" />
              </div>
              <h2 className="font-serif text-5xl md:text-7xl font-light mb-10 text-[#1C1C1A]">Descubra Seu Ritual<br /><span className="italic text-[#B8955A]">Ideal</span></h2>
              <p className="text-muted-foreground text-xl mb-16 font-light max-w-2xl mx-auto leading-relaxed">
                Nossa inteligência artificial, treinada pelos melhores hairstylists, analisará as necessidades únicas dos seus fios em 60 segundos.
              </p>
              <Button size="lg" className="bg-[#1C1C1A] text-white hover:bg-primary transition-all duration-500 px-16 h-16 text-[12px] uppercase tracking-[0.3em] font-bold shadow-2xl">
                Começar Experiência
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#1a1a18] text-white pt-32 pb-16 border-t border-[#B8955A]/30">
        <div className="container mx-auto px-4 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div className="space-y-8">
              <Link to="/" className="flex items-center group">
                <span className="font-serif text-5xl tracking-tighter">
                  <span className="text-primary italic">F</span>ragranciaria
                </span>
              </Link>
              <p className="text-sm text-white/50 leading-relaxed font-light">
                Sua boutique de beleza profissional. Curadoria exclusiva das melhores marcas mundiais para transformar seus fios em casa.
              </p>
              <div className="flex items-center space-x-4">
                {[1,2,3].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary transition-all cursor-pointer">
                    <div className="h-1 w-1 bg-white" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-10">Atendimento</h4>
              <ul className="space-y-5 text-[13px] text-white/50 font-light">
                <li className="hover:text-primary transition-colors cursor-pointer">Central de Ajuda</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Meus Pedidos</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Trocas e Devoluções</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Política de Entrega</li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-10">Institucional</h4>
              <ul className="space-y-5 text-[13px] text-white/50 font-light">
                <li className="hover:text-primary transition-colors cursor-pointer">Sobre Nós</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Nossa Curadoria</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Política de Privacidade</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Termos de Uso</li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-10">Marcas</h4>
              <ul className="space-y-5 text-[13px] text-white/50 font-light">
                <li className="hover:text-primary transition-colors cursor-pointer">Kérastase</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Wella Professional</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Keune</li>
                <li className="hover:text-primary transition-colors cursor-pointer">L'Oréal Pro</li>
              </ul>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
              © 2026 Fragranciaria. Todos os direitos reservados.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-6">
               <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_Pix.png" alt="Pix" className="h-4 opacity-40 grayscale hover:opacity-100 transition-all cursor-help" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3 opacity-40 grayscale hover:opacity-100 transition-all cursor-help" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 opacity-40 grayscale hover:opacity-100 transition-all cursor-help" />
               <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Boleto_Logo.png" alt="Boleto" className="h-4 opacity-40 grayscale hover:opacity-100 transition-all cursor-help" />
            </div>
          </div>
        </div>
      </footer>
      
      {/* Floating WhatsApp Button */}
      <button className="fixed bottom-8 right-8 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 group">
        <MessageCircle className="h-6 w-6" />
        <span className="absolute right-full mr-4 bg-white text-black text-[10px] font-bold uppercase tracking-widest px-4 py-2 shadow-xl rounded-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Falar com especialista</span>
      </button>
    </div>
  );
}