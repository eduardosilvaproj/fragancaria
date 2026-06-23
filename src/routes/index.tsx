import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify/client";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGridSkeleton } from "@/components/shop/ProductSkeleton";
import { FreeShippingBar } from "@/components/shop/FreeShippingBar";
import { FirstPurchaseCoupon } from "@/components/shop/FirstPurchaseCoupon";
import { TrustBadges } from "@/components/shop/TrustBadges";
import { RitualSection } from "@/components/shop/RitualSection";
import { AIQuiz } from "@/components/shop/AIQuiz";
import { AuthorizedBrands } from "@/components/shop/AuthorizedBrands";
import { ConsultancySection } from "@/components/shop/ConsultancySection";
import { GlobalStyleSync } from "@/components/GlobalStyleSync";
import { motion } from "framer-motion";
import { useRef } from "react";

const MotionDiv = motion.div as any;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fragranciaria | Cosméticos Capilares Profissionais" },
      { name: "description", content: "Loja online de cosméticos capilares profissionais. Kérastase, Wella, L'Oréal e mais. Frete grátis acima de R$299. Até 10x sem juros." },
      { property: "og:title", content: "Fragranciaria | Cosméticos Capilares Profissionais" },
      { property: "og:description", content: "Produtos profissionais para cuidar dos seus fios em casa. Frete grátis acima de R$299." },
      { property: "og:image", content: "https://res.cloudinary.com/dg9oqfxoq/image/upload/f_auto,q_auto/ChatGPT_Image_22_de_jun._de_2025_11_34_41_uhvqo0" },
    ],
  }),
  component: Index,
});

