import { useState } from "react";
import { useCartStore } from "@/stores/cartStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Trash2, X, Tag, Check, Loader2 } from "lucide-react";
import { CartComplements } from "./CartComplements";
import { resolveCoupon } from "@/lib/coupon-resolve.functions";
import { couponRejectionMessage } from "@/lib/coupon-messages";
import { calculateDiscount, calculateOrderTotal } from "@/lib/commerce-config";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const CartDrawerEditorial = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const { coupon, setCoupon } = useCheckoutStore();
  const [couponCode, setCouponCode] = useState("");
  const [applying, setApplying] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getTotalPrice();

  // Cálculo de desconto provisório (sem considerar método de pagamento no drawer,
  // pois o usuário só escolhe no checkout).
  const discount = calculateDiscount(subtotal, { coupon });
  const total = calculateOrderTotal({ subtotal, shipping: 0, discount });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    try {
      const res = await resolveCoupon({
        data: { code: couponCode.trim(), subtotal },
      });
      if (res.valid) {
        setCoupon({
          code: res.coupon.code,
          type: res.coupon.type,
          value: res.coupon.value,
          label: res.label,
        });
        toast.success(`Cupom ${res.coupon.code} aplicado!`);
        setCouponCode("");
      } else {
        toast.error(couponRejectionMessage(res.reason));
      }
    } catch (e) {
      toast.error("Erro ao aplicar cupom");
    } finally {
      setApplying(false);
    }
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-[#F3EEE3] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0D8C7]">
          <h2 className="font-serif text-[22px] text-[#0F3A3E]">
            Sua Sacola <span className="text-[#75827E] text-[16px]">({totalItems})</span>
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#E9E1D2] transition-colors"
          >
            <X className="h-5 w-5 text-[#0F3A3E]" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <ShoppingBag className="h-14 w-14 text-[#C4BBA8] mb-4" strokeWidth={1} />
              <p className="font-serif text-[18px] text-[#0F3A3E] mb-2">
                Sua sacola está vazia
              </p>
              <p className="text-[14px] text-[#75827E] mb-6">
                Adicione produtos para continuar
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[12px] uppercase tracking-[0.14em] text-[#0F3A3E] border-b border-[#B07B1E] pb-1 hover:text-[#B07B1E] transition-colors"
              >
                Continuar Comprando
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-6 border-b border-[#E9E1D2] last:border-0">
                  {/* Image */}
                  <div className="w-[90px] h-[110px] bg-white border border-[#E9E1D2] flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#B07B1E] font-medium mb-1">
                      {item.vendor}
                    </p>
                    <h4 className="font-serif text-[15px] text-[#0F3A3E] leading-tight mb-2 line-clamp-2">
                      {item.title}
                    </h4>
                    {item.variationName && (
                      <p className="text-[11px] text-[#75827E] mb-1">
                        Variação: {item.variationName}
                      </p>
                    )}
                    <p className="text-[15px] font-medium text-[#0F3A3E] mb-3">
                      {formatPrice(item.price)}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center border border-[#E0D8C7] bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#F8F4EA] transition-colors"
                        >
                          <Minus className="h-3 w-3 text-[#0F3A3E]" />
                        </button>
                        <span className="w-8 text-center text-[13px] text-[#0F3A3E] font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#F8F4EA] transition-colors"
                        >
                          <Plus className="h-3 w-3 text-[#0F3A3E]" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[#9AA39F] hover:text-[#C4433A] transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <CartComplements variant="drawer" />

              {/* Cupom + Resumo */}
              <div className="mt-2 pt-5 border-t border-[#E0D8C7]">
                <div className="mb-4">
                  <label className="text-[11px] uppercase tracking-[0.18em] text-[#51635F] font-semibold mb-2 block">
                    Cupom de desconto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Código do cupom"
                      disabled={!!coupon || applying}
                      className="flex-1 bg-white border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#B07B1E] disabled:bg-[#F5F3EE]"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!!coupon || applying || !couponCode.trim()}
                      className="px-4 py-2 bg-[#0F3A3E] text-white text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#16504F] transition-colors disabled:opacity-50"
                    >
                      {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : coupon ? <Check className="h-4 w-4" /> : "Aplicar"}
                    </button>
                  </div>
                  {coupon && (
                    <div className="mt-2 flex items-center justify-between text-[#1c6b4a] text-xs font-medium">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" /> Cupom {coupon.code} aplicado
                      </span>
                      <button onClick={() => setCoupon(null)} className="text-[#c4433a] hover:underline">
                        Remover
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-[#51635F]">Subtotal</span>
                    <span className="text-[15px] text-[#0F3A3E]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-[#1c6b4a]">
                        Desconto ({coupon?.label})
                      </span>
                      <span className="text-[15px] text-[#1c6b4a]">
                        −{formatPrice(discount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E9E1D2]">
                    <span className="text-[13px] font-medium text-[#0F3A3E]">Total</span>
                    <span className="text-[15px] font-semibold text-[#0F3A3E]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
                <p className="text-[12px] text-[#75827E] mt-2">
                  Frete calculado no checkout
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E0D8C7] bg-[#F8F4EA]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-medium text-[#0F3A3E]">Total</span>
              <span className="font-serif text-[24px] text-[#0F3A3E]">
                {formatPrice(total)}
              </span>
            </div>
            <Link
              to="/checkout"
              onClick={() => setIsOpen(false)}
              className="block w-full bg-[#0F3A3E] text-white py-4 text-center text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] transition-colors"
            >
              Finalizar Compra
            </Link>
          </div>
        )}
      </div>
    </>
  );
};
