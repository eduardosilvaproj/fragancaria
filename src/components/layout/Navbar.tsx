import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Heart, ChevronDown, Menu, X, SearchIcon, MessageCircle, ChevronRight } from "lucide-react";
import { CartDrawer } from "../shop/CartDrawer";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Marcas premium do Shopify (vendors reais)
const MARCAS_PREMIUM = [
  { name: "L'Oréal Professionnel", slug: "L'Oréal Professionnel", desc: "Expertise francesa" },
  { name: "Wella Professionals", slug: "Wella Professionals", desc: "Excelência em cor" },
  { name: "Keune", slug: "Keune", desc: "Tecnologia holandesa" },
  { name: "Schwarzkopf", slug: "Schwarzkopf", desc: "Inovação alemã" },
];

const TODAS_MARCAS = [
  "Alfaparf", "Cadiveu", "Itallian", "Lowell", "Nioxin", "Trivitt", "Truss"
];

// Tratamentos por tipo de produto (productType do Shopify)
const TIPOS_PRODUTO = [
  { label: "Shampoos", productType: "Shampoos" },
  { label: "Condicionadores", productType: "Condicionadores" },
  { label: "Finalizadores", productType: "Finalizadores" },
  { label: "Óleos & Séruns", productType: "Óleos" },
];

// Tratamentos por necessidade (tags do Shopify)
const NECESSIDADES = [
  { label: "Hidratação", tag: "hidratação" },
  { label: "Nutrição", tag: "nutrição" },
  { label: "Antiqueda", tag: "antiqueda" },
  { label: "Volume", tag: "volume" },
  { label: "Proteção Térmica", tag: "protetor térmico" },
  { label: "Reparação", tag: "reparação" },
];

// Coloração submenu
const COLORACAO_ITEMS = [
  { label: "Ver Toda Coloração", productType: "Coloração" },
  { label: "Oxidantes", tag: "oxidante" },
  { label: "Matizadores", tag: "desamarelador" },
];

const MotionDiv = motion.div as any;

