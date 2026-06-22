import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LocalProductCard } from "@/components/shop/LocalProductCard";
import { PRODUCTS, CATEGORIES, BRANDS } from "@/data/products";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos | Fragranciaria - Cosméticos Profissionais" },
      { name: "description", content: "Explore nossa coleção completa de cosméticos profissionais das melhores marcas." },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let products = [...PRODUCTS];

    if (selectedCategory) {
      products = products.filter(p => p.category === selectedCategory);
    }

    if (selectedBrand) {
      products = products.filter(p => p.brand === selectedBrand);
    }

    // Ordenação
    switch (sortBy) {
      case "price-asc":
        products.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        products.sort((a, b) => b.price - a.price);
        break;
      case "name":
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "featured":
      default:
        products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }

    return products;
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
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4">
                    Categorias
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
                        className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                          selectedCategory === cat.slug
                            ? "bg-[#D4AF37] text-[#0F3A45]"
                            : "bg-white border border-[#0F3A45]/10 text-[#0F3A45]/60 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marcas */}
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-4">
                    Marcas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {BRANDS.map((brand) => (
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
                  {CATEGORIES.find(c => c.slug === selectedCategory)?.name}
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
                transition={{ delay: i * 0.05, duration: 0.5 }}
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
