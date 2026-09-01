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
    variations: Array.isArray((r as unknown as { variations?: unknown }).variations)
      ? ((r as unknown as { variations: Product["variations"] }).variations ?? [])
      : [],
  };
}

// Helper server-side (nao serverfn) reutilizavel por outras server fns.
// Faz import dinamico do client.server, entao e seguro importar estaticamente.
// Pagina de 1000 em 1000 porque o PostgREST tem max-rows=1000 no servidor:
// um select sem range devolve no maximo 1000 linhas e NAO avisa que truncou
// (medido 2026-07-30: .limit(5000) tambem devolve 1000). Como isto ordena por
// nome, o corte descartava calado os ~234 ultimos produtos ativos — as
// categorias Óleo, Leave-in e Maquiagem simplesmente nao chegavam na loja e
// os links do menu abriam listagem vazia.
const PAGE = 1000;

export async function fetchActiveProducts(): Promise<Product[]> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const rows: ProductRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const lote = data ?? [];
    rows.push(...lote);
    // Ultima pagina quando vem menos que o tamanho pedido.
    if (lote.length < PAGE) break;
  }

  return rows.map(rowToProduct);
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

// Contagem de produtos ativos por marca. Server-side: deriva os 6-8 nomes
// para o marquee da home e o menu do header sem o cliente ter que carregar
// 699 produtos so para fazer .filter().length.
//
// Regra FASE 4: marca so entra se tiver >= 20 produtos ativos; maximo 8;
// ordenado por volume desc. Sem RPC nova — projection enxuta (brand) sobre
// a mesma tabela paginada de 1000 em 1000 (mesmo motivo de fetchActiveProducts:
// PostgREST tem max-rows=1000 e nao avisa que truncou).
//
// Filtra brand null/vazio antes de agrupar para nao distorcer a contagem
// (produto sem marca nunca deveria estar ativo, mas o filtro cobre o caso
// sem precisar migrar schema).
export type BrandCount = { brand: string; count: number };

export async function fetchActiveBrandCounts(): Promise<BrandCount[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const counts: Record<string, number> = {};
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("brand")
      .eq("is_active", true)
      .not("brand", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const lote = data ?? [];
    for (const r of lote) {
      const b = (r.brand ?? "").trim();
      if (b) counts[b] = (counts[b] || 0) + 1;
    }
    if (lote.length < PAGE) break;
  }

  return Object.entries(counts).map(([brand, count]) => ({ brand, count }));
}

export const getTopBrands = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z.object({
      minCount: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(20).optional(),
    }).parse(d),
  )
  .handler(
    async ({ data }): Promise<{ success: boolean; data: BrandCount[]; error?: string }> => {
      try {
        const counts = await fetchActiveBrandCounts();
        const min = data.minCount ?? 20;
        const limit = data.limit ?? 8;
        const top = counts
          .filter((c) => c.count >= min)
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
        return { success: true, data: top };
      } catch (err: any) {
        console.error("getTopBrands exception:", err?.message || err);
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
