import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PRODUCTS, BRANDS, Product } from "@/data/products";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

// Search params type
type ProductsSearch = {
  vendor?: string;
  productType?: string;
};

export const Route = createFileRoute("/produtos")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => {
    return {
      vendor: search.vendor as string | undefined,
      productType: search.productType as string | undefined,
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

// Componente de card de produto local
function LocalProductCard({ product }: { product: Product }) {
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - product.price / product.originalPrice!) * 100)
    : 0;

  return (
    <Link
      to="/produto/$handle"
      params={{ handle: product.id }}
      className="group block bg-white border border-[#0F3A45]/5 hover:border-[#D4AF37]/30 transition-all duration-500 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#F7F5F2]">
        {product.images[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700"
          />
        )}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-[#D4AF37] text-[#0F3A45] text-[9px] uppercase tracking-wider font-bold px-2 py-1">
            -{discountPercent}%
          </span>
        )}
        {product.isNew && (
          <span className="absolute top-3 right-3 bg-[#0F3A45] text-white text-[9px] uppercase tracking-wider font-bold px-2 py-1">
            Novo
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.brand && (
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold">
            {product.brand}
          </span>
        )}
        <h3 className="font-serif text-sm text-[#0F3A45] mt-1 mb-3 line-clamp-2 group-hover:text-[#D4AF37] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0F3A45]">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[#0F3A45]/40 line-through">
              R$ {product.originalPrice!.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProdutosPage() {
  // Get search params from URL
  const search = useSearch({ from: "/produtos" });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(search.productType || null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(search.vendor || null);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [showFilters, setShowFilters] = useState(false);

  // Sync state with URL params on mount
  useEffect(() => {
    if (search.vendor) setSelectedBrand(search.vendor);
    if (search.productType) setSelectedCategory(search.productType);
    if (search.vendor || search.productType) setShowFilters(true);
  }, [search.vendor, search.productType]);

  // Extrair categorias únicas dos produtos
  const categories = useMemo(() => {
    const cats = new Set<string>();
    PRODUCTS.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, []);

  // Extrair marcas únicas dos produtos
  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    PRODUCTS.forEach(p => {
      if (p.brand) brandSet.add(p.brand);
    });
    return Array.from(brandSet).sort();
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...PRODUCTS];

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Ordenação
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "featured":
      default:
        // Featured primeiro
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return filtered;
  }, [selectedCategory, selectedBrand, sortBy]);

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
  };

  const hasActiveFilters = selectedCategory || selectedBrand;

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
              {PRODUCTS.length} produtos profissionais selecionados para você
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
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
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
            </div>
          )}

          {/* Results Count */}
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#0F3A45]/40 font-bold mb-8">
            {filteredProducts.length} {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, i) => (
              <MotionDiv
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.5 }}
              >
                <LocalProductCard product={product} />
              </MotionDiv>
            ))}
          </div>

          {/* Empty State */}
          {filteredProducts.length === 0 && (
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
