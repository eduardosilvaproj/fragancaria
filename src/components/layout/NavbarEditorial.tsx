import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Heart, Menu, X, ShoppingBag, ChevronDown, ChevronRight, User } from "lucide-react";
import { CartDrawerEditorial } from "../shop/CartDrawerEditorial";
import { SearchAutocomplete } from "../shop/SearchAutocomplete";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnnouncementMarquee } from "./AnnouncementMarquee";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";
import { PRODUCTS } from "@/data/products";

// IMPORTANTE: productType deve bater com `category` em data/products.ts (slug em lowercase)
// para que o filtro em /produtos (p.category === selectedCategory) funcione.
// O `count` é calculado em runtime a partir de PRODUCTS, então nunca fica desatualizado
// quando o catálogo muda (alinhado com o categoriesWithCounts da página /produtos).
function countByCategory(slug: string): number {
  return PRODUCTS.filter((p) => p.category === slug).length;
}

const CATEGORIES: Array<{ label: string; productType: string }> = [
  { label: "Shampoo", productType: "shampoos" },
  { label: "Condicionador", productType: "condicionadores" },
  { label: "Máscara", productType: "mascaras" },
  { label: "Coloração", productType: "coloracao" },
  { label: "Finalizador", productType: "finalizadores" },
  { label: "Óleo", productType: "oleos" },
  { label: "Leave-in", productType: "leave-in" },
  { label: "Maquiagem", productType: "maquiagem" },
  { label: "Kits", productType: "kits" },
  { label: "Tratamentos", productType: "tratamentos" },
];

const BRANDS = [
  { label: "Wella", vendor: "Wella", count: 122 },
  { label: "L'Oréal", vendor: "L'Oréal", count: 87 },
  { label: "Keune", vendor: "Keune", count: 49 },
  { label: "Itallian", vendor: "Itallian", count: 30 },
  { label: "Truss", vendor: "Truss", count: 22 },
  { label: "Lowell", vendor: "Lowell", count: 19 },
  { label: "Alfaparf", vendor: "Alfaparf", count: 18 },
  { label: "Schwarzkopf", vendor: "Schwarzkopf", count: 18 },
];

const MotionDiv = motion.div as any;

