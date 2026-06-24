import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { Truck, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CheckoutSummary() {
  const { items } = useCartStore();
  const { shippingMethod, coupon, setCoupon } = useCheckoutStore();
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = shippingMethod?.price || 0;

  // Calcular desconto
  let discount = 0;
  if (coupon) {
    if (coupon.type === 'percentage') {
      discount = subtotal * (coupon.discount / 100);
    } else {
      discount = coupon.discount;
    }
  }

  const total = subtotal + shippingCost - discount;

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);

    // Simular validação de cupom
    await new Promise((r) => setTimeout(r, 500));

    // Cupom de exemplo
    if (couponCode.toUpperCase() === "BEMVINDO10") {
      setCoupon({
        code: couponCode.toUpperCase(),
        discount: 10,
        type: "percentage",
      });
      toast.success("Cupom aplicado! 10% de desconto");
    } else if (couponCode.toUpperCase() === "FRETE") {
      setCoupon({
        code: couponCode.toUpperCase(),
        discount: shippingCost,
        type: "fixed",
      });
      toast.success("Cupom de frete grátis aplicado!");
    } else {
      toast.error("Cupom inválido ou expirado");
    }

    setIsApplyingCoupon(false);
    setCouponCode("");
  };

  const removeCoupon = () => {
    setCoupon(null);
    toast.success("Cupom removido");
  };

  return (
    <div className="bg-white border border-[#E9E1D2] p-6 sticky top-24">
      <h3 className="font-serif text-xl text-[#0F3A3E] mb-6">Resumo do Pedido</h3>

      {/* Itens */}
      <div className="space-y-4 max-h-[280px] overflow-y-auto mb-6">
        {items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <img
              src={item.image}
              alt={item.title}
              className="w-16 h-16 object-cover bg-[#F8F4EA]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#0F3A3E] font-medium line-clamp-2">
                {item.title}
              </p>
              <p className="text-xs text-[#75827E] mt-1">
                Qtd: {item.quantity}
              </p>
              <p className="text-sm text-[#0F3A3E] font-medium mt-1">
                {formatPrice(item.price * item.quantity)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Cupom */}
      <div className="border-t border-[#E9E1D2] pt-4 mb-4">
        {coupon ? (
          <div className="flex items-center justify-between bg-[#F8F4EA] p-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#1C6B4A]" />
              <span className="text-sm font-medium text-[#1C6B4A]">
                {coupon.code}
              </span>
            </div>
            <button
              onClick={removeCoupon}
              className="text-xs text-[#B07B1E] hover:text-[#8B5A00] transition-colors"
            >
              Remover
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Código do cupom"
              className="flex-1 px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E] transition-colors"
            />
            <button
              onClick={handleApplyCoupon}
              disabled={isApplyingCoupon || !couponCode.trim()}
              className="px-4 py-2 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isApplyingCoupon ? "..." : "Aplicar"}
            </button>
          </div>
        )}
      </div>

      {/* Totais */}
      <div className="border-t border-[#E9E1D2] pt-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[#51635F]">Subtotal</span>
          <span className="text-[#0F3A3E]">{formatPrice(subtotal)}</span>
        </div>

        {shippingMethod && (
          <div className="flex justify-between text-sm">
            <span className="text-[#51635F] flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {shippingMethod.name}
            </span>
            <span className="text-[#0F3A3E]">
              {shippingMethod.price === 0 ? "Grátis" : formatPrice(shippingMethod.price)}
            </span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[#1C6B4A]">Desconto</span>
            <span className="text-[#1C6B4A]">-{formatPrice(discount)}</span>
          </div>
        )}

        <div className="flex justify-between pt-3 border-t border-[#E9E1D2]">
          <span className="font-serif text-lg text-[#0F3A3E]">Total</span>
          <span className="font-serif text-2xl text-[#0F3A3E]">
            {formatPrice(total)}
          </span>
        </div>

        <p className="text-xs text-[#75827E] text-center">
          ou até 10x de {formatPrice(total / 10)} sem juros
        </p>
      </div>

      {/* Trust badges */}
      <div className="mt-6 pt-4 border-t border-[#E9E1D2] flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-[11px] text-[#75827E]">
          <span>🔒</span>
          Compra segura
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[#75827E]">
          <span>✓</span>
          Produto original
        </div>
      </div>
    </div>
  );
}
