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
  Search
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
  { name: "Kérastase", subtitle: "Líder mundial em cuidados de luxo", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=800&auto=format&fit=crop" },
  { name: "Wella", subtitle: "Excelência alemã em coloração e tratamento", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=800&auto=format&fit=crop" },
  { name: "Keune", subtitle: "Sofisticação e tecnologia holandesa", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=800&auto=format&fit=crop" },
  { name: "Sebastian", subtitle: "Vanguarda e inovação no estilo", image: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=800&auto=format&fit=crop" },
  { name: "L'Oréal Pro", subtitle: "O toque dos melhores salões", image: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?q=80&w=800&auto=format&fit=crop" },
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 font-sans">
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative h-[90vh] min-h-[700px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2000&auto=format&fit=crop" 
              alt="Modelo com cabelo impecável"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>

          <div className="container mx-auto px-4 md:px-12 relative z-10 py-24">
            <div className="max-w-3xl text-white">
              <div className="flex items-center gap-4 mb-6 animate-fade-in">
                <div className="w-12 h-[1px] bg-primary" />
                <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] font-medium text-primary">
                  Especialista em Cabelo Profissional
                </span>
              </div>
              <h1 className="font-serif text-5xl md:text-[64px] font-light mb-8 leading-[1.1] animate-slide-up">
                O produto do seu salão,<br />na sua casa
              </h1>
              <p className="text-base md:text-lg mb-12 text-white/80 font-light max-w-lg leading-relaxed animate-slide-up animation-delay-200">
                Kérastase, Wella, Keune, Sebastian — 100% originais com consultoria especializada de quem entende de fios.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 animate-slide-up animation-delay-300">
                <Button size="lg" className="px-12 h-14 text-[13px] uppercase tracking-widest font-bold">Explorar marcas</Button>
                <Button variant="ghost" className="text-white hover:text-primary hover:bg-white/5 group h-14 px-8 text-[13px] uppercase tracking-widest font-bold">
                  Falar com especialista <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Floating Badges */}
          <div className="absolute bottom-16 right-4 md:right-12 hidden md:flex flex-col gap-4 items-end animate-fade-in animation-delay-500">
            {[
              "Produtos 100% originais",
              "Frete grátis acima de R$ 199",
              "+2.000 avaliações 5 estrelas"
            ].map((badge) => (
              <div key={badge} className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-white font-medium shadow-2xl">
                {badge}
              </div>
            ))}
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="bg-[#1a1a18] text-white py-12 border-y border-white/5">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-wrap md:flex-nowrap justify-between items-center gap-8 md:gap-4">
              {TRUST_BAR_ITEMS.map((item, index) => (
                <div key={item.text} className="flex flex-1 items-center justify-center gap-4 group min-w-[200px] md:min-w-0">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-primary stroke-[1.5]" />
                    <span className="text-[11px] uppercase tracking-[0.15em] font-medium opacity-90 whitespace-nowrap">{item.text}</span>
                  </div>
                  {index < TRUST_BAR_ITEMS.length - 1 && (
                    <div className="hidden md:block h-4 w-[1px] bg-primary/30 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BRANDS SECTION */}
        <section className="py-32 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="mb-20">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-[1px] bg-primary" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                  Curadoria Exclusiva
                </span>
              </div>
              <h2 className="font-serif text-4xl md:text-5xl font-light">As marcas que os profissionais usam</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {BRANDS.map((brand) => (
                <div key={brand.name} className="group cursor-pointer relative h-[200px] overflow-hidden">
                  <img 
                    src={brand.image} 
                    alt={brand.name}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-500" />
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h3 className="font-serif text-3xl text-white tracking-widest mb-2 transform transition-transform duration-500 group-hover:-translate-y-2">
                      {brand.name}
                    </h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/80 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                      {brand.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="py-32 bg-[#F9F7F3]">
          <div className="container mx-auto px-4 md:px-12">
            <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-[1px] bg-primary" />
                  <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                    Destaques da Temporada
                  </span>
                </div>
                <h2 className="font-serif text-4xl md:text-5xl font-light">Cuidados essenciais para seus fios</h2>
              </div>
              <Button variant="link" className="text-[11px] uppercase tracking-[0.2em] font-bold group h-auto p-0">
                Ver todos os produtos <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
              {products.map((product: any) => (
                <ProductCard key={product.node.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* SPECIALIST SECTION */}
        <section className="flex flex-col md:flex-row min-h-[700px]">
          <div className="md:w-1/2 relative h-[500px] md:h-auto">
            <img 
              src="https://images.unsplash.com/photo-1595475241949-0f02120dc6b2?q=80&w=1200&auto=format&fit=crop" 
              alt="Especialista Fragranciaria"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="md:w-1/2 bg-[#1a1a18] text-white p-16 md:p-32 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-[1px] bg-primary" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-primary">
                Nosso Diferencial
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-[32px] font-light mb-12 leading-tight">
              Não somos um marketplace — somos especialistas
            </h2>
            <div className="space-y-0 mb-16">
              {[
                "Curadoria feita por quem entende de cabelo",
                "Produtos 100% originais dos distribuidores oficiais",
                "Atendimento humano e especializado via WhatsApp"
              ].map((text, idx) => (
                <div key={text} className={cn(
                  "py-8 flex items-start gap-6 group border-b border-white/5",
                  idx === 0 && "border-t border-white/5"
                )}>
                  <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0 transition-transform group-hover:rotate-12" />
                  <span className="text-lg text-white/70 font-light leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="bg-transparent border-white/20 hover:bg-white/5 text-white self-start h-16 px-10 text-[13px] uppercase tracking-widest font-bold">
              <MessageCircle className="mr-3 h-5 w-5" /> Falar com especialista
            </Button>
          </div>
        </section>

        {/* HAIR QUIZ CTA */}
        <section className="py-32 bg-background relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-serif text-3xl md:text-5xl font-light mb-6">Qual produto é ideal para o seu cabelo?</h2>
              <p className="text-muted-foreground text-lg mb-12 font-light">
                Responda 4 perguntas rápidas e receba uma indicação personalizada baseada na nossa curadoria especialista.
              </p>
              <Button size="lg" className="px-12 h-14 text-[13px] uppercase tracking-widest font-bold">Fazer diagnóstico gratuito</Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#1a1a18] text-white pt-32 pb-16 border-t border-primary/20">
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