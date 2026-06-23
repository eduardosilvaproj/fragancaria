import { Link } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, CheckCircle2, Mail } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { toast } from "sonner";

// TODO: Substituir pelos dados reais da empresa
const COMPANY_INFO = {
  whatsapp: "", // Deixar vazio até ter número real
  whatsappFormatted: "", // Ex: "(11) 99999-9999"
  cnpj: "20.590.412/0001-36",
  instagram: "", // Ex: "fragranciaria"
  youtube: "", // Ex: "fragranciaria"
};

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }

    if (!optIn) {
      toast.error("Você precisa concordar com a Política de Privacidade");
      return;
    }

    // TODO: Integrar com Shopify/Klaviyo
    toast.success("E-mail cadastrado com sucesso!", {
      description: "Você receberá nossas novidades em breve."
    });
    setEmail("");
    setOptIn(false);
  };

  return (
    <footer className="bg-[#0F3A3E] pt-32 pb-12">
      <div className="container mx-auto px-4 md:px-12">
        {/* Newsletter Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 pb-24 border-b border-white/10 mb-24">
          <div>
            <h3 className="font-serif text-4xl mb-6 font-light text-white">Newsletter <span className="italic text-[#B07B1E]">Privée</span></h3>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 font-bold max-w-md leading-relaxed">
              Assine para receber convites exclusivos, lançamentos antecipados e curadoria de rituais profissionais.
            </p>
          </div>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-[#B07B1E]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="SEU MELHOR E-MAIL"
                  className="w-full bg-[#16504F] border-none h-16 pl-16 pr-6 text-[10px] uppercase tracking-[0.2em] font-bold outline-none focus:ring-1 focus:ring-[#B07B1E]/30 transition-all text-white placeholder:text-white/30"
                />
              </div>
              <Button
                type="submit"
                className="bg-[#B07B1E] hover:bg-white text-[#0F3A3E] hover:text-[#0F3A3E] px-12 h-16 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all duration-700"
              >
                Inscrever-se
              </Button>
            </div>
            {/* Opt-in LGPD */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#B07B1E] cursor-pointer"
              />
              <span className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-bold leading-relaxed group-hover:text-white/60 transition-colors">
                Concordo em receber comunicações da Fragranciaria e aceito a{" "}
                <Link to="/privacidade" className="text-[#B07B1E] hover:underline">
                  Política de Privacidade
                </Link>
              </span>
            </label>
          </form>
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
              Boutique de cosméticos capilares profissionais. Curadoria especializada para a saúde dos seus fios.
            </p>
            {/* Redes sociais - TODO: adicionar quando configuradas */}
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B07B1E] mb-10">Explorar</h4>
            <ul className="space-y-5">
              <li>
                <Link to="/produtos" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#B07B1E] transition-colors font-bold">
                  Todos os Produtos
                </Link>
              </li>
              <li>
                <Link to="/produtos" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#B07B1E] transition-colors font-bold">
                  Tratamentos
                </Link>
              </li>
              <li>
                <Link to="/produtos" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#B07B1E] transition-colors font-bold">
                  Kits
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B07B1E] mb-10">Institucional</h4>
            <ul className="space-y-5">
              <li>
                <Link to="/termos" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#B07B1E] transition-colors font-bold">
                  Termos e Condições
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#B07B1E] transition-colors font-bold">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/trocas" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#B07B1E] transition-colors font-bold">
                  Trocas e Devoluções
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-[#B07B1E] transition-colors font-bold">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B07B1E] mb-10">Suporte</h4>

            {/* WhatsApp - mostrar apenas se configurado */}
            {COMPANY_INFO.whatsapp && (
              <div className="flex items-center gap-6 mb-8 group cursor-pointer">
                <div className="w-14 h-14 rounded-none bg-[#16504F] flex items-center justify-center group-hover:bg-[#B07B1E] transition-all duration-500 text-white group-hover:text-[#0F3A3E]">
                  <MessageCircle className="h-5 w-5 stroke-[1.2]" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold mb-1">WhatsApp</p>
                  <a
                    href={`https://wa.me/${COMPANY_INFO.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-white tracking-wider hover:text-[#B07B1E] transition-colors"
                  >
                    {COMPANY_INFO.whatsappFormatted}
                  </a>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-4">
                <ShieldCheck className="h-5 w-5 text-[#B07B1E]" />
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Compra 100% Segura</span>
              </div>
              <div className="flex items-center gap-4">
                <CheckCircle2 className="h-5 w-5 text-[#B07B1E]" />
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Produtos Originais</span>
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
              © {currentYear} Fragranciaria. Todos os direitos reservados.
            </p>
            {COMPANY_INFO.cnpj && (
              <p className="text-[8px] uppercase tracking-[0.2em] text-white/20 font-bold">
                CNPJ: {COMPANY_INFO.cnpj}
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
