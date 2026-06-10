import { Link } from "@tanstack/react-router";
import { Search, Heart, User, ChevronDown } from "lucide-react";
import { CartDrawer } from "../shop/CartDrawer";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Marcas", href: "/marcas", hasDropdown: true },
  { label: "Tratamentos", href: "/tratamentos" },
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
              <Link
                key={link.label}
                to={link.href as any}
                className={cn(
                  "text-[11px] uppercase tracking-[0.25em] font-medium transition-all duration-500 flex items-center gap-1 group relative",
                  isScrolled ? "text-foreground/80" : "text-white/90"
                )}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-primary transition-all duration-500 group-hover:w-full" />
                {link.hasDropdown && <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />}
              </Link>
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
