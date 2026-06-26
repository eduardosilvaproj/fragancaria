import { Link } from "@tanstack/react-router";

const FOOTER_LINKS = {
  shop: [
    { label: "Tratamentos", href: "/produtos", search: { productType: "Tratamento" } },
    { label: "Coloração", href: "/produtos", search: { productType: "Coloração" } },
    { label: "Kits", href: "/produtos", search: { productType: "Kit" } },
    { label: "Marcas", href: "/produtos" },
  ],
  support: [
    { label: "Rastrear Pedido", href: "/rastrear-pedido" },
    { label: "Política de Privacidade", href: "/privacidade" },
    { label: "Trocas e Devoluções", href: "/trocas" },
    { label: "Termos de Uso", href: "/termos" },
    { label: "Contato", href: "/contato" },
  ],
};

const TRUST_BADGES = [
  { icon: "⛉", label: "Compra Segura" },
  { icon: "✶", label: "Produtos Autênticos" },
  { icon: "◈", label: "Até 10x sem juros" },
  { icon: "➟", label: "Frete Rastreável" },
];

export function FooterEditorial() {
  return (
    <footer className="bg-[#0F3A3E] text-white">
      {/* Trust Badges Strip */}
      <div className="border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-3">
                <span className="text-[#E8C25A] text-lg">{badge.icon}</span>
                <span className="text-[12px] uppercase tracking-[0.12em] text-white/80 font-medium">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-16 md:py-20">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#E8C25A] mb-3">
                Newsletter Privée
              </p>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight mb-4">
                Convites exclusivos e lançamentos antecipados
              </h2>
              <p className="text-white/50 text-sm">
                Cadastre-se para receber promoções exclusivas e lançamentos em primeira mão.
              </p>
            </div>

            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                className="flex-1 px-5 py-4 bg-white/5 border border-white/20 text-white placeholder:text-white/40 text-sm outline-none focus:border-[#E8C25A] transition-colors"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-[#D4A12A] text-[#0F3A3E] text-[12px] uppercase tracking-[0.2em] font-semibold hover:bg-[#E8C25A] transition-colors"
              >
                Inscrever
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-16">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <img
              src="/images/logo.png"
              alt="Fragranciaria"
              className="h-16 w-auto mb-6 brightness-0 invert opacity-90"
            />
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Curadoria profissional dos melhores cosméticos para cabelos.
            </p>
            <p className="text-white/30 text-xs">
              CNPJ 20.590.412/0001-36
            </p>
          </div>

          {/* Shop Links */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#E8C25A] mb-6">
              Loja
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.shop.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    search={link.search}
                    className="text-white/60 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#E8C25A] mb-6">
              Suporte
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-white/60 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#E8C25A] mb-6">
              Atendimento
            </h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li>Segunda a Sexta</li>
              <li>9h às 18h</li>
              <li className="pt-2">
                <a
                  href="mailto:contato@fragranciaria.com.br"
                  className="hover:text-white transition-colors"
                >
                  contato@fragranciaria.com.br
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp: (11) 99999-9999
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-white/40">
            &copy; {new Date().getFullYear()} Fragranciaria. Todos os direitos reservados.
          </p>

          <p className="text-[12px] text-white/30">
            Produtos 100% originais · NF-e em todas as compras
          </p>
        </div>
      </div>
    </footer>
  );
}
