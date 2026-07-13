import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PriceRangeSlider } from "@/components/ui/PriceRangeSlider";
import { SortDropdown, sortProducts } from "@/components/ui/SortDropdown";
import { useProducts } from "@/hooks/useProducts";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, X, SlidersHorizontal, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Labels amigáveis para os chips de categoria (slug -> label).
// Mantem-se em sincronia com o `category` em data/products.ts.
const CATEGORY_CHIPS: Array<{ label: string; productType: string }> = [
  { label: "Shampoo", productType: "shampoos" },
  { label: "Condicionador", productType: "condicionadores" },
  { label: "Mascara", productType: "mascaras" },
  { label: "Coloracao", productType: "coloracao" },
  { label: "Finalizador", productType: "finalizadores" },
  { label: "Oleo", productType: "oleos" },
  { label: "Leave-in", productType: "leave-in" },
  { label: "Maquiagem", productType: "maquiagem" },
  { label: "Kits", productType: "kits" },
  { label: "Tratamentos", productType: "tratamentos" },
];

const PRODUCTS_PER_PAGE = 12;

type ProductsSearch = {
  vendor?: string;
  productType?: string;
  page?: number;
  q?: string;
  sort?: string;
  priceMin?: number;
  priceMax?: number;
  ofertas?: boolean;
};

export const Route = createFileRoute("/produtos")({
  validateSearch: (search: Record<string, unknown>): ProductsSearch => {
    return {
      vendor: search.vendor as string | undefined,
      productType: search.productType as string | undefined,
      page: Number(search.page) || 1,
      q: search.q as string | undefined,
      sort: (search.sort as string) || "relevance",
      priceMin: search.priceMin ? Number(search.priceMin) : undefined,
      priceMax: search.priceMax ? Number(search.priceMax) : undefined,
      ofertas: search.ofertas === true || search.ofertas === 'true',
    };
  },
  head: () => ({
    meta: [
      { title: "Produtos | Fragranciaria" },
      { name: "description", content: "Explore nossa coleção completa de cosméticos profissionais." },
    ],
  }),
  component: ProdutosPage,
});

// Checkbox item component
function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="flex items-center gap-3 w-full py-2 group"
    >
      <span
        className={`w-[18px] h-[18px] border flex items-center justify-center transition-all ${
          checked
            ? "bg-[#0F3A3E] border-[#0F3A3E]"
            : "border-[#C4BBA8] group-hover:border-[#0F3A3E]"
        }`}
      >
        {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
      </span>
      <span
        className={`text-[14px] transition-colors ${
          checked ? "text-[#0F3A3E] font-medium" : "text-[#51635F] group-hover:text-[#0F3A3E]"
        }`}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="text-[12px] text-[#9AA39F] ml-auto">
          ({count})
        </span>
      )}
    </button>
  );
}