export const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fechar mobile menu ao navegar
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  const handleDropdownEnter = (menu: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(menu);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/produtos", search: { q: searchQuery.trim() } });
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navigateToProducts = (params: { vendor?: string; productType?: string; tag?: string }) => {
    navigate({ to: "/produtos", search: params });
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] transition-all duration-700",
        isScrolled
          ? "bg-[#0F3A45]/98 backdrop-blur-xl border-b border-[#D4AF37]/10 py-2"
          : "bg-transparent py-4"
      )}
    >
      <div className="mx-auto px-4 sm:px-8 md:px-12 lg:px-16 max-w-[1920px]">
        <div className="flex items-center justify-between gap-4 lg:gap-8">
          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-white transition-colors hover:text-[#D4AF37]"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6 stroke-[1.5]" />
            </button>
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center group relative z-10">
            <img
              src="/images/logo-dark.png"
              alt="Fragranciaria"
              className="h-12 md:h-14 lg:h-16 w-auto object-contain transition-all duration-500"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center justify-center flex-1 space-x-8 xl:space-x-12">
            {/* TRATAMENTOS */}
            <div
              className="relative"
              onMouseEnter={() => handleDropdownEnter("tratamentos")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                className={cn(
                  "text-[10px] uppercase tracking-[0.4em] font-bold transition-all duration-500 flex items-center gap-1.5 group py-2",
                  "text-white/90 hover:text-[#D4AF37]"
                )}
              >
                Tratamentos
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-300 opacity-50 group-hover:opacity-100",
                  activeDropdown === "tratamentos" && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {activeDropdown === "tratamentos" && (
                  <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[600px] bg-[#0F3A45]/98 backdrop-blur-xl border border-[#D4AF37]/10 shadow-2xl p-8"
                  >
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-4">Por Tipo</h4>
                        <div className="flex flex-col gap-2">
                          {TIPOS_PRODUTO.map(item => (
                            <button
                              key={item.label}
                              onClick={() => navigateToProducts({ productType: item.productType })}
                              className="text-left text-white/80 hover:text-[#D4AF37] transition-colors py-1.5 text-sm font-medium"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-4">Por Necessidade</h4>
                        <div className="flex flex-col gap-2">
                          {NECESSIDADES.map(item => (
                            <button
                              key={item.label}
                              onClick={() => navigateToProducts({ tag: item.tag })}
                              className="text-left text-white/80 hover:text-[#D4AF37] transition-colors py-1.5 text-sm font-medium"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <Link
                        to="/produtos"
                        onClick={() => setActiveDropdown(null)}
                        className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold hover:text-white transition-colors"
                      >
                        Ver Todos os Produtos →
                      </Link>
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>

            {/* COLORAÇÃO */}
            <div
              className="relative"
              onMouseEnter={() => handleDropdownEnter("coloracao")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                className={cn(
                  "text-[10px] uppercase tracking-[0.4em] font-bold transition-all duration-500 flex items-center gap-1.5 group py-2",
                  "text-white/90 hover:text-[#D4AF37]"
                )}
              >
                Coloração
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-300 opacity-50 group-hover:opacity-100",
                  activeDropdown === "coloracao" && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {activeDropdown === "coloracao" && (
                  <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[280px] bg-[#0F3A45]/98 backdrop-blur-xl border border-[#D4AF37]/10 shadow-2xl p-6"
                  >
                    <div className="flex flex-col gap-2">
                      {COLORACAO_ITEMS.map(item => (
                        <button
                          key={item.label}
                          onClick={() => navigateToProducts(
                            item.tag ? { tag: item.tag } : { productType: item.productType }
                          )}
                          className="text-left text-white/80 hover:text-[#D4AF37] transition-colors py-2 text-sm font-medium"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>

            {/* MARCAS */}
            <div
              className="relative"
              onMouseEnter={() => handleDropdownEnter("marcas")}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                className={cn(
                  "text-[10px] uppercase tracking-[0.4em] font-bold transition-all duration-500 flex items-center gap-1.5 group py-2",
                  "text-white/90 hover:text-[#D4AF37]"
                )}
              >
                Marcas
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform duration-300 opacity-50 group-hover:opacity-100",
                  activeDropdown === "marcas" && "rotate-180"
                )} />
              </button>

              <AnimatePresence>
                {activeDropdown === "marcas" && (
                  <MotionDiv
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[500px] bg-[#0F3A45]/98 backdrop-blur-xl border border-[#D4AF37]/10 shadow-2xl p-8"
                  >
                    <h4 className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold mb-4">Marcas Premium</h4>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {MARCAS_PREMIUM.map(marca => (
                        <button
                          key={marca.name}
                          onClick={() => navigateToProducts({ vendor: marca.slug })}
                          className="text-left bg-[#143E4A]/50 hover:bg-[#D4AF37]/20 p-4 transition-all group/marca"
                        >
                          <span className="text-white font-medium group-hover/marca:text-[#D4AF37] transition-colors">{marca.name}</span>
                          <p className="text-[10px] text-white/40 mt-1">{marca.desc}</p>
                        </button>
                      ))}
                    </div>
                    <h4 className="text-[9px] uppercase tracking-[0.3em] text-white/50 font-bold mb-3">Outras Marcas</h4>
                    <div className="flex flex-wrap gap-2">
                      {TODAS_MARCAS.map(marca => (
                        <button
                          key={marca}
                          onClick={() => navigateToProducts({ vendor: marca })}
                          className="text-white/60 hover:text-[#D4AF37] transition-colors text-sm"
                        >
                          {marca}
                        </button>
                      ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <Link
                        to="/produtos"
                        onClick={() => setActiveDropdown(null)}
                        className="text-[10px] uppercase tracking-[0.3em] text-[#D4AF37] font-bold hover:text-white transition-colors"
                      >
                        Ver Todas as Marcas →
                      </Link>
                    </div>
                  </MotionDiv>
                )}
              </AnimatePresence>
            </div>

            {/* KITS */}
            <Link
              to="/produtos"
              search={{ productType: "Kits" }}
              className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/90 hover:text-[#D4AF37] transition-all duration-500 py-2"
            >
              Kits
            </Link>

            {/* OFERTAS */}
            <Link
              to="/produtos"
              search={{ sale: "true" }}
              className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/90 hover:text-[#D4AF37] transition-all duration-500 py-2"
            >
              Ofertas
            </Link>
          </nav>

          {/* Right side icons */}
          <div className="flex items-center space-x-1 sm:space-x-3 md:space-x-4">
            {/* Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-white hover:text-[#D4AF37] transition-all duration-300"
              aria-label="Buscar"
            >
              <Search className="h-5 w-5 stroke-[1.5]" />
            </button>

            {/* WhatsApp */}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex p-2 text-white hover:text-[#D4AF37] transition-all duration-300"
              aria-label="WhatsApp"
            >
              <MessageCircle className="h-5 w-5 stroke-[1.5]" />
            </a>

            {/* Wishlist */}
            <button
              className="hidden md:flex p-2 text-white hover:text-[#D4AF37] transition-all duration-300"
              aria-label="Favoritos"
            >
              <Heart className="h-5 w-5 stroke-[1.5]" />
            </button>

            {/* Cart */}
            <div className="text-white">
              <CartDrawer />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F3A45] z-[100] lg:hidden overflow-y-auto"
          >
            <div className="flex flex-col min-h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                  <img
                    src="/images/logo-dark.png"
                    alt="Fragranciaria"
                    className="h-10 w-auto"
                  />
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-white hover:text-[#D4AF37]"
                  aria-label="Fechar menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile Nav */}
              <nav className="flex-1 p-6">
                {/* Tratamentos Accordion */}
                <div className="border-b border-white/10">
                  <button
                    onClick={() => setMobileSubmenu(mobileSubmenu === "tratamentos" ? null : "tratamentos")}
                    className="w-full flex items-center justify-between py-4 text-white"
                  >
                    <span className="text-lg font-medium">Tratamentos</span>
                    <ChevronDown className={cn(
                      "h-5 w-5 transition-transform",
                      mobileSubmenu === "tratamentos" && "rotate-180"
                    )} />
                  </button>
                  <AnimatePresence>
                    {mobileSubmenu === "tratamentos" && (
                      <MotionDiv
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 pl-4">
                          <p className="text-[10px] uppercase tracking-wider text-[#D4AF37] mb-2">Por Tipo</p>
                          {TIPOS_PRODUTO.map(item => (
                            <button
                              key={item.label}
                              onClick={() => navigateToProducts({ productType: item.productType })}
                              className="block w-full text-left py-2 text-white/70 hover:text-[#D4AF37]"
                            >
                              {item.label}
                            </button>
                          ))}
                          <p className="text-[10px] uppercase tracking-wider text-[#D4AF37] mt-4 mb-2">Por Necessidade</p>
                          {NECESSIDADES.map(item => (
                            <button
                              key={item.label}
                              onClick={() => navigateToProducts({ tag: item.tag })}
                              className="block w-full text-left py-2 text-white/70 hover:text-[#D4AF37]"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>

                {/* Coloração Accordion */}
                <div className="border-b border-white/10">
                  <button
                    onClick={() => setMobileSubmenu(mobileSubmenu === "coloracao" ? null : "coloracao")}
                    className="w-full flex items-center justify-between py-4 text-white"
                  >
                    <span className="text-lg font-medium">Coloração</span>
                    <ChevronDown className={cn(
                      "h-5 w-5 transition-transform",
                      mobileSubmenu === "coloracao" && "rotate-180"
                    )} />
                  </button>
                  <AnimatePresence>
                    {mobileSubmenu === "coloracao" && (
                      <MotionDiv
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 pl-4">
                          {COLORACAO_ITEMS.map(item => (
                            <button
                              key={item.label}
                              onClick={() => navigateToProducts(
                                item.tag ? { tag: item.tag } : { productType: item.productType }
                              )}
                              className="block w-full text-left py-2 text-white/70 hover:text-[#D4AF37]"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>

                {/* Marcas Accordion */}
                <div className="border-b border-white/10">
                  <button
                    onClick={() => setMobileSubmenu(mobileSubmenu === "marcas" ? null : "marcas")}
                    className="w-full flex items-center justify-between py-4 text-white"
                  >
                    <span className="text-lg font-medium">Marcas</span>
                    <ChevronDown className={cn(
                      "h-5 w-5 transition-transform",
                      mobileSubmenu === "marcas" && "rotate-180"
                    )} />
                  </button>
                  <AnimatePresence>
                    {mobileSubmenu === "marcas" && (
                      <MotionDiv
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 pl-4">
                          {MARCAS_PREMIUM.map(marca => (
                            <button
                              key={marca.name}
                              onClick={() => navigateToProducts({ vendor: marca.slug })}
                              className="block w-full text-left py-2 text-white/70 hover:text-[#D4AF37]"
                            >
                              {marca.name}
                            </button>
                          ))}
                          <div className="h-px bg-white/10 my-2" />
                          {TODAS_MARCAS.map(marca => (
                            <button
                              key={marca}
                              onClick={() => navigateToProducts({ vendor: marca })}
                              className="block w-full text-left py-2 text-white/50 hover:text-[#D4AF37] text-sm"
                            >
                              {marca}
                            </button>
                          ))}
                        </div>
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>

                {/* Direct links */}
                <Link
                  to="/produtos"
                  search={{ productType: "Kits" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-4 text-lg font-medium text-white border-b border-white/10"
                >
                  Kits
                </Link>

                <Link
                  to="/produtos"
                  search={{ sale: "true" }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-4 text-lg font-medium text-[#D4AF37] border-b border-white/10"
                >
                  Ofertas
                </Link>

                <Link
                  to="/produtos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-4 text-lg font-medium text-white border-b border-white/10"
                >
                  Ver Todos os Produtos
                </Link>
              </nav>

              {/* Mobile Footer */}
              <div className="p-6 border-t border-white/10">
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[#D4AF37] mb-4"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Fale conosco no WhatsApp</span>
                </a>
                <Link
                  to="/contato"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white/60 text-sm hover:text-white"
                >
                  Central de Atendimento
                </Link>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* SEARCH MODAL */}
      <AnimatePresence>
        {isSearchOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0F3A45]/98 z-[100] flex flex-col p-6 md:p-16"
          >
            <div className="flex justify-end mb-8 md:mb-16">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-3 hover:rotate-90 transition-transform duration-500 text-white hover:text-[#D4AF37]"
              >
                <X className="h-8 w-8 stroke-[1.5]" />
              </button>
            </div>

            <div className="max-w-4xl mx-auto w-full flex-1">
              <form onSubmit={handleSearch} className="relative mb-12">
                <input
                  type="text"
                  autoFocus
                  placeholder="O que você procura?"
                  className="w-full bg-transparent border-b-2 border-white/20 py-6 text-2xl md:text-4xl font-serif outline-none focus:border-[#D4AF37] transition-colors text-white placeholder:text-white/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[#D4AF37] hover:text-white transition-colors"
                >
                  <SearchIcon className="h-8 w-8" />
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h5 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-6">Marcas Populares</h5>
                  <div className="flex flex-col gap-3">
                    {MARCAS_PREMIUM.map((marca) => (
                      <button
                        key={marca.name}
                        onClick={() => {
                          navigateToProducts({ vendor: marca.slug });
                          setIsSearchOpen(false);
                        }}
                        className="text-left text-xl md:text-2xl font-serif hover:text-[#D4AF37] transition-colors text-white/80"
                      >
                        {marca.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-6">Categorias</h5>
                  <div className="flex flex-wrap gap-3">
                    {TIPOS_PRODUTO.map(item => (
                      <button
                        key={item.label}
                        onClick={() => {
                          navigateToProducts({ productType: item.productType });
                          setIsSearchOpen(false);
                        }}
                        className="px-5 py-2.5 bg-[#143E4A] text-[11px] uppercase tracking-[0.2em] hover:bg-[#D4AF37] hover:text-[#0F3A45] transition-all text-white font-medium"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </header>
  );
};
