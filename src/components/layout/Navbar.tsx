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
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-3" : "bg-white py-5"
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
          <Link to="/" className="flex items-center group">
            <span className="font-serif text-3xl tracking-tighter">
              <span className="text-primary italic">F</span>ragranciaria
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.href as any}
                className="text-[13px] uppercase tracking-[0.12em] font-medium text-foreground/80 hover:text-primary transition-colors flex items-center gap-1 group"
              >
                {link.label}
                {link.hasDropdown && <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" />}
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center space-x-2 md:space-x-4">
            <button className="hidden sm:block p-2 text-foreground hover:text-primary transition-colors">
              <Search className="h-5 w-5 stroke-[1.5]" />
            </button>
            <button className="hidden sm:block p-2 text-foreground hover:text-primary transition-colors">
              <Heart className="h-5 w-5 stroke-[1.5]" />
            </button>
            <button className="p-2 text-foreground hover:text-primary transition-colors">
              <User className="h-5 w-5 stroke-[1.5]" />
            </button>
            <CartDrawer />
          </div>
        </div>
      </div>
      
      {/* Bottom Border */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-[1px] bg-border/40 transition-opacity", isScrolled ? "opacity-100" : "opacity-60")} />
    </header>
  );
};
