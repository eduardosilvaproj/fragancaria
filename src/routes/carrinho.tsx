import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";
import { useCartStore } from "@/stores/cartStore";
import { useProducts } from "@/hooks/useProducts";
import { useState, useMemo } from "react";
import { Minus, Plus, Trash2, ShoppingBag, Truck, Shield, Tag } from "lucide-react";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho | Fragranciaria" },
    ],
  }),
  component: CarrinhoPage,
});

function CarrinhoPage() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const subtotal = getTotalPrice();
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const shipping = subtotal >= 199 ? 0 : 19.90;
  const total = subtotal - discount + shipping;

  const handleApplyCoupon = () => {
    if (couponCode.toLowerCase() === "frag10") {
      setCouponApplied(true);
    }
  };

  // Produtos sugeridos
  const { products } = useProducts();
  const suggestedProducts = useMemo(() => {
    return products.filter(p => p.featured).slice(0, 4);
  }, [products]);

  return (
    <div className="min-h-screen bg-[#F3EEE3] font-sans">
      <NavbarEditorial />

      {/* Breadcrumb */}
      <div className="bg-[#F3EEE3] border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-4">
          <nav className="text-[12px] text-[#75827E]">
            <Link to="/" className="hover:text-[#0F3A3E] transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#0F3A3E]">Carrinho</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className="bg-[#F3EEE3] border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-10">
          <h1 className="font-serif text-[36px] md:text-[48px] text-[#0F3A3E]">
            Seu Carrinho
          </h1>
          <p className="text-[#75827E] text-[15px] mt-2">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-12">
        {items.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <ShoppingBag className="h-20 w-20 text-[#C4BBA8] mx-auto mb-6" strokeWidth={1} />
            <h2 className="font-serif text-[28px] text-[#0F3A3E] mb-3">
              Seu carrinho está vazio
            </h2>
            <p className="text-[#75827E] text-[15px] mb-8 max-w-md mx-auto">
              Parece que você ainda não adicionou nenhum produto ao carrinho. Explore nossa coleção e encontre os melhores produtos para você.
            </p>
            <Link
              to="/produtos"
              className="inline-block bg-[#0F3A3E] text-white px-10 py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] transition-colors"
            >
              Explorar Produtos
            </Link>
          </div>
        ) : (
          /* Cart Content */
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
            {/* Items List */}
            <div>
              {/* Table Header - Desktop */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_auto] gap-6 pb-4 border-b border-[#E0D8C7] mb-6">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#75827E]">Produto</span>
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#75827E] text-center">Quantidade</span>
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#75827E] text-right">Total</span>
                <span className="w-10"></span>
              </div>

              {/* Items */}
              <div className="space-y-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 md:gap-6 pb-6 border-b border-[#E9E1D2] items-center"
                  >
                    {/* Product Info */}
                    <div className="flex gap-4">
                      <div className="w-[100px] h-[120px] bg-white border border-[#E9E1D2] flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-contain p-3"
                        />
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-[#B07B1E] font-medium mb-1">
                          {item.vendor}
                        </p>
                        <h3 className="font-serif text-[16px] text-[#0F3A3E] leading-tight mb-2 line-clamp-2">
                          {item.title}
                        </h3>
                        {item.variationName && (
                          <p className="text-[12px] text-[#75827E] mb-1">
                            Variação: {item.variationName}
                          </p>
                        )}
                        <p className="text-[14px] text-[#51635F]">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex md:justify-center">
                      <div className="flex items-center border border-[#E0D8C7] bg-white">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-[#F8F4EA] transition-colors"
                        >
                          <Minus className="h-4 w-4 text-[#0F3A3E]" />
                        </button>
                        <span className="w-12 text-center text-[14px] text-[#0F3A3E] font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center hover:bg-[#F8F4EA] transition-colors"
                        >
                          <Plus className="h-4 w-4 text-[#0F3A3E]" />
                        </button>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="md:text-right">
                      <span className="font-serif text-[18px] text-[#0F3A3E]">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    {/* Remove */}
                    <div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-10 h-10 flex items-center justify-center text-[#9AA39F] hover:text-[#C4433A] transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
                <Link
                  to="/produtos"
                  className="text-[12px] uppercase tracking-[0.14em] text-[#0F3A3E] border-b border-[#B07B1E] pb-1 hover:text-[#B07B1E] transition-colors"
                >
                  ← Continuar Comprando
                </Link>
                <button
                  onClick={clearCart}
                  className="text-[12px] uppercase tracking-[0.14em] text-[#9AA39F] hover:text-[#C4433A] transition-colors"
                >
                  Limpar Carrinho
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:sticky lg:top-8 h-fit">
              <div className="bg-white border border-[#E9E1D2] p-6">
                <h2 className="font-serif text-[20px] text-[#0F3A3E] mb-6 pb-4 border-b border-[#E9E1D2]">
                  Resumo do Pedido
                </h2>

                {/* Coupon */}
                <div className="mb-6">
                  <label className="text-[11px] uppercase tracking-[0.14em] text-[#75827E] mb-2 block">
                    Cupom de Desconto
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Digite seu cupom"
                      className="flex-1 px-4 py-3 border border-[#E0D8C7] text-[14px] focus:outline-none focus:border-[#0F3A3E]"
                      disabled={couponApplied}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponApplied}
                      className={`px-4 py-3 text-[11px] uppercase tracking-[0.12em] font-semibold transition-colors ${
                        couponApplied
                          ? "bg-[#1c6b4a] text-white"
                          : "bg-[#0F3A3E] text-white hover:bg-[#16504F]"
                      }`}
                    >
                      {couponApplied ? "✓" : "Aplicar"}
                    </button>
                  </div>
                  {couponApplied && (
                    <p className="text-[12px] text-[#1c6b4a] mt-2 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Cupom FRAG10 aplicado: 10% de desconto
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="space-y-3 pb-4 border-b border-[#E9E1D2]">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#51635F]">Subtotal</span>
                    <span className="text-[#0F3A3E]">{formatPrice(subtotal)}</span>
                  </div>
                  {couponApplied && (
                    <div className="flex justify-between text-[14px]">
                      <span className="text-[#1c6b4a]">Desconto (10%)</span>
                      <span className="text-[#1c6b4a]">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#51635F]">Frete</span>
                    <span className={shipping === 0 ? "text-[#1c6b4a]" : "text-[#0F3A3E]"}>
                      {shipping === 0 ? "Grátis" : formatPrice(shipping)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center py-4 mb-6">
                  <span className="text-[14px] text-[#0F3A3E] font-medium">Total</span>
                  <span className="font-serif text-[28px] text-[#0F3A3E]">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* PIX discount */}
                <p className="text-[13px] text-[#1c6b4a] text-center mb-4">
                  ✦ {formatPrice(total * 0.95)} no PIX (5% off)
                </p>

                {/* Checkout Button */}
                <button className="w-full bg-[#0F3A3E] text-white py-4 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F] transition-colors mb-3">
                  Finalizar Compra
                </button>

                <p className="text-[11px] text-[#9AA39F] text-center">
                  ou 10x de {formatPrice(total / 10)} sem juros
                </p>

                {/* Benefits */}
                <div className="mt-6 pt-4 border-t border-[#E9E1D2] space-y-3">
                  <div className="flex items-center gap-3">
                    <Truck className="h-4 w-4 text-[#B07B1E]" />
                    <span className="text-[12px] text-[#51635F]">
                      {subtotal >= 199 ? (
                        <span className="text-[#1c6b4a]">✓ Frete grátis aplicado</span>
                      ) : (
                        <>Frete grátis acima de R$199 (faltam {formatPrice(199 - subtotal)})</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-[#B07B1E]" />
                    <span className="text-[12px] text-[#51635F]">Compra 100% segura</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Products */}
      {items.length > 0 && (
        <section className="py-[80px] bg-[#F8F4EA] border-t border-[#E0D8C7]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-14">
            <div className="text-center mb-12">
              <span className="text-[12px] uppercase tracking-[0.3em] text-[#B07B1E]">
                Aproveite e adicione
              </span>
              <h2 className="font-serif text-[32px] text-[#0F3A3E] mt-2">
                Você Também Pode Gostar
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {suggestedProducts.map((product) => (
                <ProductCardEditorial
                  key={product.id}
                  id={product.id}
                  title={product.name}
                  vendor={product.brand || ""}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  image={product.images[0]}
                  rating={4.5}
                  reviewCount={Math.floor(Math.random() * 50) + 10}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <FooterEditorial />
    </div>
  );
}

export default CarrinhoPage;
