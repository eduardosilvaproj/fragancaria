import { Link } from "@tanstack/react-router";
import { Search, Heart, User, ChevronDown, Sparkles } from "lucide-react";
import { CartDrawer } from "../shop/CartDrawer";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MARCAS_PREMIUM = [
  { name: "Kérastase", image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=200&auto=format&fit=crop", desc: "Líder mundial em luxo" },
  { name: "Wella Professionals", image: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=200&auto=format&fit=crop", desc: "Excelência em cor" },
  { name: "Keune", image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=200&auto=format&fit=crop", desc: "Tecnologia holandesa" },
  { name: "Sebastian", image: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=200&auto=format&fit=crop", desc: "Vanguarda no estilo" },
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

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-white/80 backdrop-blur-xl shadow-[0_2px_20px_-10px_rgba(0,0,0,0.1)] py-3" 
          : "bg-transparent py-6"
      )}
    >
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Placeholder */}
          <div className="md:hidden">
            <button className="p-2">
              <div className="w-6 h-0.5 bg-foreground mb-1.5" />
              <div className="w-4 h-0.5 bg-foreground mb-1.5" />
              <div className="w-6 h-0.5 bg-foreground" />
            </button>
          </div>

          {/* Logo */}
          <Link to="/" className="flex items-center group relative z-10">
            <span className={cn(
              "font-serif text-3xl tracking-tighter transition-all duration-500",
              isScrolled ? "scale-90 text-foreground" : "scale-100 text-white"
            )}>
              <span className="text-primary italic">F</span>ragranciaria
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-500 flex items-center gap-1 group relative outline-none",
                      isScrolled ? "text-foreground/80" : "text-white/90"
                    )}
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary transition-all duration-500 group-hover:w-full" />
                    {link.hasDropdown && <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />}
                  </button>
                </DropdownMenuTrigger>
                
                {link.hasDropdown && (
                  <DropdownMenuContent className="w-screen max-w-[1200px] mt-4 bg-white/95 backdrop-blur-xl border-none shadow-2xl p-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    {link.type === "marcas" ? (
                      <div className="grid grid-cols-4 gap-8">
                        {MARCAS_PREMIUM.map(marca => (
                          <DropdownMenuItem key={marca.name} className="flex flex-col items-start gap-4 p-0 bg-transparent focus:bg-transparent cursor-pointer group/item">
                            <div className="w-full aspect-video overflow-hidden">
                              <img src={marca.image} alt={marca.name} className="w-full h-full object-cover grayscale group-hover/item:grayscale-0 transition-all duration-700 group-hover/item:scale-105" />
                            </div>
                            <div>
                              <h4 className="font-serif text-xl mb-1">{marca.name}</h4>
                              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{marca.desc}</p>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-x-12 gap-y-4">
                        {TRATAMENTOS.map(tratamento => (
                          <DropdownMenuItem key={tratamento} className="font-serif text-lg p-2 hover:text-primary transition-colors cursor-pointer focus:bg-transparent">
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

          {/* Icons */}
          <div className="flex items-center space-x-1 md:space-x-2">
            <button className={cn(
              "hidden sm:block p-2 transition-colors duration-500",
              isScrolled ? "text-foreground hover:text-primary" : "text-white hover:text-primary"
            )}>
              <Search className="h-5 w-5 stroke-[1.2]" />
            </button>
            <button className={cn(
              "hidden sm:block p-2 transition-colors duration-500",
              isScrolled ? "text-foreground hover:text-primary" : "text-white hover:text-primary"
            )}>
              <Heart className="h-5 w-5 stroke-[1.2]" />
            </button>
            <button className={cn(
              "p-2 transition-colors duration-500",
              isScrolled ? "text-foreground hover:text-primary" : "text-white hover:text-primary"
            )}>
              <User className="h-5 w-5 stroke-[1.2]" />
            </button>
            <div className={cn("transition-colors duration-500", isScrolled ? "text-foreground" : "text-white")}>
              <CartDrawer />
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Border */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-[1px] bg-white/10 transition-opacity", isScrolled ? "opacity-0" : "opacity-100")} />
    </header>
  );
};
