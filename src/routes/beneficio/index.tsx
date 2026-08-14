import { useState, useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Sparkles, Gift, ShieldCheck, Headset, BadgeCheck } from "lucide-react";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { resolveCoupon } from "@/lib/coupon-resolve.functions";
import { useServerFn } from "@tanstack/react-start";
import { trackEvent, trackPageView } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const COUPON_CODE = "BEMVINDO10";

export const Route = createFileRoute("/beneficio/")({
  head: () => ({
    meta: [
      { title: "Benefício Exclusivo | Fragranciaria" },
      { name: "description", content: "10% OFF na sua primeira compra na Fragranciaria. Produtos originais com nota fiscal e atendimento com a Fran." },
      { name: "robots", content: "noindex,follow" },
      { rel: "canonical", href: "https://fragranciaria.com/beneficio" },
    ],
    links: [],
  }),
  component: BeneficioPage,
});

function BeneficioPage() {
  useEffect(() => {
    trackPageView("/beneficio", "Benefício Exclusivo | Fragranciaria");
  }, []);
  const [activated, setActivated] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCoupon = useCheckoutStore((s) => s.setCoupon);
  const resolveCouponFn = useServerFn(resolveCoupon);

  const handleActivate = async () => {
    setError(null);
    try {
      // Valida o cupom NO SERVIDOR (resolveCoupon) e grava o que o servidor
      // devolveu no checkoutStore. Nunca monta value/type no cliente.
      const res = await resolveCouponFn({ data: { code: COUPON_CODE } });
      if (res.valid) {
        // Grava exatamente o que o servidor devolveu; não monta cupom no cliente.
        setCoupon({
          code: res.coupon.code,
          type: res.coupon.type,
          value: res.coupon.value,
          label: res.label,
        });
        setActivated(true);
        trackEvent("activate_benefit", "beneficio", res.coupon.code);
      } else {
        setError("Não foi possível ativar o benefício neste momento. Tente novamente.");
      }
    } catch {
      setError("Não foi possível ativar o benefício neste momento. Tente novamente.");
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      trackEvent("copy_coupon", "beneficio", COUPON_CODE);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para browsers sem clipboard API
      const ta = document.createElement("textarea");
      ta.value = COUPON_CODE;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#123E31] text-white">
        {/* Gradiente de fallback (sem imagem da Fran nos assets) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#123E31] via-[#16504F] to-[#1C6B4A]" />
        <div className="relative mx-auto max-w-[1280px] px-6 md:px-14 py-14 md:py-20">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <img
                src="/images/logo-editorial.png"
                alt="Fragranciaria"
                className="h-12 w-auto mb-8 brightness-0 invert opacity-90"
              />
              <p className="text-[#E8BD45] text-[12px] uppercase tracking-[0.2em] font-semibold mb-4">
                Seu benefício exclusivo
              </p>
              <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-6">
                10% OFF na sua <span className="text-[#E8BD45]">primeira compra</span>
              </h1>
              <p className="text-white/70 text-lg mb-8 max-w-md">
                Produtos originais, atendimento com a Fran e ofertas exclusivas do site.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleActivate}
                  className={cn(
                    "bg-[#E8BD45] text-[#123E31] font-semibold uppercase tracking-[0.14em] text-sm px-8 py-4 transition-all",
                    activated
                      ? "bg-[#1C6B4A] text-white"
                      : "hover:bg-[#F2CE6B]"
                  )}
                >
                  {activated ? "ESCOLHER MEUS PRODUTOS" : "ATIVAR MEUS 10% OFF"}
                </button>
                <Link
                  to="/produtos"
                  className="border border-white/30 text-white font-semibold uppercase tracking-[0.14em] text-sm px-8 py-4 text-center hover:bg-white/10 transition-colors"
                >
                  Ver produtos
                </Link>
              </div>
              {error && (
                <p className="mt-4 text-red-300 text-sm">{error}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3 Benefícios */}
      <section className="mx-auto max-w-[1280px] px-6 md:px-14 py-16">
        <h2 className="font-serif text-3xl md:text-4xl text-[#123E31] text-center mb-12">
          Por que comprar na Fragranciaria
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-[#123E31]/10 text-[#123E31]">
              <Gift className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl text-[#123E31] mb-2">Ofertas exclusivas</h3>
            <p className="text-[#51635F] text-sm leading-relaxed">
              Promoções e benefícios exclusivos que você não encontra em outros canais.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-[#123E31]/10 text-[#123E31]">
              <Headset className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl text-[#123E31] mb-2">Atendimento com a Fran</h3>
            <p className="text-[#51635F] text-sm leading-relaxed">
              Atendimento próximo e consultoria especializada para o seu cabelo.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-[#123E31]/10 text-[#123E31]">
              <BadgeCheck className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl text-[#123E31] mb-2">Produtos originais</h3>
            <p className="text-[#51635F] text-sm leading-relaxed">
              Produtos 100% originais das melhores marcas, com nota fiscal.
            </p>
          </div>
        </div>
      </section>

      {/* Bloco do cupom */}
      <section className="bg-[#123E31] text-white py-14">
        <div className="mx-auto max-w-[1280px] px-6 md:px-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl mb-4">
            Use o cupom no checkout
          </h2>
          <p className="text-white/70 mb-8">
            Copie o código e aplique na hora de finalizar sua compra.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="bg-white/10 border border-white/20 px-8 py-4 font-mono text-2xl tracking-widest">
              {COUPON_CODE}
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "flex items-center gap-2 font-semibold uppercase tracking-[0.14em] text-sm px-8 py-4 transition-all",
                copied
                  ? "bg-[#1C6B4A] text-white"
                  : "bg-[#E8BD45] text-[#123E31] hover:bg-[#F2CE6B]"
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Cupom copiado" : "Copiar cupom"}
            </button>
          </div>
        </div>
      </section>

      {/* Faixa de segurança (reaproveitada do FooterEditorial) */}
      <section className="bg-[#0C2F32] border-y border-white/10">
        <div className="mx-auto max-w-[1280px] px-6 md:px-14 py-4">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/images/mercadopago-logo.png"
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
      </section>

      {/* CTA final */}
      <section className="py-16 text-center px-6">
        <div className="mx-auto max-w-[1280px]">
          <h2 className="font-serif text-3xl md:text-4xl text-[#123E31] mb-4">
            Pronta para cuidar do seu cabelo?
          </h2>
          <p className="text-[#51635F] mb-8 max-w-md mx-auto">
            Ative seu benefício e escolha seus produtos favoritos.
          </p>
          <button
            onClick={handleActivate}
            className={cn(
              "bg-[#E8BD45] text-[#123E31] font-semibold uppercase tracking-[0.14em] text-sm px-10 py-4 transition-all",
              activated
                ? "bg-[#1C6B4A] text-white"
                : "hover:bg-[#F2CE6B]"
            )}
          >
            {activated ? "ESCOLHER MEUS PRODUTOS" : "ATIVAR MEUS 10% OFF"}
          </button>
        </div>
      </section>

      {/* CTA fixo discreto no mobile após rolagem */}
      <div
        className="fixed bottom-0 left-0 right-0 md:hidden z-40 pointer-events-none"
        style={{ pointerEvents: "none" }}
      >
        <div className="pointer-events-auto mx-4 mb-4">
          <button
            onClick={handleActivate}
            className={cn(
              "w-full bg-[#E8BD45] text-[#123E31] font-semibold uppercase tracking-[0.14em] text-sm py-4 shadow-lg transition-all",
              activated
                ? "bg-[#1C6B4A] text-white"
                : "hover:bg-[#F2CE6B]"
            )}
          >
            {activated ? "ESCOLHER MEUS PRODUTOS" : "ATIVAR MEUS 10% OFF"}
          </button>
        </div>
      </div>

      {/* Spacer para não cobrir o conteúdo no mobile */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
