import { Link } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, CheckCircle2, Share2, Mail, AtSign, Globe, Play } from "lucide-react";
import { Button } from "../ui/button";

export const Footer = () => {
  return (
    <footer className="bg-[#0F3A45] pt-32 pb-12">
      <div className="container mx-auto px-4 md:px-12">
        {/* Newsletter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 pb-24 border-b border-white/10 mb-24">
            <div>
                <h3 className="font-serif text-4xl mb-6 font-light text-white">Newsletter <span className="italic text-[#D4AF37]">Privée</span></h3>
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 font-bold max-w-md leading-relaxed">
                    Assine para receber convites exclusivos, lançamentos antecipados e curadoria de rituais profissionais.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D4AF37]/40" />
                    <input
                        type="email"
                        placeholder="SEU MELHOR E-MAIL"
                        className="w-full bg-[#143E4A] border-none h-16 pl-16 pr-6 text-[10px] uppercase tracking-[0.2em] font-bold outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-all text-white placeholder:text-white/30"
                    />
                </div>
                <Button className="bg-[#D4AF37] hover:bg-white text-[#0F3A45] hover:text-[#0F3A45] px-12 h-16 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all duration-700">
                    Inscrever-se
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-10 group">
              <img
                src="/images/logo-dark.png"
                alt="Fragranciaria"
                className="h-14 w-auto object-contain transition-all duration-500 group-hover:opacity-80"
              />
            </Link>
            <p className="text-white/40 text-[10px] leading-relaxed mb-10 max-w-xs uppercase tracking-[0.2em] font-bold">
              A maior boutique de cosméticos profissionais de luxo do Brasil. Curadoria especializada para a saúde dos seus fios.
            </p>
            <div className="flex gap-8 text-white/40">
              <AtSign className="h-5 w-5 hover:text-[#D4AF37] cursor-pointer transition-colors" />
              <Globe className="h-5 w-5 hover:text-[#D4AF37] cursor-pointer transition-colors" />
              <Play className="h-5 w-5 hover:text-[#D4AF37] cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-10">Explorar</h4>
            <ul className="space-y-5">
              {["Marcas", "Tratamentos", "Lançamentos", "Kits de Luxo", "Best Sellers", "Ritual IA"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#D4AF37] transition-colors font-bold">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-10">Boutique</h4>
            <ul className="space-y-5">
              {["Nossa História", "Distribuidor Oficial", "Consultoria Especializada", "Termos e Condições", "Privacidade", "Contato"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#D4AF37] transition-colors font-bold">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#D4AF37] mb-10">Suporte</h4>
            <div className="flex items-center gap-6 mb-8 group cursor-pointer">
              <div className="w-14 h-14 rounded-none bg-[#143E4A] flex items-center justify-center group-hover:bg-[#D4AF37] transition-all duration-500 text-white group-hover:text-[#0F3A45]">
                <MessageCircle className="h-5 w-5 stroke-[1.2]" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">WhatsApp</p>
                <p className="text-sm font-bold text-white tracking-wider">(11) 99999-9999</p>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-6 border-t border-white/10">
                <div className="flex items-center gap-4">
                    <ShieldCheck className="h-5 w-5 text-[#D4AF37]" />
                    <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Compra 100% Segura</span>
                </div>
                <div className="flex items-center gap-4">
                    <CheckCircle2 className="h-5 w-5 text-[#D4AF37]" />
                    <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Originalidade Garantida</span>
                </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/10 flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="flex flex-wrap justify-center gap-10 items-center opacity-50">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold mr-4 text-white">Meios de Pagamento:</span>
            <div className="flex gap-8 text-white">
                <div className="text-[10px] font-black tracking-tighter">PIX</div>
                <div className="text-[10px] font-black tracking-tighter">VISA</div>
                <div className="text-[10px] font-black tracking-tighter">MASTER</div>
                <div className="text-[10px] font-black tracking-tighter">AMEX</div>
                <div className="text-[10px] font-black tracking-tighter">ELO</div>
            </div>
          </div>

          <div className="flex flex-col items-center lg:items-end gap-2">
            <p className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-bold">
                © 2024 Fragranciaria Boutique. Todos os direitos reservados.
            </p>
            <p className="text-[8px] uppercase tracking-[0.2em] text-white/20 font-bold">
                CNPJ: 00.000.000/0001-00 | SÃO PAULO - SP
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
