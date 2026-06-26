import { useCartStore } from "@/stores/cartStore";
import { useCouponStore, formatCouponDiscount } from "@/stores/couponStore";
import { useCheckoutStore } from "@/stores/checkoutStore";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Trash2, X, Tag, Check, Truck, Loader2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const FREE_SHIPPING_THRESHOLD = 199;

// Tabela de frete por região (primeiro dígito do CEP)
const TABELA_FRETE: Record<string, { pac: number; sedex: number; prazoPac: number; prazoSedex: number }> = {
  "0": { pac: 19.90, sedex: 32.90, prazoPac: 5, prazoSedex: 2 },
  "1": { pac: 16.90, sedex: 26.90, prazoPac: 3, prazoSedex: 1 },
  "2": { pac: 26.90, sedex: 42.90, prazoPac: 7, prazoSedex: 3 },
  "3": { pac: 24.90, sedex: 39.90, prazoPac: 6, prazoSedex: 3 },
  "4": { pac: 34.90, sedex: 56.90, prazoPac: 10, prazoSedex: 4 },
  "5": { pac: 38.90, sedex: 62.90, prazoPac: 12, prazoSedex: 5 },
  "6": { pac: 42.90, sedex: 68.90, prazoPac: 14, prazoSedex: 6 },
  "7": { pac: 38.90, sedex: 62.90, prazoPac: 12, prazoSedex: 5 },
  "8": { pac: 28.90, sedex: 45.90, prazoPac: 7, prazoSedex: 3 },
  "9": { pac: 32.90, sedex: 52.90, prazoPac: 8, prazoSedex: 4 },
};

interface FreteOption {
  id: string;
  name: string;
  price: number;
  days: number;
}

