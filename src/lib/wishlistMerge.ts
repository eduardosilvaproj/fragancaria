import { mergeLocalWishlist } from "./account.functions";

// Helper client-side: le o storage do zustand (chave "fragranciaria-wishlist")
// e chama a server function mergeLocalWishlist. Os IDs unificados ficam
// disponiveis via o evento `fragranciaria:wishlist-merged`. A pagina de
// favoritos tambem tenta sincronizar por conta propria.
const STORAGE_KEY = "fragranciaria-wishlist";

function readLocalIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const items = parsed?.state?.items ?? parsed?.items ?? [];
    if (!Array.isArray(items)) return [];
    return items.map((it: any) => it.id).filter(Boolean);
  } catch {
    return [];
  }
}

export async function mergeLocalWishlistFn(): Promise<string[]> {
  try {
    if (typeof window === "undefined") return [];
    const localIds = readLocalIds();
    if (localIds.length === 0) return [];
    const res = await mergeLocalWishlist({ data: { localIds } });
    if (res?.success && Array.isArray(res.ids)) {
      window.dispatchEvent(
        new CustomEvent("fragranciaria:wishlist-merged", { detail: res.ids }),
      );
      return res.ids;
    }
  } catch {
    // ignora — nao e bloqueante
  }
  return [];
}

export default mergeLocalWishlistFn;
