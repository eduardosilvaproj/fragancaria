import { Link } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, CheckCircle2, Share2, Mail, AtSign, Globe, Play } from "lucide-react";
import { Button } from "../ui/button";

export const Footer = () => {
  return (
    <footer className="bg-white pt-32 pb-12 border-t border-black/[0.03]">
      <div className="container mx-auto px-4 md:px-12">
        {/* Newsletter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 pb-24 border-b border-black/[0.03] mb-24">
            <div>
                <h3 className="font-serif text-4xl mb-6 font-light">Newsletter <span className="italic text-[#B8955A]">Privée</span></h3>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#1C1C1A]/40 font-bold max-w-md leading-relaxed">
                    Assine para receber convites exclusivos, lançamentos antecipados e curadoria de rituais profissionais.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B8955A]/40" />
                    <input 
                        type="email" 
                        placeholder="SEU MELHOR E-MAIL" 
                        className="w-full bg-[#F8F6F2] border-none h-16 pl-16 pr-6 text-[10px] uppercase tracking-[0.2em] font-bold outline-none focus:ring-1 focus:ring-[#B8955A]/30 transition-all"
                    />
                </div>
                <Button className="bg-[#1C1C1A] hover:bg-[#B8955A] text-white px-12 h-16 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all duration-700">
                    Inscrever-se
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-10 group">
              <span className="font-serif text-[36px] tracking-tighter text-[#1C1C1A] transition-all duration-700 group-hover:text-[#B8955A]">
                <span className="text-[#B8955A] italic">F</span>ragranciaria
              </span>
            </Link>
            <p className="text-[#1C1C1A]/40 text-[10px] leading-relaxed mb-10 max-w-xs uppercase tracking-[0.2em] font-bold">
              A maior boutique de cosméticos profissionais de luxo do Brasil. Curadoria especializada para a saúde dos seus fios.
            </p>
            <div className="flex gap-8 text-[#1C1C1A]/40">
              <AtSign className="h-5 w-5 hover:text-[#B8955A] cursor-pointer transition-colors" />
              <Globe className="h-5 w-5 hover:text-[#B8955A] cursor-pointer transition-colors" />
              <Play className="h-5 w-5 hover:text-[#B8955A] cursor-pointer transition-colors" />
            </div>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#1C1C1A] mb-10">Explorar</h4>
            <ul className="space-y-5">
              {["Marcas", "Tratamentos", "Lançamentos", "Kits de Luxo", "Best Sellers", "Ritual IA"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-[#1C1C1A]/50 hover:text-[#B8955A] transition-colors font-bold">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#1C1C1A] mb-10">Boutique</h4>
            <ul className="space-y-5">
              {["Nossa História", "Distribuidor Oficial", "Consultoria Especializada", "Termos e Condições", "Privacidade", "Contato"].map(item => (
                <li key={item}>
                  <Link to="/" className="text-[10px] uppercase tracking-[0.2em] text-[#1C1C1A]/50 hover:text-[#B8955A] transition-colors font-bold">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#1C1C1A] mb-10">Suporte</h4>
            <div className="flex items-center gap-6 mb-8 group cursor-pointer">
              <div className="w-14 h-14 rounded-none bg-[#F8F6F2] flex items-center justify-center group-hover:bg-[#B8955A] group-hover:text-white transition-all duration-500">
                <MessageCircle className="h-5 w-5 stroke-[1.2]" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-[#1C1C1A]/30 font-bold mb-1">WhatsApp</p>
                <p className="text-sm font-bold text-[#1C1C1A] tracking-wider">(11) 99999-9999</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-6 pt-6 border-t border-black/[0.03]">
                <div className="flex items-center gap-4">
                    <ShieldCheck className="h-5 w-5 text-[#B8955A]" />
                    <span className="text-[9px] uppercase tracking-widest text-[#1C1C1A]/40 font-bold">Compra 100% Segura</span>
                </div>
                <div className="flex items-center gap-4">
                    <CheckCircle2 className="h-5 w-5 text-[#B8955A]" />
                    <span className="text-[9px] uppercase tracking-widest text-[#1C1C1A]/40 font-bold">Originalidade Garantida</span>
                </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-black/[0.03] flex flex-col lg:flex-row justify-between items-center gap-12">
          <div className="flex flex-wrap justify-center gap-10 items-center opacity-30">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold mr-4">Meios de Pagamento:</span>
            <div className="flex gap-8">
                <div className="text-[10px] font-black tracking-tighter">PIX</div>
                <div className="text-[10px] font-black tracking-tighter">VISA</div>
                <div className="text-[10px] font-black tracking-tighter">MASTER</div>
                <div className="text-[10px] font-black tracking-tighter">AMEX</div>
                <div className="text-[10px] font-black tracking-tighter">ELO</div>
            </div>
          </div>
          
          <div className="flex flex-col items-center lg:items-end gap-2">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#1C1C1A]/30 font-bold">
                © 2024 Fragranciaria Boutique. Todos os direitos reservados.
            </p>
            <p className="text-[8px] uppercase tracking-[0.2em] text-[#1C1C1A]/20 font-bold">
                CNPJ: 00.000.000/0001-00 | SÃO PAULO - SP
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
