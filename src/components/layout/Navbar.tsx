import { Link } from "@tanstack/react-router";
import { Search, Heart, User, ChevronDown, Menu, X, SearchIcon, ShoppingBag } from "lucide-react";
import { CartDrawer } from "../shop/CartDrawer";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MARCAS_PREMIUM = [
  { name: "Kérastase", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=400&auto=format&fit=crop", desc: "Líder mundial em luxo" },
  { name: "Wella Professionals", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=400&auto=format&fit=crop", desc: "Excelência em cor" },
  { name: "Keune", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=400&auto=format&fit=crop", desc: "Tecnologia holandesa" },
  { name: "Sebastian", image: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=400&auto=format&fit=crop", desc: "Vanguarda no estilo" },
];

const TRATAMENTOS = [
  "Hidratação", "Nutrição", "Reconstrução", "Loiros", "Frizz", "Química", "Crescimento", "Couro cabeludo", "Coloração"
];

const NAV_LINKS = [
  { label: "Marcas", href: "/marcas", hasDropdown: true, type: "marcas" },
  { label: "Tratamentos", href: "/tratamentos", hasDropdown: true, type: "tratamentos" },
  { label: "Coloração", href: "/coloracao" },
  { label: "Kits de Luxo", href: "/kits" },
  { label: "Novidades", href: "/novidades" },
];

const MotionDiv = motion.div as any;

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] transition-all duration-700",
        isScrolled 
          ? "bg-white/95 backdrop-blur-xl border-b border-black/[0.03] py-2" 
          : "bg-transparent py-4"
      )}
    >
      <div className="container mx-auto px-4 md:px-12">
        <div className="flex items-center justify-between">
          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={cn(
                "p-2 transition-colors",
                isScrolled ? "text-[#1C1C1A]" : "text-white"
              )}
            >
              <Menu className="h-6 w-6 stroke-[1.2]" />
            </button>
          </div>

          <Link to="/" className="flex items-center group relative z-10">
            <span className={cn(
              "font-serif text-[24px] md:text-[28px] tracking-tighter transition-all duration-1000",
              isScrolled ? "text-[#1C1C1A]" : "text-white"
            )}>
              <span className="text-[#B8955A] italic">F</span>ragranciaria
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-10">
            {NAV_LINKS.map((link) => (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "text-[10px] uppercase tracking-[0.4em] font-bold transition-all duration-500 flex items-center gap-1 group relative outline-none",
                      isScrolled ? "text-[#1C1C1A]/80 hover:text-[#B8955A]" : "text-white/80 hover:text-[#B8955A]"
                    )}
                  >
                    {link.label}
                    {link.hasDropdown && <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />}
                  </button>
                </DropdownMenuTrigger>
                
                {link.hasDropdown && (
                  <DropdownMenuContent className="w-[80vw] max-w-[1200px] mt-6 bg-white/98 backdrop-blur-3xl border-none shadow-[0_40px_100px_-15px_rgba(0,0,0,0.1)] p-12 animate-in fade-in slide-in-from-top-4 duration-700 rounded-none">
                    {link.type === "marcas" ? (
                      <div className="grid grid-cols-4 gap-12">
                        {MARCAS_PREMIUM.map(marca => (
                          <DropdownMenuItem key={marca.name} className="flex flex-col items-start gap-6 p-0 bg-transparent focus:bg-transparent cursor-pointer group/item">
                            <div className="w-full aspect-[4/3] overflow-hidden bg-[#F8F6F2]">
                              <img src={marca.image} alt={marca.name} className="w-full h-full object-cover grayscale group-hover/item:grayscale-0 transition-all duration-1000 group-hover/item:scale-105" />
                            </div>
                            <div>
                              <h4 className="font-serif text-2xl mb-1 text-[#1C1C1A]">{marca.name}</h4>
                              <p className="text-[9px] uppercase tracking-[0.2em] text-[#B8955A] font-bold">{marca.desc}</p>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-x-12 gap-y-6">
                        {TRATAMENTOS.map(tratamento => (
                          <DropdownMenuItem key={tratamento} className="font-serif text-[20px] p-2 hover:text-[#B8955A] transition-colors cursor-pointer focus:bg-transparent">
                            {tratamento}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            ))}
          </nav>

          <div className="flex items-center space-x-2 md:space-x-6">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "p-2 transition-all duration-500 hover:scale-110",
                isScrolled ? "text-[#1C1C1A]" : "text-white"
              )}
            >
              <Search className="h-5 w-5 stroke-[1.2]" />
            </button>
            <button className={cn(
              "hidden sm:block p-2 transition-all duration-500 hover:scale-110",
              isScrolled ? "text-[#1C1C1A]" : "text-white"
            )}>
              <Heart className="h-5 w-5 stroke-[1.2]" />
            </button>
            <div className={cn("transition-colors duration-500", isScrolled ? "text-[#1C1C1A]" : "text-white")}>
              <CartDrawer />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSearchOpen && (
          <MotionDiv 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/98 z-[100] flex flex-col p-8 md:p-24"
          >
            <div className="flex justify-end mb-20">
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-4 hover:rotate-90 transition-transform duration-700"
              >
                <X className="h-10 w-10 stroke-[1]" />
              </button>
            </div>
            
            <div className="max-w-6xl mx-auto w-full" ref={searchRef}>
              <div className="relative mb-20">
                <input 
                  type="text"
                  autoFocus
                  placeholder="DIGITE SUA PESQUISA..."
                  className="w-full bg-transparent border-b border-[#1C1C1A]/10 py-8 text-3xl md:text-6xl font-serif outline-none focus:border-[#B8955A] transition-colors text-[#1C1C1A] uppercase tracking-tighter"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <SearchIcon className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 text-[#B8955A]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                <div>
                  <h5 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B8955A] mb-10">Marcas em Destaque</h5>
                  <div className="flex flex-col gap-6">
                    {["Kérastase Paris", "Wella Professionals", "Sebastian Professional", "Keune Haircosmetics"].map((item) => (
                      <button 
                        key={item}
                        className="text-left text-2xl md:text-3xl font-serif hover:text-[#B8955A] transition-colors text-[#1C1C1A] font-light"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B8955A] mb-10">Termos Populares</h5>
                  <div className="flex flex-wrap gap-4">
                    {["Hidratação Ativa", "Cronograma Capilar", "Loiro Perfeito", "Controle de Frizz", "Óleos de Luxo"].map(tag => (
                      <span key={tag} className="px-8 py-4 bg-[#F8F6F2] text-[10px] uppercase tracking-[0.3em] hover:bg-[#B8955A] hover:text-white transition-all cursor-pointer text-[#1C1C1A] font-bold">
                        {tag}
                      </span>
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
