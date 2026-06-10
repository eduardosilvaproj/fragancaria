import { createFileRoute } from "@tanstack/react-router";
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

function Index() {
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => storefrontApiRequest(GET_FEATURED_PRODUCTS, { first: 6 }),
  });

  const products = productsData?.data?.products?.edges || [];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative h-screen min-h-[700px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=2000&auto=format&fit=crop" 
              alt="Modelo com cabelo impecável"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
          </div>

          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-2xl text-white">
              <span className="inline-block text-[10px] md:text-xs uppercase tracking-[0.2em] font-bold mb-4 animate-fade-in">
                Especialista em Cabelo Profissional
              </span>
              <h1 className="font-serif text-5xl md:text-7xl mb-6 leading-[1.1] animate-slide-up">
                O produto do seu salão, na sua casa
              </h1>
              <p className="text-base md:text-lg mb-10 text-white/90 font-light max-w-lg leading-relaxed animate-slide-up animation-delay-200">
                Kérastase, Wella, Keune, Sebastian — 100% originais com consultoria especializada de quem entende de fios.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 animate-slide-up animation-delay-300">
                <Button size="lg" className="px-10">Explorar marcas</Button>
                <Button variant="ghost" className="text-white hover:text-primary hover:bg-white/10 group">
                  Falar com especialista <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Floating Badges */}
          <div className="absolute bottom-12 right-4 md:right-8 hidden md:flex flex-col gap-4 items-end animate-fade-in animation-delay-500">
            {[
              "Produtos 100% originais",
              "Frete grátis acima de R$ 199",
              "+2.000 avaliações 5 estrelas"
            ].map((badge) => (
              <div key={badge} className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 text-[10px] uppercase tracking-widest text-white font-medium">
                {badge}
              </div>
            ))}
          </div>
        </section>

        {/* TRUST BAR */}
        <section className="bg-[#1a1a18] text-white py-10">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              {TRUST_BAR_ITEMS.map((item) => (
                <div key={item.text} className="flex flex-col items-center text-center space-y-3 group">
                  <item.icon className="h-6 w-6 text-primary stroke-[1.5] transition-transform duration-300 group-hover:scale-110" />
                  <span className="text-[10px] uppercase tracking-widest font-medium opacity-80">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BRANDS SECTION */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-8">
            <div className="text-center mb-16">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-3 block">
                Curadoria Exclusiva
              </span>
              <h2 className="font-serif text-3xl md:text-4xl">As marcas que os profissionais usam</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {BRANDS.map((brand) => (
                <div key={brand.name} className="group cursor-pointer">
                  <div className="relative aspect-[4/5] overflow-hidden mb-4 rounded-sm">
                    <img 
                      src={brand.image} 
                      alt={brand.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                       <h3 className="font-serif text-3xl text-white tracking-wider">{brand.name}</h3>
                    </div>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">
                    {brand.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="py-24 bg-[#F3EFE8]">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-3 block text-center md:text-left">
                  Destaques da Temporada
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-center md:text-left">Cuidados essenciais para seus fios</h2>
              </div>
              <Button variant="link" className="text-[11px] uppercase tracking-widest font-bold group">
                Ver todos os produtos <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-white/50 animate-pulse rounded-sm" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {products.map((product: any) => (
                  <ProductCard key={product.node.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white/30 border border-dashed border-border rounded-sm">
                <Search className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground mb-6">Nenhum produto encontrado na sua loja Shopify.</p>
                <p className="text-sm font-medium">Ei, notamos que você ainda não tem produtos, crie um me dizendo o que o produto é e qual é o preço.</p>
              </div>
            )}
          </div>
        </section>

        {/* SPECIALIST SECTION */}
        <section className="flex flex-col md:flex-row min-h-[600px]">
          <div className="md:w-1/2 relative h-[400px] md:h-auto">
            <img 
              src="https://images.unsplash.com/photo-1595475241949-0f02120dc6b2?q=80&w=1200&auto=format&fit=crop" 
              alt="Especialista Fragranciaria"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="md:w-1/2 bg-[#1a1a18] text-white p-12 md:p-24 flex flex-col justify-center">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-6">
              Nosso Diferencial
            </span>
            <h2 className="font-serif text-4xl md:text-5xl mb-8 leading-tight">
              Não somos um marketplace — somos especialistas
            </h2>
            <ul className="space-y-6 mb-12">
              {[
                "Curadoria feita por quem entende de cabelo",
                "Produtos 100% originais dos distribuidores oficiais",
                "Atendimento humano e especializado via WhatsApp"
              ].map((text) => (
                <li key={text} className="flex items-start gap-4 group">
                  <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0 transition-transform group-hover:rotate-12" />
                  <span className="text-base text-white/80 font-light">{text}</span>
                </li>
              ))}
            </ul>
            <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white border-none self-start h-14 px-8">
              <MessageCircle className="mr-2 h-5 w-5" /> Falar com especialista
            </Button>
          </div>
        </section>

        {/* HAIR QUIZ CTA */}
        <section className="py-24 bg-background relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-serif text-3xl md:text-5xl mb-6">Qual produto é ideal para o seu cabelo?</h2>
              <p className="text-muted-foreground text-lg mb-10 font-light">
                Responda 4 perguntas rápidas e receba uma indicação personalizada baseada na nossa curadoria especialista.
              </p>
              <Button size="lg" className="px-12 h-14">Fazer diagnóstico gratuito</Button>
            </div>
          </div>
          {/* Subtle decorative elements */}
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#1a1a18] text-white pt-24 pb-12">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="space-y-6">
              <span className="font-serif text-3xl tracking-tighter">
                <span className="text-primary italic">F</span>ragranciaria
              </span>
              <p className="text-sm text-white/60 leading-relaxed font-light">
                Sua boutique de beleza profissional. Curadoria exclusiva das melhores marcas mundiais para transformar seus fios em casa.
              </p>
              <div className="flex items-center space-x-4 pt-2">
                {/* Social placeholders */}
                {[1,2,3].map(i => <div key={i} className="h-8 w-8 rounded-full bg-white/10 hover:bg-primary transition-colors cursor-pointer" />)}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-8">Atendimento</h4>
              <ul className="space-y-4 text-sm text-white/60 font-light">
                <li className="hover:text-primary transition-colors cursor-pointer">Central de Ajuda</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Meus Pedidos</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Trocas e Devoluções</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Política de Entrega</li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-8">Institucional</h4>
              <ul className="space-y-4 text-sm text-white/60 font-light">
                <li className="hover:text-primary transition-colors cursor-pointer">Sobre Nós</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Nossa Curadoria</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Política de Privacidade</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Termos de Uso</li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-white mb-8">Marcas</h4>
              <ul className="space-y-4 text-sm text-white/60 font-light">
                <li className="hover:text-primary transition-colors cursor-pointer">Kérastase</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Wella Professional</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Keune</li>
                <li className="hover:text-primary transition-colors cursor-pointer">L'Oréal Pro</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              © 2026 Fragranciaria. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 opacity-30 grayscale">
               <div className="h-4 w-8 bg-white" />
               <div className="h-4 w-8 bg-white" />
               <div className="h-4 w-8 bg-white" />
            </div>
          </div>
        </div>
      </footer>
      
      {/* Floating WhatsApp Button */}
      <button className="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300">
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
