import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { ProductCardEditorial } from "@/components/shop/ProductCardEditorial";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { useWishlistStore } from "@/stores/wishlistStore";
import { Heart, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus Favoritos | Fragranciaria" },
      { name: "description", content: "Seus produtos favoritos salvos para comprar depois." },
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
      <div className="bg-[#F3EEE3] border-b border-[#E0D8C7]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-10">
          <Breadcrumbs
            items={[{ label: "Favoritos" }]}
            className="mb-4"
          />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-serif text-[36px] md:text-[48px] text-[#0F3A3E] flex items-center gap-4">
                Meus Favoritos
                <Heart className="h-8 w-8 md:h-10 md:w-10 text-[#B07B1E]" />
              </h1>
              <p className="text-[#75827E] text-[15px] mt-2">
                {items.length === 0
                  ? "Nenhum produto salvo"
                  : `${items.length} ${items.length === 1 ? "produto salvo" : "produtos salvos"}`}
              </p>
            </div>

            {items.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Deseja remover todos os produtos dos favoritos?")) {
                    clearWishlist();
                  }
                }}
                className="text-[12px] text-[#75827E] hover:text-[#0F3A3E] transition-colors underline"
              >
                Limpar favoritos
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-14 py-12">
        {items.length > 0 ? (
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
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#F8F4EA] rounded-full flex items-center justify-center">
              <Heart className="h-10 w-10 text-[#B07B1E]" />
            </div>

            <h2 className="font-serif text-2xl text-[#0F3A3E] mb-3">
              Sua lista está vazia
            </h2>
            <p className="text-[#75827E] mb-8 max-w-md mx-auto">
              Explore nossos produtos e clique no coração para salvar seus favoritos aqui.
            </p>

            <Link
              to="/produtos"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#0F3A3E] text-white text-[12px] uppercase tracking-[0.16em] font-medium hover:bg-[#16504F] transition-colors"
            >
              <ShoppingBag className="h-4 w-4" />
              Explorar Produtos
            </Link>
          </div>
        )}
      </div>

      <FooterEditorial />
    </div>
  );
}

export default FavoritosPage;
