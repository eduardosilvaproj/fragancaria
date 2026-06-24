import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Heart, Menu, X, ShoppingBag, ChevronDown, ChevronRight } from "lucide-react";
import { CartDrawerEditorial } from "../shop/CartDrawerEditorial";
import { SearchAutocomplete } from "../shop/SearchAutocomplete";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnnouncementMarquee } from "./AnnouncementMarquee";
import { useCartStore } from "@/stores/cartStore";
import { useWishlistStore } from "@/stores/wishlistStore";

// Categorias organizadas
const CATEGORIES = [
  { label: "Shampoo", productType: "Shampoo", count: 111 },
  { label: "Condicionador", productType: "Condicionador", count: 51 },
  { label: "Máscara", productType: "Máscara", count: 45 },
  { label: "Coloração", productType: "Coloração", count: 87 },
  { label: "Finalizador", productType: "Finalizador", count: 29 },
  { label: "Óleo", productType: "Óleo", count: 11 },
  { label: "Leave-in", productType: "Leave-in", count: 10 },
];

// Marcas principais
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
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
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
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {/* Produtos - Mega Menu com CSS hover */}
          <div className="group relative">
            <Link
              to="/produtos"
              className="flex items-center gap-1 text-[13px] tracking-[0.18em] uppercase cursor-pointer transition-colors font-medium text-[#2B413F] hover:text-[#0F3A3E] py-4"
            >
              Produtos
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </Link>

            {/* Dropdown - aparece no hover via CSS */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-0 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white border border-[#E0D8C7] shadow-xl min-w-[620px] p-6">
                <div className="grid grid-cols-3 gap-8">
                  {/* Categorias */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
                      Categorias
                    </p>
                    <ul className="space-y-2">
                      {CATEGORIES.map((cat) => (
                        <li key={cat.productType}>
                          <Link
                            to="/produtos"
                            search={{ productType: cat.productType }}
                            className="flex items-center justify-between text-[14px] text-[#51635F] hover:text-[#0F3A3E] transition-colors py-1"
                          >
                            {cat.label}
                            <span className="text-[12px] text-[#9AA39F]">({cat.count})</span>
                          </Link>
                        </li>
                      ))}
                      <li className="pt-2 border-t border-[#E9E1D2] mt-3">
                        <Link
                          to="/produtos"
                          className="text-[13px] text-[#0F3A3E] font-medium hover:text-[#B07B1E] transition-colors"
                        >
                          Ver todas categorias →
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {/* Marcas */}
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
                      Marcas
                    </p>
                    <ul className="space-y-2">
                      {BRANDS.map((brand) => (
                        <li key={brand.vendor}>
                          <Link
                            to="/produtos"
                            search={{ vendor: brand.vendor }}
                            className="flex items-center justify-between text-[14px] text-[#51635F] hover:text-[#0F3A3E] transition-colors py-1"
                          >
                            {brand.label}
                            <span className="text-[12px] text-[#9AA39F]">({brand.count})</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Destaques */}
                  <div className="bg-[#F8F4EA] p-5 -m-1">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
                      Destaques
                    </p>
                    <ul className="space-y-3">
                      <li>
                        <Link
                          to="/produtos"
                          search={{ ofertas: true }}
                          className="flex items-center gap-2 text-[14px] text-[#0F3A3E] font-medium hover:text-[#B07B1E] transition-colors"
                        >
                          <span className="w-2 h-2 bg-[#B07B1E] rounded-full" />
                          Ofertas do Dia
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/produtos"
                          search={{ productType: "Coloração" }}
                          className="flex items-center gap-2 text-[14px] text-[#0F3A3E] font-medium hover:text-[#B07B1E] transition-colors"
                        >
                          <span className="w-2 h-2 bg-[#0F3A3E] rounded-full" />
                          Coloração Profissional
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/produtos"
                          search={{ productType: "Kit" }}
                          className="flex items-center gap-2 text-[14px] text-[#0F3A3E] font-medium hover:text-[#B07B1E] transition-colors"
                        >
                          <span className="w-2 h-2 bg-[#0F3A3E] rounded-full" />
                          Kits Promocionais
                        </Link>
                      </li>
                    </ul>
                    <div className="mt-6 pt-4 border-t border-[#E0D8C7]">
                      <Link
                        to="/produtos"
                        className="block text-center py-2.5 bg-[#0F3A3E] text-white text-[11px] uppercase tracking-[0.14em] font-semibold hover:bg-[#16504F] transition-colors"
                      >
                        Ver todos os produtos
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Marcas - Dropdown com CSS hover */}
          <div className="group relative">
            <button className="flex items-center gap-1 text-[13px] tracking-[0.18em] uppercase cursor-pointer transition-colors font-medium text-[#2B413F] hover:text-[#0F3A3E] py-4">
              Marcas
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
            </button>

            {/* Dropdown - aparece no hover via CSS */}
            <div className="absolute top-full left-0 pt-0 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="bg-white border border-[#E0D8C7] shadow-xl min-w-[220px] py-3">
                {BRANDS.map((brand) => (
                  <Link
                    key={brand.vendor}
                    to="/produtos"
                    search={{ vendor: brand.vendor }}
                    className="flex items-center justify-between px-5 py-2.5 text-[14px] text-[#51635F] hover:text-[#0F3A3E] hover:bg-[#F8F4EA] transition-colors"
                  >
                    {brand.label}
                    <span className="text-[12px] text-[#9AA39F]">({brand.count})</span>
                  </Link>
                ))}
                <div className="border-t border-[#E9E1D2] mt-2 pt-2 px-5">
                  <Link
                    to="/produtos"
                    className="block text-[13px] text-[#0F3A3E] font-medium hover:text-[#B07B1E] py-2"
                  >
                    Ver todas as marcas →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Links simples */}
          <Link
            to="/produtos"
            search={{ productType: "Maquiagem" }}
            className="text-[13px] tracking-[0.18em] uppercase cursor-pointer transition-colors font-medium text-[#2B413F] hover:text-[#0F3A3E]"
          >
            Maquiagem
          </Link>

          <Link
            to="/produtos"
            search={{ ofertas: true }}
            className="text-[13px] tracking-[0.18em] uppercase cursor-pointer transition-colors font-medium text-[#B07B1E] hover:text-[#C68C28]"
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
            className="fixed inset-0 bg-[#F3EEE3] z-[100] lg:hidden overflow-y-auto"
          >
            <div className="flex flex-col min-h-full">
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

              <nav className="flex-1 px-6 py-6">
                {/* Produtos com submenu */}
                <div className="border-b border-[#E9E1D2] pb-4 mb-4">
                  <button
                    onClick={() => setMobileSubmenu(mobileSubmenu === "produtos" ? null : "produtos")}
                    className="flex items-center justify-between w-full py-3"
                  >
                    <span className="font-serif text-xl text-[#0F3A3E]">Produtos</span>
                    <ChevronRight className={cn("h-5 w-5 text-[#75827E] transition-transform", mobileSubmenu === "produtos" && "rotate-90")} />
                  </button>

                  <AnimatePresence>
                    {mobileSubmenu === "produtos" && (
                      <MotionDiv
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pt-2 space-y-1">
                          <Link
                            to="/produtos"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-2 text-[15px] text-[#0F3A3E] font-medium"
                          >
                            Ver todos os produtos
                          </Link>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[#B07B1E] pt-3 pb-1">Categorias</p>
                          {CATEGORIES.slice(0, 6).map((cat) => (
                            <Link
                              key={cat.productType}
                              to="/produtos"
                              search={{ productType: cat.productType }}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between py-2 text-[15px] text-[#51635F]"
                            >
                              {cat.label}
                              <span className="text-[12px] text-[#9AA39F]">({cat.count})</span>
                            </Link>
                          ))}
                        </div>
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>

                {/* Marcas com submenu */}
                <div className="border-b border-[#E9E1D2] pb-4 mb-4">
                  <button
                    onClick={() => setMobileSubmenu(mobileSubmenu === "marcas" ? null : "marcas")}
                    className="flex items-center justify-between w-full py-3"
                  >
                    <span className="font-serif text-xl text-[#0F3A3E]">Marcas</span>
                    <ChevronRight className={cn("h-5 w-5 text-[#75827E] transition-transform", mobileSubmenu === "marcas" && "rotate-90")} />
                  </button>

                  <AnimatePresence>
                    {mobileSubmenu === "marcas" && (
                      <MotionDiv
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 pt-2 space-y-1">
                          {BRANDS.map((brand) => (
                            <Link
                              key={brand.vendor}
                              to="/produtos"
                              search={{ vendor: brand.vendor }}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between py-2 text-[15px] text-[#51635F]"
                            >
                              {brand.label}
                              <span className="text-[12px] text-[#9AA39F]">({brand.count})</span>
                            </Link>
                          ))}
                        </div>
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>

                {/* Links diretos */}
                <ul className="space-y-4">
                  <li>
                    <Link
                      to="/produtos"
                      search={{ productType: "Maquiagem" }}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block font-serif text-xl text-[#0F3A3E] py-2"
                    >
                      Maquiagem
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/produtos"
                      search={{ ofertas: true }}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block font-serif text-xl text-[#B07B1E] py-2"
                    >
                      Ofertas
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/favoritos"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 font-serif text-xl text-[#0F3A3E] py-2"
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

              <div className="px-6 py-6 border-t border-[#E0D8C7] mt-auto">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#B07B1E] mb-3">
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
