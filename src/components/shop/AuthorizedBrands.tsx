import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

const MotionDiv = motion.div as any;

// Marcas com autorização documentada - Revendedor Autorizado
const AUTHORIZED_BRANDS = [
  {
    name: "L'Oréal Professionnel",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/L%27Or%C3%A9al_Professionnel_logo.svg/512px-L%27Or%C3%A9al_Professionnel_logo.svg.png",
    country: "França",
  },
  {
    name: "Wella Professionals",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Wella_logo.svg/512px-Wella_logo.svg.png",
    country: "Alemanha",
  },
  {
    name: "Schwarzkopf",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Schwarzkopf_logo.svg/512px-Schwarzkopf_logo.svg.png",
    country: "Alemanha",
  },
  {
    name: "Keune",
    logo: "https://www.keune.com/cdn/shop/files/keune-logo-black.png?v=1701175038&width=200",
    country: "Holanda",
  },
  {
    name: "Alfaparf Milano",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Alfaparf_Milano_logo.svg/512px-Alfaparf_Milano_logo.svg.png",
    country: "Itália",
  },
  {
    name: "Cadiveu",
    logo: "https://cadiveu.com.br/cdn/shop/files/cadiveu-logo.png?v=1690910519&width=200",
    country: "Brasil",
  },
];

export const AuthorizedBrands = () => {
  return (
    <section className="py-24 bg-white border-y border-black/[0.03]">
      <div className="container mx-auto px-4 md:px-12">
        {/* Header */}
        <div className="text-center mb-16">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <ShieldCheck className="h-5 w-5 text-[#D4AF37]" />
            <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#D4AF37]">
              Revendedor Autorizado
            </span>
          </MotionDiv>
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="font-serif font-light text-[#1A1A1A] text-3xl md:text-4xl mb-4">
              Marcas que <span className="italic text-[#D4AF37]">Representamos</span>
            </h2>
            <p className="text-[#1A1A1A]/50 text-sm max-w-xl mx-auto">
              Todos os produtos são adquiridos diretamente dos fabricantes ou distribuidores oficiais, com garantia de procedência.
            </p>
          </MotionDiv>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {AUTHORIZED_BRANDS.map((brand, i) => (
            <Link
              key={brand.name}
              to="/produtos"
              search={{ vendor: brand.name }}
            >
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group bg-[#FAFAF9] hover:bg-white border border-black/[0.03] hover:border-[#D4AF37]/30 p-6 flex flex-col items-center justify-center aspect-square transition-all duration-500 hover:shadow-lg cursor-pointer"
              >
                <div className="h-12 flex items-center justify-center mb-4 grayscale group-hover:grayscale-0 transition-all duration-500">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className="max-h-full max-w-[100px] object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="text-[8px] uppercase tracking-[0.3em] text-[#1A1A1A]/40 font-bold text-center">
                  {brand.country}
                </span>
              </MotionDiv>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <MotionDiv
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-[9px] uppercase tracking-[0.3em] text-[#1A1A1A]/30 font-bold">
            Compra direta do fabricante ou distribuidor oficial
          </p>
        </MotionDiv>
      </div>
    </section>
  );
};
