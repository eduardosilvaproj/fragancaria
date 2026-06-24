import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";
import { useWishlistStore } from "@/stores/wishlistStore";
import { Heart, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus Favoritos | Fragranciaria" },
      { name: "description", content: "Seus produtos favoritos salvos na Fragranciaria." },
    ],
  }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const { items, clearWishlist } = useWishlistStore();

  return (
    <div className="min-h-screen bg-[#F3EEE3] font-sans">
      <NavbarEditorial />

      {/* Header */}
      <section className="bg-[#F3EEE3] border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-10 md:py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Heart className="w-6 h-6 text-[#B07B1E]" />
                <span className="text-[11px] tracking-[0.25em] text-[#B07B1E] uppercase">
                  Minha Lista
                </span>
              </div>
              <h1 className="font-serif font-medium text-[32px] md:text-[48px] text-[#0F3A3E] leading-[1.1]">
                Meus Favoritos
              </h1>
              <p className="text-[14px] text-[#51635F] mt-2">
                {items.length === 0
                  ? "Você ainda não tem produtos favoritos"
                  : `${items.length} ${items.length === 1 ? "produto salvo" : "produtos salvos"}`}
              </p>
            </div>

            {items.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Tem certeza que deseja limpar todos os favoritos?")) {
                    clearWishlist();
                  }
                }}
                className="flex items-center gap-2 text-[12px] text-[#75827E] hover:text-[#B07B1E] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Limpar lista
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-10 md:py-14">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-[#F8F4EA] flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-[#E0D8C7]" />
              </div>
              <h2 className="font-serif text-[24px] text-[#0F3A3E] mb-3">
                Sua lista está vazia
              </h2>
              <p className="text-[14px] text-[#51635F] mb-8 max-w-[400px] mx-auto">
                Explore nossa coleção e clique no coração para salvar seus produtos favoritos aqui.
              </p>
              <Link
                to="/produtos"
                className="inline-flex items-center gap-2 bg-[#0F3A3E] text-white px-8 py-4 text-[12px] uppercase tracking-[0.16em] font-medium hover:bg-[#16504F] transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Explorar Produtos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {items.map((item) => (
                <ProductCardEditorial
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  vendor={item.vendor}
                  price={item.price}
                  originalPrice={item.originalPrice}
                  image={item.image}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {items.length > 0 && (
        <section className="py-10 md:py-14 bg-white border-t border-[#E0D8C7]">
          <div className="max-w-[1280px] mx-auto px-6 md:px-14 text-center">
            <p className="text-[14px] text-[#51635F] mb-4">
              Encontrou o que procurava?
            </p>
            <Link
              to="/produtos"
              className="inline-block text-[12px] tracking-[0.16em] text-[#0F3A3E] uppercase border-b border-[#B07B1E] pb-[5px] hover:text-[#B07B1E] transition-colors"
            >
              Continuar comprando →
            </Link>
          </div>
        </section>
      )}

      <FooterEditorial />
    </div>
  );
}

export default FavoritosPage;