// Pagination component
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
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mt-12 md:mt-16">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.14em] font-medium border border-[#E0D8C7] hover:border-[#0F3A3E] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        <span className="hidden sm:inline">Anterior</span>
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 sm:px-3 py-2 text-[#75827E] text-sm">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-[11px] sm:text-[12px] font-medium transition-all ${
                currentPage === page
                  ? "bg-[#0F3A3E] text-white"
                  : "border border-[#E0D8C7] text-[#0F3A3E] hover:border-[#0F3A3E]"
              }`}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.14em] font-medium border border-[#E0D8C7] hover:border-[#0F3A3E] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <span className="hidden sm:inline">Próximo</span>
        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}

function ProdutosPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/produtos" });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(search.productType || null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(search.vendor || null);
  const [sortBy, setSortBy] = useState<string>(search.sort || "relevance");
  const [showOnlyOfertas, setShowOnlyOfertas] = useState(search.ofertas || false);
  const { products } = useProducts();

  // Default price range from loaded products
  const priceMinDefault = products.length > 0
    ? Math.floor(Math.min(...products.map(p => p.price)))
    : 0;
  const priceMaxDefault = products.length > 0
    ? Math.ceil(Math.max(...products.map(p => p.price)))
    : 1000;

  const [priceRange, setPriceRange] = useState<[number, number]>([
    search.priceMin || priceMinDefault,
    search.priceMax || priceMaxDefault,
  ]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(search.page || 1);
  const [searchTerm, setSearchTerm] = useState(search.q || "");

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    brands: true,
    price: true,
  });

  useEffect(() => {
    if (search.vendor) setSelectedBrand(search.vendor);
    if (search.productType) setSelectedCategory(search.productType);
    if (search.page) setCurrentPage(search.page);
    if (search.q) setSearchTerm(search.q);
    setShowOnlyOfertas(search.ofertas || false);
    if (search.sort) setSortBy(search.sort);
    if (search.priceMin || search.priceMax) {
      setPriceRange([search.priceMin || priceMinDefault, search.priceMax || priceMaxDefault]);
    }
  }, [search.vendor, search.productType, search.page, search.q, search.sort, search.priceMin, search.priceMax, priceMinDefault, priceMaxDefault]);

  // Sync price range when products load
  useEffect(() => {
    if (products.length > 0) {
      const min = Math.floor(Math.min(...products.map(p => p.price)));
      const max = Math.ceil(Math.max(...products.map(p => p.price)));
      setPriceRange(prev => [prev[0] === 0 && prev[1] === 1000 ? min : prev[0], prev[1] === 1000 ? max : prev[1]]);
    }
  }, [products]);

  // Extract unique categories with counts
  const categoriesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [products]);

  // Extract unique brands with counts
  const brandsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.brand) {
        counts[p.brand] = (counts[p.brand] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter only products with discount if ofertas is enabled
    if (showOnlyOfertas) {
      filtered = filtered.filter(p => p.originalPrice && p.originalPrice > p.price);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.brand?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Filter by price range
    filtered = filtered.filter(p =>
      p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Use the sortProducts function
    return sortProducts(filtered, sortBy);
  }, [products, selectedCategory, selectedBrand, sortBy, searchTerm, priceRange, showOnlyOfertas]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateURL({ page });
  };

  const updateURL = (updates: Partial<ProductsSearch>) => {
    const newSearch: ProductsSearch = {
      ...(selectedCategory && { productType: selectedCategory }),
      ...(selectedBrand && { vendor: selectedBrand }),
      ...(searchTerm && { q: searchTerm }),
      ...(sortBy !== "relevance" && { sort: sortBy }),
      ...(priceRange[0] !== priceMinDefault && { priceMin: priceRange[0] }),
      ...(priceRange[1] !== priceMaxDefault && { priceMax: priceRange[1] }),
      ...(showOnlyOfertas && { ofertas: true }),
      page: currentPage,
      ...updates,
    };
    navigate({ to: '/produtos', search: newSearch });
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSearchTerm("");
    setPriceRange([priceMinDefault, priceMaxDefault]);
    setSortBy("relevance");
    setCurrentPage(1);
    setShowOnlyOfertas(false);
    navigate({ to: '/produtos', search: {} });
  };

  const handleCategoryChange = (cat: string | null) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
    updateURL({ productType: cat || undefined, page: 1 });
  };

  const handleBrandChange = (brand: string | null) => {
    setSelectedBrand(brand);
    setCurrentPage(1);
    updateURL({ vendor: brand || undefined, page: 1 });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
    updateURL({ sort: sort !== "relevance" ? sort : undefined, page: 1 });
  };

  const handlePriceChange = (range: [number, number]) => {
    setPriceRange(range);
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedCategory || selectedBrand || searchTerm ||
    priceRange[0] !== priceMinDefault || priceRange[1] !== priceMaxDefault || showOnlyOfertas;

  // Count ofertas
  const ofertasCount = useMemo(() => {
    return products.filter(p => p.originalPrice && p.originalPrice > p.price).length;
  }, [products]);

  // Sidebar Filter Component
  const FilterSidebar = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={isMobile ? "p-6" : ""}>
      {isMobile && (
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E0D8C7]">
          <h2 className="font-serif text-xl text-[#0F3A3E]">Filtros</h2>
          <button onClick={() => setShowMobileFilters(false)}>
            <X className="h-6 w-6 text-[#0F3A3E]" />
          </button>
        </div>
      )}

      {/* Ofertas Toggle */}
      <div className="mb-8">
        <FilterCheckbox
          label="Apenas Ofertas"
          count={ofertasCount}
          checked={showOnlyOfertas}
          onChange={() => {
            const newValue = !showOnlyOfertas;
            setShowOnlyOfertas(newValue);
            setCurrentPage(1);
            updateURL({ ofertas: newValue || undefined, page: 1 });
          }}
        />
      </div>

      {/* Categories */}
      <div className="mb-8">
        <button
          onClick={() => setExpandedSections(s => ({ ...s, categories: !s.categories }))}
          className="flex items-center justify-between w-full mb-4"
        >
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#0F3A3E] font-semibold">
            Categoria
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-[#75827E] transition-transform ${
              expandedSections.categories ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.categories && (
          <div className="space-y-0">
            {categoriesWithCounts.map(({ name, count }) => (
              <FilterCheckbox
                key={name}
                label={name}
                count={count}
                checked={selectedCategory === name}
                onChange={() => handleCategoryChange(selectedCategory === name ? null : name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Brands */}
      <div className="mb-8">
        <button
          onClick={() => setExpandedSections(s => ({ ...s, brands: !s.brands }))}
          className="flex items-center justify-between w-full mb-4"
        >
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#0F3A3E] font-semibold">
            Marca
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-[#75827E] transition-transform ${
              expandedSections.brands ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.brands && (
          <div className="space-y-0 max-h-[280px] overflow-y-auto pr-2">
            {brandsWithCounts.map(({ name, count }) => (
              <FilterCheckbox
                key={name}
                label={name}
                count={count}
                checked={selectedBrand === name}
                onChange={() => handleBrandChange(selectedBrand === name ? null : name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-8">
        <button
          onClick={() => setExpandedSections(s => ({ ...s, price: !s.price }))}
          className="flex items-center justify-between w-full mb-4"
        >
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-[#0F3A3E] font-semibold">
            Preço
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-[#75827E] transition-transform ${
              expandedSections.price ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedSections.price && (
          <PriceRangeSlider
            min={priceMinDefault}
            max={priceMaxDefault}
            value={priceRange}
            onChange={handlePriceChange}
            step={10}
          />
        )}
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-3 border border-[#0F3A3E] text-[#0F3A3E] text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-[#0F3A3E] hover:text-white transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3EEE3] font-sans">
      <NavbarEditorial />

      {/* Header with Breadcrumb */}
      <div className="bg-[#F3EEE3] border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-10">
          {/* Breadcrumb */}
          <Breadcrumbs
            items={[
              { label: "Produtos", href: "/produtos" },
              ...(showOnlyOfertas ? [{ label: "Ofertas" }] : []),
              ...(selectedCategory ? [{ label: selectedCategory }] : []),
              ...(selectedBrand ? [{ label: selectedBrand }] : []),
            ]}
            className="mb-4"
          />

          <h1 className="font-serif text-[36px] md:text-[48px] text-[#0F3A3E]">
            {showOnlyOfertas ? "Ofertas" : selectedBrand || selectedCategory || "Todos os Produtos"}
          </h1>
          <p className="text-[#75827E] text-[15px] mt-2">
            {filteredProducts.length} {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>

          {/* Quick category chips — atalho de Categorias */}
          <div className="mt-6 -mx-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Link
              to="/produtos"
              className={cn(
                "px-4 py-2 text-[12px] uppercase tracking-[0.14em] font-medium whitespace-nowrap rounded-full border transition-colors",
                !selectedCategory && !selectedBrand && !showOnlyOfertas
                  ? "bg-[#0F3A3E] text-white border-[#0F3A3E]"
                  : "bg-white text-[#2B413F] border-[#E0D8C7] hover:border-[#0F3A3E] hover:text-[#0F3A3E]"
              )}
            >
              Todos
            </Link>
            {CATEGORY_CHIPS.map((cat) => {
              const isActive = selectedCategory === cat.productType;
              return (
                <Link
                  key={cat.productType}
                  to="/produtos"
                  search={{ productType: cat.productType }}
                  className={cn(
                    "px-4 py-2 text-[12px] uppercase tracking-[0.14em] font-medium whitespace-nowrap rounded-full border transition-colors",
                    isActive
                      ? "bg-[#0F3A3E] text-white border-[#0F3A3E]"
                      : "bg-white text-[#2B413F] border-[#E0D8C7] hover:border-[#0F3A3E] hover:text-[#0F3A3E]"
                  )}
                >
                  {cat.label}
                </Link>
              );
            })}
            <Link
              to="/produtos"
              search={{ ofertas: true }}
              className={cn(
                "px-4 py-2 text-[12px] uppercase tracking-[0.14em] font-medium whitespace-nowrap rounded-full border transition-colors",
                showOnlyOfertas
                  ? "bg-[#B07B1E] text-white border-[#B07B1E]"
                  : "bg-white text-[#B07B1E] border-[#B07B1E] hover:bg-[#B07B1E] hover:text-white"
              )}
            >
              Ofertas
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-12">
        <div className="flex gap-14">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-[240px] flex-shrink-0">
            <FilterSidebar />
          </aside>

          {/* Products Area */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E0D8C7]">
              {/* Mobile Filter Toggle */}
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-[#E0D8C7] text-[#0F3A3E] text-[11px] uppercase tracking-[0.14em] font-medium"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-[#B07B1E]" />
                )}
              </button>

              {/* Active Filters Tags */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0F3A3E] text-white text-[11px]">
                      {selectedCategory}
                      <button onClick={() => handleCategoryChange(null)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedBrand && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0F3A3E] text-white text-[11px]">
                      {selectedBrand}
                      <button onClick={() => handleBrandChange(null)}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {(priceRange[0] !== priceMinDefault || priceRange[1] !== priceMaxDefault) && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0F3A3E] text-white text-[11px]">
                      R${priceRange[0]} - R${priceRange[1]}
                      <button onClick={() => setPriceRange([priceMinDefault, priceMaxDefault])}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {showOnlyOfertas && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#B07B1E] text-white text-[11px]">
                      Ofertas
                      <button onClick={() => { setShowOnlyOfertas(false); updateURL({ ofertas: undefined, page: 1 }); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {searchTerm && (
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0F3A3E] text-white text-[11px]">
                      "{searchTerm}"
                      <button onClick={() => { setSearchTerm(""); navigate({ to: '/produtos', search: {} }); }}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Sort Dropdown */}
              <SortDropdown
                value={sortBy}
                onChange={handleSortChange}
                className="ml-auto"
              />
            </div>

            {/* Products Grid */}
            {paginatedProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCardEditorial
                    key={product.id}
                    id={product.id}
                    title={product.name}
                    vendor={product.brand || ""}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={product.images[0]}
                    badge={product.isNew ? "Novo" : undefined}
                    rating={4.5}
                    reviewCount={Math.floor(Math.random() * 100) + 10}
                    variations={product.variations}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-[#75827E] text-lg mb-4">Nenhum produto encontrado</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-[#0F3A3E] text-white text-[12px] uppercase tracking-[0.14em] font-medium hover:bg-[#16504F] transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileFilters(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[320px] bg-[#F3EEE3] overflow-y-auto">
            <FilterSidebar isMobile />
          </div>
        </div>
      )}

      <FooterEditorial />
    </div>
  );
}

export default ProdutosPage;
