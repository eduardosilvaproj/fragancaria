import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Product } from "@/data/products";
import type { Database } from "@/integrations/supabase/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

// Mapeia a row do banco (snake_case) para o Product da app (camelCase).
// Inverso de inputToRow em products-admin.functions.ts. Campos nulos do
// banco (brand/description/category) viram "" para satisfazer a interface.
export function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand ?? "",
    price: Number(r.price),
    originalPrice: r.original_price ?? undefined,
    description: r.description ?? "",
    category: r.category ?? "",
    subcategory: r.subcategory ?? undefined,
    images: r.images ?? [],
    tags: r.tags ?? undefined,
    inStock: r.in_stock,
    quantity: r.quantity,
    sku: r.sku ?? undefined,
    featured: r.featured,
    isNew: r.is_new,
  };
}

// Helper server-side (nao serverfn) reutilizavel por outras server fns.
// Faz import dinamico do client.server, entao e seguro importar estaticamente.
export async function fetchActiveProducts(): Promise<Product[]> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToProduct);
}

// Todos os produtos ativos da loja. Publico (sem requireAdmin). Usa
// supabaseAdmin (service role, bypassa RLS) entao filtra is_active na mao.
export const listActiveProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data: Product[]; error?: string }> => {
    try {
      return { success: true, data: await fetchActiveProducts() };
    } catch (err: any) {
      console.error("listActiveProducts exception:", err?.message || err);
      return { success: false, data: [], error: err?.message || "erro" };
    }
  },
);

// Um produto ativo por id. Publico.
export const getProductById = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(
    async ({ data }): Promise<{ success: boolean; data: Product | null; error?: string }> => {
      try {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: row, error } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("id", data.id)
          .eq("is_active", true)
          .maybeSingle();
        if (error) return { success: false, data: null, error: error.message };
        return { success: true, data: row ? rowToProduct(row) : null };
      } catch (err: any) {
        console.error("getProductById exception:", err?.message || err);
        return { success: false, data: null, error: err?.message || "erro" };
      }
    },
  );