const GET_FEATURED_PRODUCTS = `
  query GetFeaturedProducts($first: Int!) {
    products(first: $first, sortKey: BEST_SELLING) {
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

// Categorias com imagens reais dos produtos
const CATEGORIES = [
  { label: "Shampoos", slug: "shampoos", productType: "Shampoo" },
  { label: "Condicionadores", slug: "condicionadores", productType: "Condicionador" },
  { label: "Máscaras", slug: "mascaras", productType: "Máscara" },
  { label: "Finalizadores", slug: "finalizadores", productType: "Finalizador" },
  { label: "Coloração", slug: "coloracao", productType: "Coloração" },
  { label: "Kits", slug: "kits", productType: "Kit" },
];

// Marcas para grid
const BRANDS_GRID = [
  { name: "L'Oréal Professionnel", logo: "https://res.cloudinary.com/dg9oqfxoq/image/upload/v1782140934/Loreal_yhp0tp.png" },
  { name: "Kérastase", logo: "https://res.cloudinary.com/dg9oqfxoq/image/upload/v1782140934/kerastase-logo-png_seeklogo-78062_oawn3c.png" },
  { name: "Wella Professionals", logo: "https://res.cloudinary.com/dg9oqfxoq/image/upload/v1782140935/wella_mpinsr.png" },
  { name: "Schwarzkopf", logo: "https://res.cloudinary.com/dg9oqfxoq/image/upload/v1782140934/schwarzkopf_dufj7y.png" },
  { name: "Keune", logo: "https://res.cloudinary.com/dg9oqfxoq/image/upload/v1782140934/keune_tptbl9.png" },
  { name: "Alfaparf Milano", logo: "https://res.cloudinary.com/dg9oqfxoq/image/upload/f_auto,q_auto/alfaparf_lrlhph" },
];

function Index() {
  const productsRef = useRef<HTMLElement>(null);

  const scrollToProducts = () => {
    productsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => storefrontApiRequest(GET_FEATURED_PRODUCTS, { first: 20 }),
  });

  // Produtos do Shopify
  const allProducts = productsData?.data?.products?.edges || [];

  // Mais vendidos (primeiros 8)
  const bestSellers = allProducts.slice(0, 8);

  // Produtos com desconto para "Promoções"
  const saleProducts = allProducts.filter((p: any) => {
    const variant = p.node.variants?.edges?.[0]?.node;
    if (!variant?.compareAtPrice?.amount) return false;
    const price = parseFloat(variant.price?.amount || "0");
    const compareAt = parseFloat(variant.compareAtPrice.amount);
    return compareAt > price;
  }).slice(0, 4);

  // Verifica se tem produtos para exibir
  const hasBestSellers = bestSellers.length > 0;
  const hasSaleProducts = saleProducts.length > 0;

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#1A1A1A] selection:bg-[#D4AF37]/20 font-sans">
      <GlobalStyleSync />

      {/* 1. BARRA DE TOPO FIXA */}
      <FreeShippingBar />

      <Navbar />

      <main>
        {/* 2. HERO ENXUTO */}
        <section className="relative h-[70vh] md:h-[80vh] flex items-center overflow-hidden bg-[#0F3A45]">
          <div className="absolute inset-0 z-0">
            <img
              src="https://res.cloudinary.com/dg9oqfxoq/image/upload/f_auto,q_auto/ChatGPT_Image_22_de_jun._de_2025_11_34_41_uhvqo0"
              alt="Cosméticos capilares profissionais"
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F3A45] via-[#0F3A45]/80 to-transparent" />
          </div>

          <div className="container mx-auto px-4 md:px-12 relative z-10">
            <div className="max-w-2xl">
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <span className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4 block">
                  Cosméticos Profissionais
                </span>
                <h1 className="font-serif font-light text-white text-4xl md:text-5xl lg:text-6xl leading-tight mb-6">
                  Produtos de salão<br />
                  <span className="italic text-[#D4AF37]">direto para você</span>
                </h1>
                <p className="text-white/60 text-base md:text-lg mb-8 max-w-lg">
                  Kérastase, Wella, L'Oréal e mais marcas premium com frete grátis acima de R$299.
                </p>
                <Button
                  size="lg"
                  onClick={scrollToProducts}
                  className="bg-[#D4AF37] hover:bg-white text-[#0F3A45] px-10 h-14 text-[11px] uppercase tracking-[0.3em] font-bold rounded-none transition-all duration-500 group"
                >
                  Comprar agora
                  <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </MotionDiv>
            </div>
          </div>
        </section>

        {/* 3. MAIS VENDIDOS */}
        <section ref={productsRef} className="bg-white py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-12">
            <div className="flex items-center justify-between mb-10">
              <div>
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] font-bold">Destaques</span>
                <h2 className="font-serif font-light text-[#1A1A1A] text-2xl md:text-3xl mt-1">
                  Mais Vendidos
                </h2>
              </div>
              <Link to="/produtos">
                <Button variant="outline" className="border-[#0F3A45]/20 hover:border-[#0F3A45] hover:bg-[#0F3A45] hover:text-white px-6 h-10 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold transition-all">
                  Ver todos
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </div>

            {isLoadingProducts ? (
              <ProductGridSkeleton count={8} />
            ) : hasBestSellers ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {bestSellers.map((product: any, i: number) => (
                  <ProductCard key={product.node.id} product={product} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#1A1A1A]/50">
                <p>Carregando produtos...</p>
              </div>
            )}
          </div>
        </section>

        {/* 4. OFERTAS / PROMOÇÕES */}
        {(isLoadingProducts || hasSaleProducts) && (
          <section className="bg-[#F7F5F2] py-16 md:py-20">
            <div className="container mx-auto px-4 md:px-12">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] font-bold">Ofertas</span>
                  <h2 className="font-serif font-light text-[#1A1A1A] text-2xl md:text-3xl mt-1">
                    Promoções Imperdíveis
                  </h2>
                </div>
                <Link to="/produtos" search={{ onSale: "true" }}>
                  <Button variant="outline" className="border-[#0F3A45]/20 hover:border-[#0F3A45] hover:bg-[#0F3A45] hover:text-white px-6 h-10 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold transition-all">
                    Ver ofertas
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {isLoadingProducts ? (
                <ProductGridSkeleton count={4} />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {saleProducts.map((product: any, i: number) => (
                    <ProductCard key={product.node.id} product={product} index={i} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 5. CUPOM DE PRIMEIRA COMPRA */}
        <FirstPurchaseCoupon />

        {/* 6. CATEGORIAS + MARCAS */}
        <section className="bg-white py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-12">
            {/* Categorias */}
            <div className="mb-16">
              <div className="text-center mb-10">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] font-bold">Navegue</span>
                <h2 className="font-serif font-light text-[#1A1A1A] text-2xl md:text-3xl mt-1">
                  Por Categoria
                </h2>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    to="/produtos"
                    search={{ productType: cat.productType }}
                    className="group"
                  >
                    <div className="bg-[#F7F5F2] hover:bg-[#0F3A45] p-6 text-center transition-all duration-300">
                      <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] group-hover:text-white transition-colors">
                        {cat.label}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Marcas */}
            <div>
              <div className="text-center mb-10">
                <span className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] font-bold">Navegue</span>
                <h2 className="font-serif font-light text-[#1A1A1A] text-2xl md:text-3xl mt-1">
                  Por Marca
                </h2>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {BRANDS_GRID.map((brand) => (
                  <Link
                    key={brand.name}
                    to="/produtos"
                    search={{ vendor: brand.name }}
                    className="group"
                  >
                    <div className="bg-[#F7F5F2] hover:bg-white p-4 flex items-center justify-center h-20 transition-all duration-300 border border-transparent hover:border-[#D4AF37]/30 hover:shadow-lg">
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="max-h-10 max-w-[80%] object-contain grayscale group-hover:grayscale-0 transition-all"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. SELOS DE CONFIANÇA */}
        <TrustBadges />

        {/* 8. QUIZ / DIAGNÓSTICO */}
        <section className="bg-white">
          <AIQuiz />
        </section>

        {/* 9. MONTE SEU RITUAL / KITS */}
        <RitualSection />

        {/* 10. MARCAS AUTORIZADAS (Editorial curto) */}
        <AuthorizedBrands />

        {/* 11. NEWSLETTER */}
        <ConsultancySection />
      </main>

      <Footer />
    </div>
  );
}

export default Index;