export const CartDrawerEditorial = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const { appliedCoupon, error: couponError, applyCoupon, removeCoupon, calculateDiscount } = useCouponStore();
  const { shippingPrice, setShippingPrice } = useCheckoutStore();
  const [couponCode, setCouponCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  // Estado do cálculo de frete
  const [cep, setCep] = useState("");
  const [cepCalculado, setCepCalculado] = useState("");
  const [freteOptions, setFreteOptions] = useState<FreteOption[]>([]);
  const [selectedFrete, setSelectedFrete] = useState<string | null>(null);
  const [loadingFrete, setLoadingFrete] = useState(false);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getTotalPrice();
  const discount = calculateDiscount(subtotal);
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const hasFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  // Calcular total com frete
  const freteValue = hasFreeShipping ? 0 : (shippingPrice || 0);
  const total = subtotal - discount + freteValue;

  // Quando muda frete grátis, resetar frete selecionado
  useEffect(() => {
    if (hasFreeShipping) {
      setShippingPrice(0);
      setSelectedFrete(null);
    }
  }, [hasFreeShipping, setShippingPrice]);

  const maskCep = (v: string) =>
    v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

  const calcularFrete = () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      toast.error("CEP inválido");
      return;
    }

    setLoadingFrete(true);

    // Simular delay de API
    setTimeout(() => {
      const regiao = digits[0];
      const precos = TABELA_FRETE[regiao] || TABELA_FRETE["1"];

      const options: FreteOption[] = [
        { id: "pac", name: "PAC", price: precos.pac, days: precos.prazoPac },
        { id: "sedex", name: "SEDEX", price: precos.sedex, days: precos.prazoSedex },
      ];

      setFreteOptions(options);
      setCepCalculado(digits);
      setLoadingFrete(false);

      // Auto-selecionar o mais barato
      setSelectedFrete("pac");
      setShippingPrice(precos.pac);
    }, 800);
  };

  const handleSelectFrete = (option: FreteOption) => {
    setSelectedFrete(option.id);
    setShippingPrice(option.price);
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;

    setIsApplying(true);
    const success = applyCoupon(couponCode, subtotal);

    setTimeout(() => {
      setIsApplying(false);
      if (success) {
        toast.success("Cupom aplicado com sucesso!");
        setCouponCode("");
      } else {
        toast.error(couponError || "Cupom inválido");
      }
    }, 500);
  };

  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success("Cupom removido");
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

        {/* Free Shipping Progress */}
        {items.length > 0 && (
          <div className="px-6 py-4 bg-[#F8F4EA] border-b border-[#E0D8C7]">
            {hasFreeShipping ? (
              <div className="flex items-center gap-2 text-[#1c6b4a]">
                <Check className="h-4 w-4" />
                <span className="text-[13px] font-medium">Você ganhou frete grátis!</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-[#B07B1E]" />
                  <span className="text-[12px] text-[#51635F]">
                    Faltam <strong className="text-[#0F3A3E]">{formatPrice(remainingForFreeShipping)}</strong> para frete grátis
                  </span>
                </div>
                <div className="h-1.5 bg-[#E0D8C7] overflow-hidden">
                  <div
                    className="h-full bg-[#B07B1E] transition-all duration-500"
                    style={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

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
                    {/* Vendor */}
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#B07B1E] font-medium mb-1">
                      {item.vendor}
                    </p>

                    {/* Title */}
                    <h4 className="font-serif text-[15px] text-[#0F3A3E] leading-tight mb-2 line-clamp-2">
                      {item.title}
                    </h4>

                    {/* Price */}
                    <p className="text-[15px] font-medium text-[#0F3A3E] mb-3">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity & Remove */}
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
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-6 border-t border-[#E0D8C7] bg-[#F8F4EA]">
            {/* Coupon Section */}
            <div className="mb-5 pb-5 border-b border-[#E0D8C7]">
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-[#1c6b4a]/10 px-3 py-2.5 border border-[#1c6b4a]/20">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-[#1c6b4a]" />
                    <span className="text-[13px] text-[#1c6b4a] font-medium">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-[11px] text-[#1c6b4a]/80">
                      ({formatCouponDiscount(appliedCoupon)})
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-[11px] text-[#C4433A] hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9AA39F]" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Código do cupom"
                      className="w-full pl-10 pr-3 py-2.5 text-[13px] bg-white border border-[#E0D8C7] focus:border-[#0F3A3E] focus:outline-none placeholder:text-[#9AA39F]"
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    />
                  </div>
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isApplying || !couponCode.trim()}
                    className="px-4 py-2.5 bg-[#0F3A3E] text-white text-[11px] uppercase tracking-[0.1em] font-semibold hover:bg-[#16504F] disabled:bg-[#C4BBA8] disabled:cursor-not-allowed transition-colors"
                  >
                    {isApplying ? "..." : "Aplicar"}
                  </button>
                </div>
              )}
              {couponError && !appliedCoupon && (
                <p className="text-[11px] text-[#C4433A] mt-2">{couponError}</p>
              )}
            </div>

            {/* Shipping Calculator */}
            {!hasFreeShipping && (
              <div className="mb-5 pb-5 border-b border-[#E0D8C7]">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-[#B07B1E]" />
                  <span className="text-[13px] font-medium text-[#0F3A3E]">Calcular Frete</span>
                </div>

                {!cepCalculado ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(maskCep(e.target.value))}
                      placeholder="00000-000"
                      className="flex-1 px-3 py-2.5 text-[13px] bg-white border border-[#E0D8C7] focus:border-[#0F3A3E] focus:outline-none placeholder:text-[#9AA39F]"
                      onKeyDown={(e) => e.key === "Enter" && calcularFrete()}
                    />
                    <button
                      onClick={calcularFrete}
                      disabled={loadingFrete || cep.replace(/\D/g, "").length !== 8}
                      className="px-4 py-2.5 bg-[#0F3A3E] text-white text-[11px] uppercase tracking-[0.1em] font-semibold hover:bg-[#16504F] disabled:bg-[#C4BBA8] disabled:cursor-not-allowed transition-colors"
                    >
                      {loadingFrete ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[12px] text-[#51635F] mb-2">
                      <span>CEP: {maskCep(cepCalculado)}</span>
                      <button
                        onClick={() => {
                          setCepCalculado("");
                          setFreteOptions([]);
                          setSelectedFrete(null);
                          setShippingPrice(0);
                        }}
                        className="text-[#B07B1E] hover:underline"
                      >
                        Alterar
                      </button>
                    </div>
                    {freteOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between p-3 border cursor-pointer transition-all ${
                          selectedFrete === option.id
                            ? "border-[#B07B1E] bg-[#F3EEE3]"
                            : "border-[#E0D8C7] hover:border-[#B07B1E]/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="frete"
                            checked={selectedFrete === option.id}
                            onChange={() => handleSelectFrete(option)}
                            className="w-4 h-4 accent-[#B07B1E]"
                          />
                          <div>
                            <span className="text-[13px] font-medium text-[#0F3A3E]">{option.name}</span>
                            <span className="text-[11px] text-[#51635F] ml-2">
                              {option.days} {option.days === 1 ? "dia útil" : "dias úteis"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[13px] font-medium text-[#0F3A3E]">
                          {formatPrice(option.price)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#51635F]">Subtotal</span>
                <span className="text-[15px] text-[#0F3A3E]">
                  {formatPrice(subtotal)}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-[#1c6b4a]">
                  <span className="text-[13px]">Desconto ({appliedCoupon?.code})</span>
                  <span className="text-[15px] font-medium">
                    -{formatPrice(discount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#51635F]">Frete</span>
                <span className="text-[13px] text-[#51635F]">
                  {hasFreeShipping ? (
                    <span className="text-[#1c6b4a] font-medium">Grátis</span>
                  ) : freteValue > 0 ? (
                    <span className="text-[#0F3A3E] font-medium">{formatPrice(freteValue)}</span>
                  ) : (
                    "Calcule acima"
                  )}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between py-3 border-t border-[#E0D8C7]">
              <span className="text-[14px] font-medium text-[#0F3A3E]">Total</span>
              <span className="font-serif text-[24px] text-[#0F3A3E]">
                {formatPrice(total)}
              </span>
            </div>

            {/* Checkout Button */}
            <Link
              to="/checkout"
              onClick={() => setIsOpen(false)}
              className="block w-full bg-[#0F3A3E] text-white py-4 text-center text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] transition-colors mt-4 mb-3"
            >
              Finalizar Compra
            </Link>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-center text-[12px] text-[#51635F] hover:text-[#0F3A3E] transition-colors"
            >
              Continuar Comprando
            </button>

            {/* Trust */}
            <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-[#E0D8C7]">
              <span className="text-[10px] text-[#9AA39F] uppercase tracking-wider">
                Pagamento Seguro
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 border border-[#C4BBA8] text-[#75827E]">PIX</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 border border-[#C4BBA8] text-[#75827E]">VISA</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 border border-[#C4BBA8] text-[#75827E]">MC</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
