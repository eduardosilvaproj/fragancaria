import { useState } from "react";
import { Shield, Award, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import {
  calculateDiscount,
  calculateOrderTotal,
  applyCouponToShipping,
} from "@/lib/commerce-config";
import { resolveCoupon } from "@/lib/coupon-resolve.functions";
import { couponRejectionMessage } from "@/lib/coupon-messages";
import { MAX_INSTALLMENTS } from "@/config/mercadopago";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CheckoutSummary() {
  const { items, getTotalPrice } = useCartStore();
  const { shippingPrice, quoteStatus, paymentMethod, coupon, setCoupon } = useCheckoutStore();
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);

  const subtotal = getTotalPrice();
  // free_shipping zera o frete; os outros tipos não mexem nele — mesma função
  // que o servidor usa, para a tela mostrar o total que será cobrado.
  const shipping = applyCouponToShipping(shippingPrice, coupon);
  const discount = calculateDiscount(subtotal, { coupon, paymentMethod });
  const total = calculateOrderTotal({ subtotal, shipping, discount });
  const installmentValue = total / MAX_INSTALLMENTS;

  const applyCoupon = async () => {
    const key = code.trim().toUpperCase();
    if (!key) return;
    setApplying(true);
    try {
      // Valida contra a tabela no servidor (existe? ativo? validade? mínimo?).
      // O servidor revalida tudo de novo no pagamento — aqui é só feedback.
      const res = await resolveCoupon({
        data: { code: key, subtotal, alreadyFreeShipping: shippingPrice === 0 },
      });
      if (res.valid) {
        setCoupon({
          code: res.coupon.code,
          type: res.coupon.type,
          value: res.coupon.value,
          label: res.label,
        });
        toast.success(`Cupom ${res.coupon.code} aplicado!`);
        setCode("");
      } else {
        toast.error(couponRejectionMessage(res.reason));
      }
    } catch {
      toast.error("Não foi possível validar o cupom. Tente de novo.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <aside className="bg-white border border-[#E9E1D2] p-6 lg:sticky lg:top-6 h-fit">
      <h2 className="font-serif text-xl text-[#0F3A3E] mb-5">Resumo do Pedido</h2>

      <div className="space-y-4 max-h-72 overflow-y-auto pr-1 mb-5">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <div className="w-16 h-20 bg-[#F3EEE3] flex-shrink-0">
              {item.image && (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#B07B1E] font-semibold">
                {item.vendor}
              </p>
              <p className="font-serif text-sm text-[#0F3A3E] leading-tight line-clamp-2">
                {item.title}
              </p>
              {item.variationName && (
                <p className="text-[11px] text-[#75827E] mt-0.5">{item.variationName}</p>
              )}
              <div className="flex justify-between items-center mt-1 text-xs text-[#51635F]">
                <span>Qtd: {item.quantity}</span>
                <span className="font-semibold text-[#0F3A3E]">
                  {formatBRL(item.price * item.quantity)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#E9E1D2] pt-4 mb-4">
        {coupon ? (
          <div className="flex items-center justify-between bg-[#F3EEE3] px-3 py-2 mb-2">
            <div className="flex items-center gap-2 text-xs">
              <Tag className="w-4 h-4 text-[#1C6B4A]" />
              <span className="font-semibold text-[#0F3A3E]">{coupon.code}</span>
              <span className="text-[#1C6B4A]">{coupon.label}</span>
            </div>
            <button onClick={() => setCoupon(null)} aria-label="Remover cupom">
              <X className="w-4 h-4 text-[#51635F]" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Cupom de desconto"
              className="flex-1 border border-[#E9E1D2] px-3 py-2 text-sm focus:outline-none focus:border-[#B07B1E]"
            />
            <button
              onClick={applyCoupon}
              disabled={applying || !code.trim()}
              className="bg-[#0F3A3E] text-white px-4 text-[11px] uppercase tracking-wider font-semibold hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {applying ? "..." : "Aplicar"}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm border-t border-[#E9E1D2] pt-4">
        <Row label="Subtotal" value={formatBRL(subtotal)} />
        <Row
          label="Frete"
          value={
            quoteStatus === "success"
              ? shipping === 0
                ? "Grátis"
                : formatBRL(shipping)
              : "A calcular"
          }
        />
        {discountCoupon > 0 && (
          <Row label="Desconto cupom" value={`- ${formatBRL(discountCoupon)}`} positive />
        )}
        {pixDiscount > 0 && (
          <Row label="Desconto PIX (5%)" value={`- ${formatBRL(pixDiscount)}`} positive />
        )}
      </div>

      <div className="flex justify-between items-baseline border-t border-[#E9E1D2] mt-4 pt-4">
        <span className="text-sm uppercase tracking-wider text-[#0F3A3E]">Total</span>
        <span className="font-serif text-2xl text-[#0F3A3E]">{formatBRL(total)}</span>
      </div>
      {/* Estimativa (total/N). O valor exato, com eventual juro, e o que o
          Mercado Pago devolve na etapa de pagamento. */}
      <p className="text-xs text-[#51635F] text-right mt-1">
        em até {MAX_INSTALLMENTS}x no cartão, a partir de {formatBRL(installmentValue)}/mês
      </p>

      <div className="mt-6 pt-5 border-t border-[#E9E1D2] space-y-2">
        <div className="flex items-center gap-2 text-xs text-[#51635F]">
          <Shield className="w-4 h-4 text-[#1C6B4A]" /> Compra 100% segura
        </div>
        <div className="flex items-center gap-2 text-xs text-[#51635F]">
          <Award className="w-4 h-4 text-[#1C6B4A]" /> Produtos originais
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#51635F]">{label}</span>
      <span className={positive ? "text-[#1C6B4A] font-semibold" : "text-[#0F3A3E]"}>{value}</span>
    </div>
  );
}
