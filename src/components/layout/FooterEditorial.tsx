import { Link } from "@tanstack/react-router";
import { BrandLogo } from "./BrandLogo";
import { useStoreConfig } from "@/lib/use-store-config";
import { whatsappLink, formatPhoneBR } from "@/lib/store-contact";

const FOOTER_LINKS = {
  shop: [
    // productType = valor EXATO de products.category (o filtro em /produtos é
    // igualdade de string). "Tratamento" e "Kit" no singular não existem no
    // banco e abriam listagem vazia; o real é plural.
    { label: "Tratamentos", href: "/produtos", search: { productType: "Tratamentos" } },
    { label: "Coloração", href: "/produtos", search: { productType: "Coloração" } },
    { label: "Kits", href: "/produtos", search: { productType: "Kits" } },
    { label: "Marcas", href: "/produtos" },
  ],
  support: [
    { label: "Política de Privacidade", href: "/privacidade" },
    { label: "Trocas e Devoluções", href: "/trocas" },
    { label: "Termos de Uso", href: "/termos" },
    { label: "Contato", href: "/contato" },
  ],
  partners: [
    { label: "Seja um afiliado", href: "/seja-afiliado" },
    { label: "Área do afiliado", href: "/afiliado/login" },
  ],
};

export function FooterEditorial() {
  const config = useStoreConfig();
  const contato = config?.contato;
  const horarios = config?.horarios;
  // null enquanto carrega ou se o número estiver vazio/inválido — nos dois
  // casos o link não renderiza, em vez de apontar para um wa.me quebrado.
  const waLink = whatsappLink(contato?.whatsapp);

  return (
    <footer className="bg-[#0F3A3E] text-white">
      {/* Nao ha faixa de selos aqui de proposito.
          Havia uma strip de 4 selos (Compra Segura / Produtos Autenticos /
          parcelamento / Frete Rastreavel) neste ponto, redundante com o
          <TrustBadges /> de 6 selos da home — que fica logo acima do rodape e
          diz as mesmas coisas com mais detalhe. Duas faixas parecidas
          empilhadas enfraquecem as duas. A faixa do Mercado Pago abaixo fica:
          ela nao repete selo, comunica o gateway. */}

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

      {/* Faixa de confiança — Mercado Pago.
          Elemento de marca FIXO: não passa por store_settings/use-store-config
          de propósito. O gateway não é dado editável, e um logo de terceiro que
          pisca junto com uma query seria pior que um estático.
          Fundo levemente mais escuro que o #0F3A3E do rodapé, sem bandeiras de
          cartão ao lado: o objetivo é o reconhecimento específico do Mercado
          Pago, não parecer checkout genérico. */}
      <div className="bg-[#0C2F32] border-y border-white/10">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-4">
          {/* Sem flex-wrap: no mobile o texto quebra em 2 linhas mas o logo
              continua À ESQUERDA dele, em vez de empilhar acima. */}
          <div className="flex items-center justify-center gap-3">
            <img
              src="/images/mercadopago-logo.png"
              // Decorativo: o texto ao lado já diz "Mercado Pago", então um alt
              // com o nome da marca faria o leitor de tela repetir.
              alt=""
              aria-hidden="true"
              className="h-5 w-auto shrink-0"
              width={284}
              height={74}
              loading="lazy"
            />
            <p className="text-[13px] text-white/70 text-center">
              Pagamento 100% seguro via Mercado Pago · Pix, cartão e boleto
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-16">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1">
            <BrandLogo variant="full" className="mb-6 h-16" />
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Curadoria profissional dos melhores cosméticos para cabelos.
            </p>
            {contato?.cnpj && (
              <p className="text-white/30 text-xs">
                CNPJ {contato.cnpj}
              </p>
            )}
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

          {/* Partners */}
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#E8C25A] mb-6">
              Parceiros
            </h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.partners.map((link) => (
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
              {/* Horários vêm da store_settings. NÃO são condicionados a
                  loja_aberta: aqui é horário de ATENDIMENTO, que existe com a
                  loja física fechada. Gatear em loja_aberta esvaziaria este
                  bloco hoje (loja_aberta = false) e o site perderia info que
                  já publica. Quem esconde horário com a loja fechada é a
                  LojaFisicaSection, onde o sentido é "venha à porta". */}
              {horarios?.semana && <li>Segunda a Sexta: {horarios.semana}</li>}
              {horarios?.sabado && <li>Sábado: {horarios.sabado}</li>}
              {contato?.email && (
                <li className="pt-2">
                  <a
                    href={`mailto:${contato.email}`}
                    className="hover:text-white transition-colors"
                  >
                    {contato.email}
                  </a>
                </li>
              )}
              {waLink && (
                <li>
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    WhatsApp: {formatPhoneBR(contato?.whatsapp)}
                  </a>
                </li>
              )}
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
