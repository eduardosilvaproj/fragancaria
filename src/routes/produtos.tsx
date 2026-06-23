import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PRODUCTS, Product } from "@/data/products";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

const PRODUCTS_PER_PAGE = 24;

// Search params type
type ProductsSearch = {
  vendor?: string;
  productType?: string;
  page?: number;
};

export const Route = createFileRoute("/produtos")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => {
    return {
      vendor: search.vendor as string | undefined,
      productType: search.productType as string | undefined,
      page: Number(search.page) || 1,
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
      to="/produto/$id"
      params={{ id: product.id }}
      className="group block bg-white border border-[#0F3A3E]/5 hover:border-[#B07B1E]/30 transition-all duration-500 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-[#F3EEE3]">
        {product.images[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700"
          />
        )}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-[#B07B1E] text-[#0F3A3E] text-[9px] uppercase tracking-wider font-bold px-2 py-1">
            -{discountPercent}%
          </span>
        )}
        {product.isNew && (
          <span className="absolute top-3 right-3 bg-[#0F3A3E] text-white text-[9px] uppercase tracking-wider font-bold px-2 py-1">
            Novo
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.brand && (
          <span className="text-[9px] uppercase tracking-[0.3em] text-[#B07B1E] font-bold">
            {product.brand}
          </span>
        )}
        <h3 className="font-serif text-sm text-[#0F3A3E] mt-1 mb-3 line-clamp-2 group-hover:text-[#B07B1E] transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#0F3A3E]">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[#0F3A3E]/40 line-through">
              R$ {product.originalPrice!.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Componente de Paginação
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Mostra todas as páginas se tiver 7 ou menos
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Sempre mostra a primeira página
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Páginas ao redor da atual
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Sempre mostra a última página
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {/* Botão Anterior */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border border-[#0F3A3E]/20 hover:border-[#B07B1E] hover:text-[#B07B1E] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#0F3A3E]/20 disabled:hover:text-inherit"
      >
        <ChevronLeft className="h-4 w-4" />
        Anterior
      </button>

      {/* Números das Páginas */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-3 py-2 text-[#0F3A3E]/40">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`w-10 h-10 flex items-center justify-center text-[11px] font-bold transition-all ${
                currentPage === page
                  ? "bg-[#B07B1E] text-[#0F3A3E]"
                  : "border border-[#0F3A3E]/20 hover:border-[#B07B1E] hover:text-[#B07B1E]"
              }`}
            >
              {page}
            </button>
          )
        ))}
      </div>

      {/* Botão Próximo */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold border border-[#0F3A3E]/20 hover:border-[#B07B1E] hover:text-[#B07B1E] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[#0F3A3E]/20 disabled:hover:text-inherit"
      >
        Próximo
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ProdutosPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/produtos" });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(search.productType || null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(search.vendor || null);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(search.page || 1);

  // Sync state with URL params on mount
  useEffect(() => {
    if (search.vendor) setSelectedBrand(search.vendor);
    if (search.productType) setSelectedCategory(search.productType);
    if (search.page) setCurrentPage(search.page);
    if (search.vendor || search.productType) setShowFilters(true);
  }, [search.vendor, search.productType, search.page]);

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

  // Produtos filtrados
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
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return filtered;
  }, [selectedCategory, selectedBrand, sortBy]);

  // Calcular paginação
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  // Ajustar página se necessário após filtrar
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Produtos da página atual
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  // Handler para mudar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll para o topo da lista
    window.scrollTo({ top: 400, behavior: 'smooth' });

    // Atualizar URL com a página
    navigate({
      to: '/produtos',
      search: {
        ...(selectedCategory && { productType: selectedCategory }),
        ...(selectedBrand && { vendor: selectedBrand }),
        page,
      },
    });
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setCurrentPage(1);
    navigate({ to: '/produtos', search: {} });
  };

  const handleCategoryChange = (cat: string | null) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleBrandChange = (brand: string | null) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCategory || selectedBrand;

  return (
    <div className="min-h-screen bg-[#F3EEE3] text-[#1C302E]">
      <Navbar />

      {/* Hero Banner */}
      <section className="bg-[#0F3A3E] pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-12">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-[1px] bg-[#B07B1E]" />
              <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#B07B1E]">
                Coleção Completa
              </span>
              <div className="w-12 h-[1px] bg-[#B07B1E]" />
            </div>
            <h1 className="font-serif font-light text-white text-4xl md:text-5xl lg:text-6xl mb-4">
              Nossos <span className="italic text-[#B07B1E]">Produtos</span>
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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-8 border-b border-[#0F3A3E]/10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-6 py-3 bg-[#0F3A3E] text-white text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-[#B07B1E] hover:text-[#0F3A3E] transition-all"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#0F3A3E]/60 hover:text-[#B07B1E] transition-colors"
                >
                  <X className="h-4 w-4" />
                  Limpar filtros
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F3A3E]/40 font-bold">
                Ordenar por:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border border-[#0F3A3E]/20 px-4 py-2 text-[11px] uppercase tracking-[0.2em] font-bold focus:outline-none focus:border-[#B07B1E]"
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
              className="mb-8 pb-8 border-b border-[#0F3A3E]/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Categorias */}
                {categories.length > 0 && (
                  <div>
                    <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B07B1E] mb-4">
                      Categorias
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleCategoryChange(selectedCategory === cat ? null : cat)}
                          className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                            selectedCategory === cat
                              ? "bg-[#B07B1E] text-[#0F3A3E]"
                              : "bg-white border border-[#0F3A3E]/10 text-[#0F3A3E]/60 hover:border-[#B07B1E] hover:text-[#B07B1E]"
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
                    <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B07B1E] mb-4">
                      Marcas
                    </h3>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                      {brands.map((brand) => (
                        <button
                          key={brand}
                          onClick={() => handleBrandChange(selectedBrand === brand ? null : brand)}
                          className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                            selectedBrand === brand
                              ? "bg-[#B07B1E] text-[#0F3A3E]"
                              : "bg-white border border-[#0F3A3E]/10 text-[#0F3A3E]/60 hover:border-[#B07B1E] hover:text-[#B07B1E]"
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
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#0F3A3E]/40 font-bold">
                Filtros ativos:
              </span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#0F3A3E] text-white text-[9px] uppercase tracking-[0.2em] font-bold">
                  {selectedCategory}
                  <button onClick={() => handleCategoryChange(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#0F3A3E] text-white text-[9px] uppercase tracking-[0.2em] font-bold">
                  {selectedBrand}
                  <button onClick={() => handleBrandChange(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Results Count & Page Info */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#0F3A3E]/40 font-bold">
              {filteredProducts.length} {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
            {totalPages > 1 && (
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#0F3A3E]/40 font-bold">
                Página {currentPage} de {totalPages}
              </p>
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {paginatedProducts.map((product, i) => (
              <MotionDiv
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.4 }}
              >
                <LocalProductCard product={product} />
              </MotionDiv>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-[#0F3A3E]/40 text-lg mb-4">Nenhum produto encontrado</p>
              <Button
                onClick={clearFilters}
                className="bg-[#B07B1E] text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white"
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
