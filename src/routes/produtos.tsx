import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/shop/ProductCard";
import { storefrontApiRequest, ShopifyProduct } from "@/lib/shopify/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

const GET_ALL_PRODUCTS = `
  query GetAllProducts($first: Int!) {
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

// Search params type
type ProductsSearch = {
  vendor?: string;
  productType?: string;
  tag?: string;
  q?: string;
  sale?: string;
};

export const Route = createFileRoute("/produtos")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => {
    return {
      vendor: search.vendor as string | undefined,
      productType: search.productType as string | undefined,
      tag: search.tag as string | undefined,
      q: search.q as string | undefined,
      sale: search.sale as string | undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Produtos | Fragranciaria - Cosméticos Profissionais" },
      { name: "description", content: "Explore nossa coleção completa de cosméticos profissionais das melhores marcas." },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  // Get search params from URL
  const search = useSearch({ from: "/produtos" });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(search.productType || null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(search.vendor || null);
  const [selectedTag, setSelectedTag] = useState<string | null>(search.tag || null);
  const [searchQuery, setSearchQuery] = useState<string>(search.q || "");
  const [showOnlySale, setShowOnlySale] = useState<boolean>(search.sale === "true");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [showFilters, setShowFilters] = useState(false);

  // Sync state with URL params on mount and when URL changes
  useEffect(() => {
    if (search.vendor) setSelectedBrand(search.vendor);
    if (search.productType) setSelectedCategory(search.productType);
    if (search.tag) setSelectedTag(search.tag);
    if (search.q) setSearchQuery(search.q);
    if (search.sale === "true") setShowOnlySale(true);
    if (search.vendor || search.productType || search.tag || search.q || search.sale) setShowFilters(true);
  }, [search.vendor, search.productType, search.tag, search.q, search.sale]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => storefrontApiRequest(GET_ALL_PRODUCTS, { first: 500 }),
  });

  const products: ShopifyProduct[] = data?.data?.products?.edges || [];

  // Extrair categorias, marcas e tags únicas dos produtos
  const categories = useMemo(() => {
    const types = new Set<string>();
    products.forEach(p => {
      if (p.node.productType) types.add(p.node.productType);
    });
    return Array.from(types).sort();
  }, [products]);

  const brands = useMemo(() => {
    const vendors = new Set<string>();
    products.forEach(p => {
      if (p.node.vendor) vendors.add(p.node.vendor);
    });
    return Array.from(vendors).sort();
  }, [products]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => {
      if (p.node.tags) {
        p.node.tags.forEach((tag: string) => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filtro por categoria (productType)
    if (selectedCategory) {
      filtered = filtered.filter(p => p.node.productType === selectedCategory);
    }

    // Filtro por marca (vendor)
    if (selectedBrand) {
      filtered = filtered.filter(p => p.node.vendor === selectedBrand);
    }

    // Filtro por tag
    if (selectedTag) {
      filtered = filtered.filter(p =>
        p.node.tags?.some((tag: string) =>
          tag.toLowerCase().includes(selectedTag.toLowerCase())
        )
      );
    }

    // Filtro por busca de texto (q)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.node.title.toLowerCase().includes(query) ||
        p.node.description?.toLowerCase().includes(query) ||
        p.node.vendor.toLowerCase().includes(query) ||
        p.node.productType?.toLowerCase().includes(query) ||
        p.node.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Filtro por ofertas (produtos com desconto)
    if (showOnlySale) {
      filtered = filtered.filter(p => {
        const variant = p.node.variants?.edges?.[0]?.node;
        if (!variant?.compareAtPrice?.amount) return false;
        const price = parseFloat(variant.price?.amount || "0");
        const compareAt = parseFloat(variant.compareAtPrice.amount);
        return compareAt > price;
      });
    }

    // Ordenação
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) =>
          parseFloat(a.node.priceRange.minVariantPrice.amount) -
          parseFloat(b.node.priceRange.minVariantPrice.amount)
        );
        break;
      case "price-desc":
        filtered.sort((a, b) =>
          parseFloat(b.node.priceRange.minVariantPrice.amount) -
          parseFloat(a.node.priceRange.minVariantPrice.amount)
        );
        break;
      case "name":
        filtered.sort((a, b) => a.node.title.localeCompare(b.node.title));
        break;
      case "featured":
      default:
        // Mantém a ordem original (featured first no Shopify)
        break;
    }

    return filtered;
  }, [products, selectedCategory, selectedBrand, selectedTag, searchQuery, showOnlySale, sortBy]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedTag(null);
    setSearchQuery("");
    setShowOnlySale(false);
  };

  const hasActiveFilters = selectedCategory || selectedBrand || selectedTag || searchQuery || showOnlySale;

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F5F2]">
        <Navbar />
        <div className="container mx-auto px-4 py-40 text-center">
          <h1 className="font-serif text-4xl mb-4">Erro ao carregar produtos</h1>
          <p className="text-[#1A1A1A]/60">Tente novamente mais tarde.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#1A1A1A]">
      <Navbar />

      {/* Hero Banner */}
      <section className="bg-[#0F3A45] pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-12">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-[1px] bg-[#D4AF37]" />
              <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#D4AF37]">
                Coleção Completa
              </span>
              <div className="w-12 h-[1px] bg-[#D4AF37]" />
            </div>
            <h1 className="font-serif font-light text-white text-4xl md:text-5xl lg:text-6xl mb-4">
              Nossos <span className="italic text-[#D4AF37]">Produtos</span>
            </h1>
            <p className="text-white/50 text-sm max-w-xl mx-auto">
              {isLoading ? "Carregando..." : `${products.length} produtos profissionais selecionados para você`}
            </p>
          </MotionDiv>
        </div>
      </section>

      {/* Filters & Products */}
      <section className="py-12">
        <div className="container mx-auto px-4 md:px-12">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-8 border-b border-[#0F3A45]/10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-6 py-3 bg-[#0F3A45] text-white text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-[#D4AF37] hover:text-[#0F3A45] transition-all"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#0F3A45]/60 hover:text-[#D4AF37] transition-colors"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F3A45]/40 font-bold">
                Ordenar por:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border border-[#0F3A45]/20 px-4 py-2 text-[11px] uppercase tracking-[0.2em] font-bold focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="featured">Destaques</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="name">Nome A-Z</option>
              </select>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 pb-8 border-b border-[#0F3A45]/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Categorias */}
                {categories.length > 0 && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4">
                      Categorias
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                          className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                            selectedCategory === cat
                              ? "bg-[#D4AF37] text-[#0F3A45]"
                              : "bg-white border border-[#0F3A45]/10 text-[#0F3A45]/60 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marcas */}
                {brands.length > 0 && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4">
                      Marcas
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {brands.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => setSelectedBrand(selectedBrand === brand ? null : brand)}
                          className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                            selectedBrand === brand
                              ? "bg-[#D4AF37] text-[#0F3A45]"
                              : "bg-white border border-[#0F3A45]/10 text-[#0F3A45]/60 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </MotionDiv>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F3A45]/40 font-bold">
                Filtros ativos:
              </span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#0F3A45] text-white text-[9px] uppercase tracking-[0.2em] font-bold">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#0F3A45] text-white text-[9px] uppercase tracking-[0.2em] font-bold">
                  {selectedBrand}
                  <button onClick={() => setSelectedBrand(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedTag && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37] text-[#0F3A45] text-[9px] uppercase tracking-[0.2em] font-bold">
                  #{selectedTag}
                  <button onClick={() => setSelectedTag(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#143E4A] text-white text-[9px] uppercase tracking-[0.2em] font-bold">
                  Busca: "{searchQuery}"
                  <button onClick={() => setSearchQuery("")}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {showOnlySale && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-500 text-white text-[9px] uppercase tracking-[0.2em] font-bold">
                  Em Oferta
                  <button onClick={() => setShowOnlySale(false)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
            </div>
          )}

          {/* Results Count */}
          {!isLoading && (
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#0F3A45]/40 font-bold mb-8">
              {filteredProducts.length} {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
          )}

          {/* Products Grid */}
          {!isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, i) => (
                <MotionDiv
                  key={product.node.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.5 }}
                >
                  <ProductCard product={product} />
                </MotionDiv>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[#0F3A45]/40 text-lg mb-4">Nenhum produto encontrado</p>
              <Button
                onClick={clearFilters}
                className="bg-[#D4AF37] text-[#0F3A45] hover:bg-[#0F3A45] hover:text-white"
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default ProdutosPage;
