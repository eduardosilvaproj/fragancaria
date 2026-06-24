import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Heart, Menu, X, ShoppingBag } from "lucide-react";
import { CartDrawerEditorial } from "../shop/CartDrawerEditorial";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnnouncementMarquee } from "./AnnouncementMarquee";
import { useCartStore } from "@/stores/cartStore";

const NAV_LINKS = [
  { label: "Tratamentos", href: "/produtos", search: { productType: "Tratamento" } },
  { label: "Coloração", href: "/produtos", search: { productType: "Coloração" } },
  { label: "Marcas", href: "/produtos" },
  { label: "Kits", href: "/produtos", search: { productType: "Kit" } },
  { label: "Ofertas", href: "/produtos", isAccent: true },
];

const MotionDiv = motion.div as any;

export const NavbarEditorial = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { items, setIsOpen } = useCartStore();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate({ to: "/produtos", search: { q: searchQuery } });
    }
  };

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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              search={link.search}
              className={cn(
                "text-[13px] tracking-[0.18em] uppercase cursor-pointer transition-colors font-medium",
                link.isAccent
                  ? "text-[#B07B1E] hover:text-[#C68C28]"
                  : "text-[#2B413F] hover:text-[#0F3A3E]"
              )}
            >
              {link.label}
            </Link>
          ))}
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

          <button
            className="cursor-pointer hover:text-[#B07B1E] transition-colors hidden sm:block"
            aria-label="Favoritos"
          >
            <Heart className="h-[15px] w-[15px]" />
          </button>

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
            className="fixed inset-0 bg-[#0F3A3E]/95 z-[100] flex flex-col items-center justify-center p-8"
          >
            <button
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-8 right-8 p-4 text-white hover:text-[#E8C25A] transition-colors"
              aria-label="Fechar"
            >
              <X className="h-8 w-8" />
            </button>

            <form onSubmit={handleSearch} className="w-full max-w-2xl">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  autoFocus
                  placeholder="O que você procura?"
                  className="w-full bg-transparent border-b-2 border-white/20 py-6 text-3xl md:text-4xl font-serif text-white placeholder:text-white/40 outline-none focus:border-[#E8C25A] transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#E8C25A] hover:text-white transition-colors"
                  aria-label="Pesquisar"
                >
                  <Search className="h-8 w-8" />
                </button>
              </div>

              <div className="mt-12">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#E8C25A] mb-4">
                  Pesquisas populares
                </p>
                <div className="flex flex-wrap gap-3">
                  {["Coloração Wella", "Shampoo L'Oréal", "Kit Tratamento", "Loiro Perfeito"].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setSearchQuery(term);
                        searchInputRef.current?.focus();
                      }}
                      className="px-4 py-2 border border-white/20 text-white/80 text-sm hover:border-[#E8C25A] hover:text-[#E8C25A] transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </form>
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
                <ul className="space-y-6">
                  {NAV_LINKS.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        search={link.search}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "block font-serif text-2xl",
                          link.isAccent ? "text-[#B07B1E]" : "text-[#0F3A3E]"
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
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
