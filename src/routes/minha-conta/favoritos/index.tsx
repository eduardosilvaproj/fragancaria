import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

export const Route = createFileRoute("/minha-conta/favoritos/")({
  component: FavoritesPage,
});

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type WishlistRow = {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string | null;
  slug: string | null;
};

function FavoritesPage() {
  const qc = useQueryClient();
  const { data: userData } = useSupabaseUser();
  const user = userData?.user;

  const wishlist = useQuery({
    queryKey: ["my-wishlist", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<WishlistRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("wishlist")
        .select(
          "id, product_id, products:product_id (id, name, price, images, slug)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => {
        const p = r.products ?? {};
        const images = Array.isArray(p.images) ? p.images : [];
        return {
          id: r.id,
          productId: r.product_id,
          name: p.name ?? "",
          price: Number(p.price ?? 0),
          image: images[0] ?? null,
          slug: p.slug ?? null,
        };
      });
    },
    refetchOnWindowFocus: false,
  });

  // Sincroniza localStorage com o servidor na primeira visita.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const raw = localStorage.getItem("fragranciaria:wishlist") || "[]";
        const localIds: string[] = JSON.parse(raw);
        if (localIds.length === 0) return;
        const serverIds = new Set((wishlist.data ?? []).map((w) => w.productId));
        const toInsert = localIds.filter((id) => !serverIds.has(id));
        if (toInsert.length > 0) {
          await supabase
            .from("wishlist")
            .upsert(
              toInsert.map((product_id) => ({
                user_id: user.id,
                product_id,
              })),
              { onConflict: "user_id,product_id" }
            );
          const merged = Array.from(serverIds).concat(toInsert);
          localStorage.setItem(
            "fragranciaria:wishlist",
            JSON.stringify(merged)
          );
          qc.invalidateQueries({ queryKey: ["my-wishlist", user.id] });
        }
      } catch {
        // localStorage indisponivel / JSON invalido: ignora.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, wishlist.data]);

  const remove = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) return;
      await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["my-wishlist", user?.id] }),
  });

  if (wishlist.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-48 bg-white rounded-2xl border border-[#E9E1D2] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const items = wishlist.data ?? [];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Heart className="h-5 w-5 text-[#0F3A3E]" />
        <h2 className="text-lg font-semibold text-[#0F3A3E]">
          Meus favoritos
        </h2>
        <span className="text-xs text-[#8A938E]">{items.length} itens</span>
      </header>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9E1D2] p-12 text-center">
          <Heart className="h-10 w-10 text-[#8A938E] mx-auto mb-3" />
          <p className="text-sm text-[#51635F]">
            Sua lista esta vazia. Salve produtos para ver aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {items.map((it) => (
            <div
              key={it.id}
              className="bg-white rounded-2xl border border-[#E9E1D2] overflow-hidden flex flex-col"
            >
              <Link
                to="/produto/$slug"
                params={{ slug: it.slug ?? it.productId }}
                className="aspect-square overflow-hidden bg-[#F5F3EE]"
              >
                {it.image ? (
                  <img
                    src={it.image}
                    alt={it.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#8A938E] text-xs">
                    Sem imagem
                  </div>
                )}
              </Link>
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-sm font-medium text-[#0F3A3E] line-clamp-2">
                  {it.name}
                </p>
                <p className="text-base text-[#B07B1E] font-semibold mt-1">
                  {formatBRL(it.price)}
                </p>
                <button
                  type="button"
                  onClick={() => remove.mutate(it.productId)}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-900"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;