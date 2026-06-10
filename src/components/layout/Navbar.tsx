import { Link } from "@tanstack/react-router";
import { Search, Heart, User, ChevronDown, Menu, X, SearchIcon } from "lucide-react";
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
  { label: "Kits", href: "/kits" },
  { label: "Novidades", href: "/novidades" },
];

const MotionDiv = motion.div as any;

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchQuery.toLowerCase().includes("kér")) {
      setSearchSuggestions(["Kérastase Nutritive", "Kérastase Blond Absolu", "Kérastase Genesis"]);
    } else if (searchQuery.length > 2) {
      setSearchSuggestions(["Shampoo Reconstrução", "Máscara Wella", "Óleo Sebastian"]);
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery]);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-[60] transition-all duration-700",
        isScrolled 
          ? "bg-white/95 backdrop-blur-xl shadow-[0_4px_30px_-10px_rgba(0,0,0,0.05)] py-3" 
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-12">
        <div className="flex items-center justify-between">
          <div className="md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className={cn(
                "p-2 transition-colors",
                isScrolled ? "text-foreground" : "text-white"
              )}
            >
              <Menu className="h-6 w-6 stroke-[1.2]" />
            </button>
          </div>

          <Link to="/" className="flex items-center group relative z-10">
            <span className={cn(
              "font-serif text-3xl tracking-tighter transition-all duration-700",
              isScrolled ? "scale-90 text-[#1C1C1A]" : "scale-100 text-white"
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
                      "text-[10px] uppercase tracking-[0.3em] font-bold transition-all duration-500 flex items-center gap-1 group relative outline-none",
                      isScrolled ? "text-[#1C1C1A]/80 hover:text-[#B8955A]" : "text-white/90 hover:text-[#B8955A]"
                    )}
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-[#B8955A] transition-all duration-500 group-hover:w-full" />
                    {link.hasDropdown && <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />}
                  </button>
                </DropdownMenuTrigger>
                
                {link.hasDropdown && (
                  <DropdownMenuContent className="w-[80vw] max-w-[1200px] mt-4 bg-white/98 backdrop-blur-2xl border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] p-10 animate-in fade-in slide-in-from-top-4 duration-700 rounded-none">
                    {link.type === "marcas" ? (
                      <div className="grid grid-cols-4 gap-12">
                        {MARCAS_PREMIUM.map(marca => (
                          <DropdownMenuItem key={marca.name} className="flex flex-col items-start gap-5 p-0 bg-transparent focus:bg-transparent cursor-pointer group/item rounded-none border-none">
                            <div className="w-full aspect-[4/3] overflow-hidden">
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
                          <DropdownMenuItem key={tratamento} className="font-serif text-xl p-2 hover:text-[#B8955A] transition-colors cursor-pointer focus:bg-transparent rounded-none">
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

          <div className="flex items-center space-x-2 md:space-x-4">
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={cn(
                "p-2 transition-all duration-500 hover:scale-110",
                isScrolled ? "text-[#1C1C1A] hover:text-[#B8955A]" : "text-white hover:text-[#B8955A]"
              )}
            >
              <Search className="h-5 w-5 stroke-[1.2]" />
            </button>
            <button className={cn(
              "hidden sm:block p-2 transition-all duration-500 hover:scale-110",
              isScrolled ? "text-[#1C1C1A] hover:text-[#B8955A]" : "text-white hover:text-[#B8955A]"
            )}>
              <Heart className="h-5 w-5 stroke-[1.2]" />
            </button>
            <button className={cn(
              "p-2 transition-all duration-500 hover:scale-110",
              isScrolled ? "text-[#1C1C1A] hover:text-[#B8955A]" : "text-white hover:text-[#B8955A]"
            )}>
              <User className="h-5 w-5 stroke-[1.2]" />
            </button>
            <div className={cn("transition-colors duration-500", isScrolled ? "text-[#1C1C1A]" : "text-white")}>
              <CartDrawer />
            </div>
          </div>
        </div>
      </div>
      
      <div className={cn("absolute bottom-0 left-0 right-0 h-[1px] bg-white/10 transition-opacity", isScrolled ? "opacity-0" : "opacity-100")} />

      <AnimatePresence>
        {isSearchOpen && (
          <MotionDiv 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/98 z-[100] flex flex-col p-8 md:p-20"
          >
            <div className="flex justify-end mb-12">
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-4 hover:rotate-90 transition-transform duration-500"
              >
                <X className="h-8 w-8 stroke-[1]" />
              </button>
            </div>
            
            <div className="max-w-5xl mx-auto w-full" ref={searchRef}>
              <div className="relative mb-12">
                <input 
                  type="text"
                  autoFocus
                  placeholder="Pesquisar por marca, produto ou necessidade..."
                  className="w-full bg-transparent border-b-2 border-[#1C1C1A]/10 py-6 text-2xl md:text-5xl font-serif outline-none focus:border-[#B8955A] transition-colors text-[#1C1C1A]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <SearchIcon className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 text-[#B8955A]" />
              </div>

              {searchSuggestions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div>
                    <h5 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8955A] mb-8">Sugestões</h5>
                    <div className="space-y-6">
                      {searchSuggestions.map((suggestion) => (
                        <button 
                          key={suggestion}
                          className="block text-2xl md:text-3xl font-serif hover:text-[#B8955A] transition-colors text-[#1C1C1A]"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <h5 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8955A] mb-8">Mais Buscados</h5>
                    <div className="flex flex-wrap gap-4">
                      {["Kérastase", "Wella", "Sebastian", "Nutrição", "Loiros", "Óleos"].map(tag => (
                        <span key={tag} className="px-6 py-3 border border-black/5 text-[11px] uppercase tracking-widest hover:border-[#B8955A] hover:text-[#B8955A] transition-all cursor-pointer text-[#1C1C1A]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <MotionDiv 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />
            <MotionDiv 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] bg-white z-[80] p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <span className="font-serif text-2xl text-[#1C1C1A]"><span className="text-[#B8955A] italic">F</span>ragranciaria</span>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-6 w-6 text-[#1C1C1A]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-8">
                  {NAV_LINKS.map(link => (
                    <div key={link.label}>
                      <button className="text-2xl font-serif flex items-center justify-between w-full text-[#1C1C1A]">
                        {link.label}
                        {link.hasDropdown && <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-black/5 mt-auto">
                <div className="flex items-center gap-6 mb-8">
                  <User className="h-5 w-5 text-[#1C1C1A]" />
                  <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1C1C1A]">Minha Conta</span>
                </div>
                <div className="flex items-center gap-6">
                  <Heart className="h-5 w-5 text-[#1C1C1A]" />
                  <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1C1C1A]">Favoritos</span>
                </div>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};