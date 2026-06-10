import { Link } from "@tanstack/react-router";
import { Instagram, Facebook, Twitter, MessageCircle, CreditCard, ShieldCheck, CheckCircle2 } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-white pt-24 pb-12 border-t border-[#B8955A]/20">
      <div className="container mx-auto px-4 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-8">
              <span className="font-serif text-4xl tracking-tighter text-[#1C1C1A]">
                <span className="text-[#B8955A] italic">F</span>ragranciaria
              </span>
            </Link>
            <p className="text-[#1C1C1A]/60 text-sm leading-relaxed mb-8 max-w-xs uppercase tracking-widest font-medium">
              Boutique especializada em produtos profissionais de alto luxo para o cuidado capilar.
            </p>
            <div className="flex gap-6">
              <Instagram className="h-5 w-5 text-[#1C1C1A] hover:text-[#B8955A] cursor-pointer transition-colors" />
              <Facebook className="h-5 w-5 text-[#1C1C1A] hover:text-[#B8955A] cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-[#1C1C1A] hover:text-[#B8955A] cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#1C1C1A] mb-8">Navegação</h4>
            <ul className="space-y-4">
              {["Marcas", "Tratamentos", "Coloração", "Kits", "Novidades", "Ofertas"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-[11px] uppercase tracking-widest text-[#1C1C1A]/60 hover:text-[#B8955A] transition-colors font-bold">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#1C1C1A] mb-8">Institucional</h4>
            <ul className="space-y-4">
              {["Sobre Nós", "Distribuidor Oficial", "Consultoria Especializada", "Trabalhe Conosco", "Blog", "Contato"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-[11px] uppercase tracking-widest text-[#1C1C1A]/60 hover:text-[#B8955A] transition-colors font-bold">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-[#1C1C1A] mb-8">Atendimento</h4>
            <div className="flex items-center gap-4 mb-6 group cursor-pointer">
              <div className="w-12 h-12 rounded-none border border-black/5 flex items-center justify-center group-hover:bg-[#B8955A] group-hover:text-white transition-all">
                <MessageCircle className="h-5 w-5 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#1C1C1A]/40 font-bold">WhatsApp</p>
                <p className="text-sm font-bold text-[#1C1C1A]">(11) 99999-9999</p>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-[#1C1C1A]/60 mb-8 leading-relaxed">
              Segunda a Sexta: 09h às 18h<br />Sábado: 09h às 13h
            </p>
            <div className="flex flex-wrap gap-3">
              <ShieldCheck className="h-8 w-8 text-[#B8955A] opacity-40" />
              <CheckCircle2 className="h-8 w-8 text-[#B8955A] opacity-40" />
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-6 items-center grayscale opacity-40">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Pagamento Seguro:</span>
            <div className="flex gap-4">
              <CreditCard className="h-5 w-5" />
              <div className="text-[10px] font-bold">PIX</div>
              <div className="text-[10px] font-bold">VISA</div>
              <div className="text-[10px] font-bold">MASTER</div>
              <div className="text-[10px] font-bold">BOLETO</div>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#1C1C1A]/40 font-bold">
            © 2024 Fragranciaria Boutique. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};