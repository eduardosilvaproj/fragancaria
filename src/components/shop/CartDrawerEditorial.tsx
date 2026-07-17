import { useCartStore } from "@/stores/cartStore";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Trash2, X } from "lucide-react";

// O drawer é um preview do carrinho: mostra itens e subtotal, mas NÃO calcula
// frete nem desconto. Frete e cupom são decididos no checkout.

export const CartDrawerEditorial = () => {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, getTotalPrice } = useCartStore();

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getTotalPrice();

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
                    {/* Vendor */}
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#B07B1E] font-medium mb-1">
                      {item.vendor}
                    </p>

                    {/* Title */}
                    <h4 className="font-serif text-[15px] text-[#0F3A3E] leading-tight mb-2 line-clamp-2">
                      {item.title}
                    </h4>

                    {item.variationName && (
                      <p className="text-[11px] text-[#75827E] mb-1">
                        Variação: {item.variationName}
                      </p>
                    )}

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

              {/* Resumo: subtotal + aviso de que frete/desconto vêm do checkout */}
              <div className="mt-2 pt-5 border-t border-[#E0D8C7]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-[#51635F]">Subtotal</span>
                  <span className="text-[15px] text-[#0F3A3E]">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p className="text-[12px] text-[#75827E]">
                  Frete e descontos calculados no checkout
                </p>
              </div>

              {/* Continuar Comprando */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-[12px] text-[#51635F] hover:text-[#0F3A3E] transition-colors mt-4"
              >
                Continuar Comprando
              </button>

              {/* Trust */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#E0D8C7]">
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

        {/* Footer fixo: Subtotal + botão CTA sempre visível (não rola). */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E0D8C7] bg-[#F8F4EA]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] font-medium text-[#0F3A3E]">Subtotal</span>
              <span className="font-serif text-[24px] text-[#0F3A3E]">
                {formatPrice(subtotal)}
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