export const NavbarEditorial = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<null | "produtos" | "marcas">(null);
  const navigate = useNavigate();
  const { items, setIsOpen } = useCartStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlistItems.length;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Announcement Marquee */}
      <AnnouncementMarquee />

      {/* Main Header */}
      <header
        className={cn(
          "flex items-center justify-between px-6 md:px-14 py-5 border-b border-[#E0D8C7] bg-[#F3EEE3] sticky top-0 z-30 transition-shadow duration-300",
          isScrolled && "shadow-sm"
        )}
      >
        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-[#0F3A3E] hover:text-[#B07B1E] transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/images/logo-icon.png"
            alt=""
            className="h-[42px] w-auto object-contain"
          />
          <span className="font-serif text-[22px] md:text-[26px] font-medium tracking-[0.08em] text-[#0F3A3E]">
            FRAGRANCIARIA
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8 xl:gap-9">
          {/* Produtos - Mega Menu */}
          <div className="group relative">
            <Link
              to="/produtos"
              className="flex items-center gap-1 text-[13px] tracking-[0.18em] uppercase font-medium text-[#2B413F] hover:text-[#0F3A3E] transition-colors py-4"
            >
              Produtos
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-0 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white border border-[#E0D8C7] shadow-xl min-w-[620px] p-6 grid grid-cols-3 gap-6">
                {/* Categorias */}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
                    Categorias
                  </p>
                  <ul className="space-y-2.5">
                    {CATEGORIES.map((cat) => (
                      <li key={cat.label}>
                        <Link
                          to="/produtos"
                          search={{ productType: cat.productType }}
                          className="flex justify-between items-baseline text-[14px] text-[#51635F] hover:text-[#0F3A3E] transition-colors"
                        >
                          <span>{cat.label}</span>
                          <span className="text-[12px] text-[#9AA39F]">({countByCategory(cat.productType)})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/produtos"
                    className="inline-block mt-4 text-[12px] text-[#0F3A3E] hover:text-[#B07B1E] border-b border-[#B07B1E] pb-[2px]"
                  >
                    Ver todas categorias →
                  </Link>
                </div>

                {/* Marcas */}
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
                    Marcas
                  </p>
                  <ul className="space-y-2.5">
                    {BRANDS.map((brand) => (
                      <li key={brand.label}>
                        <Link
                          to="/produtos"
                          search={{ vendor: brand.vendor }}
                          className="flex justify-between items-baseline text-[14px] text-[#51635F] hover:text-[#0F3A3E] transition-colors"
                        >
                          <span>{brand.label}</span>
                          <span className="text-[12px] text-[#9AA39F]">({brand.count})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Destaques */}
                <div className="bg-[#F8F4EA] p-5 -m-1 flex flex-col">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
                    Destaques
                  </p>
                  <ul className="space-y-3 flex-1">
                    <li>
                      <Link to="/produtos" search={{ ofertas: true }} className="text-[14px] text-[#0F3A3E] hover:text-[#B07B1E]">
                        Ofertas do Dia
                      </Link>
                    </li>
                    <li>
                      <Link to="/produtos" search={{ productType: "coloracao" }} className="text-[14px] text-[#0F3A3E] hover:text-[#B07B1E]">
                        Coloração Profissional
                      </Link>
                    </li>
                    <li>
                      <Link to="/produtos" search={{ productType: "kits" }} className="text-[14px] text-[#0F3A3E] hover:text-[#B07B1E]">
                        Kits Promocionais
                      </Link>
                    </li>
                  </ul>
                  <Link
                    to="/produtos"
                    className="mt-5 block text-center bg-[#0F3A3E] text-white text-[11px] uppercase tracking-[0.18em] py-3 hover:bg-[#16504F] transition-colors"
                  >
                    Ver todos os produtos
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Marcas - Dropdown simples */}
          <div className="group relative">
            <Link
              to="/produtos"
              className="flex items-center gap-1 text-[13px] tracking-[0.18em] uppercase font-medium text-[#2B413F] hover:text-[#0F3A3E] transition-colors py-4"
            >
              Marcas
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </Link>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-0 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white border border-[#E0D8C7] shadow-xl min-w-[240px] p-5">
                <ul className="space-y-2.5">
                  {BRANDS.map((brand) => (
                    <li key={brand.label}>
                      <Link
                        to="/produtos"
                        search={{ vendor: brand.vendor }}
                        className="flex justify-between items-baseline text-[14px] text-[#51635F] hover:text-[#0F3A3E] transition-colors"
                      >
                        <span>{brand.label}</span>
                        <span className="text-[12px] text-[#9AA39F]">({brand.count})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/produtos"
                  className="inline-block mt-4 text-[12px] text-[#0F3A3E] hover:text-[#B07B1E] border-b border-[#B07B1E] pb-[2px]"
                >
                  Ver todas as marcas →
                </Link>
              </div>
            </div>
          </div>

          <Link
            to="/produtos"
            search={{ productType: "maquiagem" }}
            className="text-[13px] tracking-[0.18em] uppercase font-medium text-[#2B413F] hover:text-[#0F3A3E] transition-colors"
          >
            Maquiagem
          </Link>

          <Link
            to="/produtos"
            search={{ ofertas: true }}
            className="text-[13px] tracking-[0.18em] uppercase font-medium text-[#B07B1E] hover:text-[#C68C28] transition-colors"
          >
            Ofertas
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-5 text-[#0F3A3E]">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="cursor-pointer hover:text-[#B07B1E] transition-colors"
            aria-label="Pesquisar"
          >
            <Search className="h-[15px] w-[15px]" />
          </button>

          <Link
            to="/login"
            className="relative cursor-pointer hover:text-[#B07B1E] transition-colors hidden sm:block"
            aria-label="Minha conta"
          >
            <User className="h-[15px] w-[15px]" />
          </Link>

          <Link
            to="/favoritos"
            className="relative cursor-pointer hover:text-[#B07B1E] transition-colors hidden sm:block"
            aria-label="Favoritos"
          >
            <Heart className="h-[15px] w-[15px]" />
            {wishlistCount > 0 && (
              <span className="absolute -top-2 -right-2.5 bg-[#B07B1E] text-white text-[10px] font-bold min-w-[17px] h-[17px] rounded-full flex items-center justify-center px-1">
                {wishlistCount}
              </span>
            )}
          </Link>

          <button
            onClick={() => setIsOpen(true)}
            className="relative cursor-pointer hover:text-[#B07B1E] transition-colors"
            aria-label="Carrinho"
          >
            <ShoppingBag className="h-[15px] w-[15px]" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2.5 bg-[#B07B1E] text-white text-[10px] font-bold min-w-[17px] h-[17px] rounded-full flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Cart Drawer */}
      <CartDrawerEditorial />

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F3A3E]/95 z-[100] flex flex-col items-center justify-center p-6 md:p-8"
          >
            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-6 right-6 md:top-8 md:right-8 p-3 md:p-4 text-white hover:text-[#E8C25A] transition-colors"
              aria-label="Fechar"
            >
              <X className="h-6 w-6 md:h-8 md:w-8" />
            </button>

            <SearchAutocomplete onClose={() => setIsSearchOpen(false)} />
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MotionDiv
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed inset-0 bg-[#F3EEE3] z-[100] lg:hidden"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0D8C7]">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/logo-icon.png"
                    alt=""
                    className="h-[36px] w-auto object-contain"
                  />
                  <span className="font-serif text-[18px] font-medium tracking-[0.08em] text-[#0F3A3E]">
                    FRAGRANCIARIA
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-[#0F3A3E]"
                  aria-label="Fechar menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 px-6 py-8">
                <ul className="space-y-4">
                  {/* Produtos com submenu */}
                  <li>
                    <button
                      onClick={() => setMobileSubmenu(mobileSubmenu === "produtos" ? null : "produtos")}
                      className="flex items-center justify-between w-full font-serif text-2xl text-[#0F3A3E]"
                    >
                      Produtos
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 transition-transform",
                          mobileSubmenu === "produtos" && "rotate-90"
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {mobileSubmenu === "produtos" && (
                        <MotionDiv
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <ul className="mt-3 pl-4 space-y-3 border-l border-[#E0D8C7]">
                            <li>
                              <Link
                                to="/produtos"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-[14px] text-[#0F3A3E] font-medium"
                              >
                                Ver todos os produtos
                              </Link>
                            </li>
                            <li>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold pt-2">
                                Categorias
                              </p>
                            </li>
                            {CATEGORIES.slice(0, 6).map((cat) => (
                              <li key={cat.label}>
                                <Link
                                  to="/produtos"
                                  search={{ productType: cat.productType }}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="flex justify-between text-[14px] text-[#51635F]"
                                >
                                  <span>{cat.label}</span>
                                  <span className="text-[12px] text-[#9AA39F]">({countByCategory(cat.productType)})</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </MotionDiv>
                      )}
                    </AnimatePresence>
                  </li>

                  {/* Marcas com submenu */}
                  <li>
                    <button
                      onClick={() => setMobileSubmenu(mobileSubmenu === "marcas" ? null : "marcas")}
                      className="flex items-center justify-between w-full font-serif text-2xl text-[#0F3A3E]"
                    >
                      Marcas
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 transition-transform",
                          mobileSubmenu === "marcas" && "rotate-90"
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {mobileSubmenu === "marcas" && (
                        <MotionDiv
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <ul className="mt-3 pl-4 space-y-3 border-l border-[#E0D8C7]">
                            {BRANDS.map((brand) => (
                              <li key={brand.label}>
                                <Link
                                  to="/produtos"
                                  search={{ vendor: brand.vendor }}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="flex justify-between text-[14px] text-[#51635F]"
                                >
                                  <span>{brand.label}</span>
                                  <span className="text-[12px] text-[#9AA39F]">({brand.count})</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </MotionDiv>
                      )}
                    </AnimatePresence>
                  </li>

                  <li>
                    <Link
                      to="/produtos"
                      search={{ productType: "maquiagem" }}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block font-serif text-2xl text-[#0F3A3E]"
                    >
                      Maquiagem
                    </Link>
                  </li>

                  <li>
                    <Link
                      to="/produtos"
                      search={{ ofertas: true }}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block font-serif text-2xl text-[#B07B1E]"
                    >
                      Ofertas
                    </Link>
                  </li>

                  <li>
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 font-serif text-2xl text-[#0F3A3E]"
                    >
                      Minha conta
                    </Link>
                  </li>

                  <li>
                    <Link
                      to="/favoritos"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 font-serif text-2xl text-[#0F3A3E]"
                    >
                      Favoritos
                      {wishlistCount > 0 && (
                        <span className="bg-[#B07B1E] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>
                  </li>
                </ul>
              </nav>

              <div className="px-6 py-8 border-t border-[#E0D8C7]">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#B07B1E] mb-4">
                  Atendimento
                </p>
                <p className="text-[#51635F] text-sm">
                  Segunda a Sexta, 9h - 18h
                </p>
                <a
                  href="mailto:contato@fragranciaria.com.br"
                  className="text-[#0F3A3E] text-sm hover:text-[#B07B1E] transition-colors"
                >
                  contato@fragranciaria.com.br
                </a>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
};
