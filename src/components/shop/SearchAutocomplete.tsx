import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Clock, TrendingUp, X } from "lucide-react";
import { PRODUCTS } from "@/data/products";
import { cn } from "@/lib/utils";
import { trackSearch } from "@/lib/analytics";

interface SearchResult {
  id: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  category?: string;
}

const POPULAR_SEARCHES = [
  "Kérastase",
  "Wella Color",
  "Shampoo L'Oréal",
  "Kit Tratamento",
  "Máscara Reconstrutora",
];

const SEARCH_HISTORY_KEY = "fragranciaria_search_history";
const MAX_HISTORY = 5;

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(term: string) {
  if (typeof window === "undefined" || !term.trim()) return;
  try {
    const history = getSearchHistory();
    const filtered = history.filter((h) => h.toLowerCase() !== term.toLowerCase());
    const newHistory = [term, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  } catch {
    // Ignore localStorage errors
  }
}

function clearSearchHistory() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Ignore
  }
}

export function SearchAutocomplete({
  onClose,
  className,
}: {
  onClose?: () => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load search history on mount
  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search products with debounce
  const searchProducts = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowSuggestions(true);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);

    // Simulate async search (in real app, this would be an API call)
    setTimeout(() => {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const filtered = PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(normalizedQuery) ||
          p.brand.toLowerCase().includes(normalizedQuery) ||
          p.category?.toLowerCase().includes(normalizedQuery) ||
          p.tags?.some((t) => t.toLowerCase().includes(normalizedQuery))
      )
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          image: p.images[0],
          category: p.category,
        }));

      setResults(filtered);
      setIsLoading(false);
      setSelectedIndex(-1);
    }, 150);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchProducts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveSearchHistory(query.trim());
      trackSearch(query.trim());
      navigate({ to: "/produtos", search: { q: query.trim() } });
      onClose?.();
    }
  };

  const handleSelectSuggestion = (term: string) => {
    setQuery(term);
    saveSearchHistory(term);
    trackSearch(term);
    navigate({ to: "/produtos", search: { q: term } });
    onClose?.();
  };

  const handleSelectProduct = (productId: string) => {
    if (query.trim()) {
      saveSearchHistory(query.trim());
      trackSearch(query.trim());
    }
    navigate({ to: "/produto/$id", params: { id: productId } });
    onClose?.();
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setHistory([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = showSuggestions
      ? history.length + POPULAR_SEARCHES.length
      : results.length;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      if (showSuggestions) {
        const allSuggestions = [...history, ...POPULAR_SEARCHES];
        if (allSuggestions[selectedIndex]) {
          handleSelectSuggestion(allSuggestions[selectedIndex]);
        }
      } else if (results[selectedIndex]) {
        handleSelectProduct(results[selectedIndex].id);
      }
    } else if (e.key === "Escape") {
      onClose?.();
    }
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="O que você procura?"
          className="w-full bg-transparent border-b-2 border-white/20 py-5 md:py-6 text-2xl md:text-3xl font-serif text-white placeholder:text-white/40 outline-none focus:border-[#E8C25A] transition-colors pr-12"
          autoComplete="off"
        />
        <button
          type="submit"
          className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#E8C25A] hover:text-white transition-colors"
          aria-label="Pesquisar"
        >
          <Search className="h-7 w-7 md:h-8 md:w-8" />
        </button>
      </form>

      {/* Results or Suggestions */}
      <div className="mt-8 max-h-[50vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#E8C25A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showSuggestions ? (
          <>
            {/* Recent Searches */}
            {history.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#E8C25A] flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Buscas recentes
                  </p>
                  <button
                    onClick={handleClearHistory}
                    className="text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white transition-colors"
                  >
                    Limpar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((term, i) => (
                    <button
                      key={`history-${i}`}
                      onClick={() => handleSelectSuggestion(term)}
                      className={cn(
                        "px-4 py-2 border border-white/20 text-white/80 text-sm hover:border-[#E8C25A] hover:text-[#E8C25A] transition-colors",
                        selectedIndex === i && "border-[#E8C25A] text-[#E8C25A]"
                      )}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#E8C25A] mb-4 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" />
                Pesquisas populares
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term, i) => (
                  <button
                    key={term}
                    onClick={() => handleSelectSuggestion(term)}
                    className={cn(
                      "px-4 py-2 border border-white/20 text-white/80 text-sm hover:border-[#E8C25A] hover:text-[#E8C25A] transition-colors",
                      selectedIndex === history.length + i &&
                        "border-[#E8C25A] text-[#E8C25A]"
                    )}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#E8C25A] mb-4">
              {results.length} resultado{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((product, i) => (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-3 transition-colors text-left",
                  selectedIndex === i
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                )}
              >
                <div className="w-14 h-14 bg-white/10 flex-shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#E8C25A]">
                    {product.brand}
                  </p>
                  <p className="text-white font-serif text-base truncate">
                    {product.name}
                  </p>
                  <p className="text-white/70 text-sm">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </button>
            ))}

            {/* Ver todos os resultados */}
            <button
              onClick={handleSubmit}
              className="w-full mt-4 py-3 border border-[#E8C25A] text-[#E8C25A] text-[12px] uppercase tracking-[0.14em] hover:bg-[#E8C25A] hover:text-[#0F3A3E] transition-colors"
            >
              Ver todos os resultados para "{query}"
            </button>
          </div>
        ) : query.trim() ? (
          <div className="text-center py-8">
            <p className="text-white/60 mb-4">
              Nenhum resultado para "{query}"
            </p>
            <p className="text-[12px] text-white/40">
              Tente buscar por marca, tipo de produto ou necessidade
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
