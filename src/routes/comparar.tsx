import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { useCompareStore } from "@/stores/compareStore";
import { useCartStore } from "@/stores/cartStore";
import { X, ShoppingBag, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [{ title: "Comparar Produtos | Fragranciaria" }],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { items, removeItem, clearItems } = useCompareStore();
  const addToCart = useCartStore((state) => state.addItem);

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const handleAddToCart = (item: typeof items[0]) => {
    addToCart({
      id: item.id,
      title: item.title,
      price: item.price,
      quantity: 1,
      image: item.image,
      vendor: item.vendor,
    });
    toast.success("Adicionado ao carrinho", { duration: 2000 });
  };

  // Not enough products to compare
  if (items.length < 2) {
    return (
      <div className="min-h-screen bg-[#F3EEE3] font-sans">
        <NavbarEditorial />

        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-20 text-center">
          <h1 className="font-serif text-[32px] md:text-[42px] text-[#0F3A3E] mb-4">
            Comparador de Produtos
          </h1>
          <p className="text-[16px] text-[#51635F] mb-8 max-w-[480px] mx-auto">
            Adicione pelo menos 2 produtos para comparar. Navegue pelos produtos e clique no ícone de comparar.
          </p>
          <Link
            to="/produtos"
            className="inline-flex items-center gap-2 bg-[#0F3A3E] text-white px-8 py-4 text-[12px] uppercase tracking-[0.14em] font-semibold hover:bg-[#16504F] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver Produtos
          </Link>
        </div>

        <FooterEditorial />
      </div>
    );
  }

  // Calculate best price
  const prices = items.map((i) => i.price);
  const lowestPrice = Math.min(...prices);

  // Comparison attributes
  const attributes = [
    { label: "Marca", key: "vendor" as const },
    { label: "Categoria", key: "category" as const },
    { label: "Preço Original", getValue: (item: typeof items[0]) => item.originalPrice ? formatPrice(item.originalPrice) : "—" },
    { label: "Desconto", getValue: (item: typeof items[0]) => {
      if (item.originalPrice && item.originalPrice > item.price) {
        const discount = Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
        return `${discount}% OFF`;
      }
      return "—";
    }},
    { label: "Parcelamento", getValue: (item: typeof items[0]) => `10x de ${formatPrice(item.price / 10)}` },
  ];

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
            <span className="text-[#0F3A3E]">Comparar Produtos</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <section className="py-8 md:py-12 border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-[28px] md:text-[36px] text-[#0F3A3E]">
                Comparar Produtos
              </h1>
              <p className="text-[14px] text-[#51635F] mt-1">
                {items.length} produtos selecionados
              </p>
            </div>
            <button
              onClick={clearItems}
              className="text-[13px] text-[#C4433A] hover:underline self-start md:self-auto"
            >
              Limpar comparação
            </button>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-10 md:py-16">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              {/* Product Headers */}
              <thead>
                <tr>
                  <th className="w-[180px] p-4 text-left align-top"></th>
                  {items.map((item) => (
                    <th
                      key={item.id}
                      className="p-4 text-left align-top bg-white border border-[#E9E1D2] relative min-w-[200px]"
                    >
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-[#F8F4EA] text-[#75827E] hover:text-[#C4433A] hover:bg-[#fef2f2] transition-colors"
                        aria-label="Remover"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      <Link to="/produto/$id" params={{ id: item.id }}>
                        <div className="bg-[#F8F4EA] p-4 mb-4">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-[120px] object-contain"
                          />
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[#B07B1E] font-medium">
                          {item.vendor}
                        </p>
                        <h3 className="font-serif text-[16px] text-[#0F3A3E] leading-tight mt-1 line-clamp-2 hover:text-[#B07B1E] transition-colors">
                          {item.title}
                        </h3>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Price Row */}
                <tr>
                  <td className="p-4 text-[13px] text-[#51635F] font-medium border-b border-[#E0D8C7]">
                    Preço
                  </td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className={cn(
                        "p-4 border border-[#E9E1D2] border-t-0",
                        item.price === lowestPrice && "bg-[#1c6b4a]/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-[22px] text-[#0F3A3E]">
                          {formatPrice(item.price)}
                        </span>
                        {item.price === lowestPrice && (
                          <span className="text-[10px] uppercase tracking-[0.1em] text-[#1c6b4a] font-semibold bg-[#1c6b4a]/10 px-2 py-1">
                            Menor
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Attribute Rows */}
                {attributes.map((attr, idx) => (
                  <tr key={idx}>
                    <td className="p-4 text-[13px] text-[#51635F] font-medium border-b border-[#E0D8C7]">
                      {attr.label}
                    </td>
                    {items.map((item) => (
                      <td
                        key={item.id}
                        className="p-4 text-[14px] text-[#0F3A3E] border border-[#E9E1D2] border-t-0"
                      >
                        {attr.getValue
                          ? attr.getValue(item)
                          : (item[attr.key!] || "—")}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Add to Cart Row */}
                <tr>
                  <td className="p-4"></td>
                  {items.map((item) => (
                    <td
                      key={item.id}
                      className="p-4 border border-[#E9E1D2] border-t-0"
                    >
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="w-full flex items-center justify-center gap-2 bg-[#0F3A3E] text-white py-3 text-[11px] uppercase tracking-[0.14em] font-semibold hover:bg-[#16504F] transition-colors"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Adicionar
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <FooterEditorial />
    </div>
  );
}

export default ComparePage;
