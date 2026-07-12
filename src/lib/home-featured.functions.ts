import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Product } from "@/data/products";
import { fetchActiveProducts } from "./products.functions";

// ============================================
// Vitrine da Home — destaque de produtos nos carrosseis
// ============================================
// Lê a curadoria manual do admin em `home_featured_manual` e cruza com
// `data/products.ts`. Quando o admin nao promoveu nada, completa com
// aleatorio ESTAVEL (mesmo seed = mesmo resultado) usando o dia + slot
// como chave. Isso garante que a home muda no maximo 1x por dia, nao
// a cada reload.
//
// Por que aleatorio estavel? Para SEO/screenshot/analytics nao surtarem
// a cada requisicao, e para o admin nao surtar achando que o produto
// sumiu. Quando admin promover manualmente, a curadoria sempre vence
// (na posicao dele). Quando resetar, volta a ser aleatorio estavel.

export const SLOTS = [
  "bestsellers",
  "new_arrivals",
  "on_sale",
  "kits",
] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  bestsellers: "Mais Vendidos",
  new_arrivals: "Novidades",
  on_sale: "Em Promocao",
  kits: "Kits",
};

const SlotSchema = z.enum(SLOTS);

// Retorna ate 12 produtos para o slot: curadoria manual primeiro, depois
// flag correspondente, depois aleatorio estavel. Publico (SSR da home).
export const listFeatured = createServerFn({ method: "GET" })
  .validator((d: unknown) => SlotSchema.parse(d))
  .handler(
    async ({ data: slot }): Promise<{ success: boolean; data: Product[]; error?: string }> => {
      try {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: manual, error } = await supabaseAdmin
          .from("home_featured_manual")
          .select("product_id, position")
          .eq("slot", slot)
          .order("position", { ascending: true });

        const manualIds: string[] = [];
        if (!error && manual) {
          for (const row of manual as Array<{ product_id: string }>) {
            manualIds.push(row.product_id);
          }
        } else if (error) {
          console.error("listFeatured manual error:", error.message);
        }

        const products = await fetchActiveProducts();
        const byId = new Map<string, Product>(products.map((p) => [p.id, p]));
        const result: Product[] = [];
        const used = new Set<string>();

        // 1) Curadoria manual (ordem do admin)
        for (const id of manualIds) {
          const p = byId.get(id);
          if (p && !used.has(p.id)) {
            result.push(p);
            used.add(p.id);
            if (result.length >= 12) return { success: true, data: result };
          }
        }

        // 2) Produtos com flag correspondente ao slot
        const flagged = filterBySlot(products, slot).filter((p) => !used.has(p.id));
        const sortedFlagged = stableSort(flagged, slot);
        for (const p of sortedFlagged) {
          result.push(p);
          used.add(p.id);
          if (result.length >= 12) return { success: true, data: result };
        }

        // 3) Restante: aleatorio estavel
        const rest = products.filter((p) => !used.has(p.id));
        const seeded = seededShuffle(rest, dailySeed(slot));
        for (const p of seeded) {
          result.push(p);
          if (result.length >= 12) return { success: true, data: result };
        }

        return { success: true, data: result };
      } catch (err: any) {
        console.error("listFeatured exception:", err?.message || err);
        return { success: false, data: [], error: err?.message || "erro" };
      }
    },
  );

// Auxiliar: lista compacta para o autocomplete do admin.
export const listProductsForAdmin = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    data: Array<{ id: string; name: string; brand: string; price: number; originalPrice?: number; image: string; isNew: boolean; isOnSale: boolean; isKit: boolean }>;
    error?: string;
  }> => {
    const products = await fetchActiveProducts();
    const data = products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      originalPrice: p.originalPrice,
      image: p.images[0] ?? "",
      isNew: Boolean(p.isNew),
      isOnSale: Boolean(p.originalPrice && p.originalPrice > p.price),
      isKit: p.category === "kits",
    }));
    return { success: true, data };
  },
);

// Lista o que o admin promoveu (em ordem). Usado pela UI para preencher
// a lista do slot. Protegido: requer admin.
export const listManualFeatured = createServerFn({ method: "GET" })
  .validator((d: unknown) => SlotSchema.parse(d))
  .handler(
    async ({ data: slot }): Promise<{ success: boolean; data: Product[]; error?: string }> => {
      try {
        const { requireAdmin } = await import("./admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: manual, error } = await supabaseAdmin
          .from("home_featured_manual")
          .select("product_id, position")
          .eq("slot", slot)
          .order("position", { ascending: true });
        if (error) return { success: false, data: [], error: error.message };
        const products = await fetchActiveProducts();
        const byId = new Map<string, Product>(products.map((p) => [p.id, p]));
        const out: Product[] = [];
        for (const r of (manual ?? []) as Array<{ product_id: string }>) {
          const p = byId.get(r.product_id);
          if (p) out.push(p);
        }
        return { success: true, data: out };
      } catch (err: any) {
        return { success: false, data: [], error: err?.message || "erro" };
      }
    },
  );

// Adiciona um produto a curadoria. Se ja existir, no-op.
export const addFeatured = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        slot: SlotSchema,
        productId: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Calcula proxima position
    const { data: max } = await supabaseAdmin
      .from("home_featured_manual")
      .select("position")
      .eq("slot", data.slot)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (max?.position ?? -1) + 1;
    const { error } = await supabaseAdmin
      .from("home_featured_manual")
      .upsert(
        { slot: data.slot, product_id: data.productId, position: nextPos },
        { onConflict: "slot,product_id" },
      );
    if (error) return { success: false, error: error.message };
    return { success: true as const };
  });

export const removeFeatured = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        slot: SlotSchema,
        productId: z.string().min(1),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("home_featured_manual")
      .delete()
      .eq("slot", data.slot)
      .eq("product_id", data.productId);
    if (error) return { success: false, error: error.message };
    return { success: true as const };
  });

// Substitui a ordem do slot pelo array recebido.
export const reorderFeatured = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        slot: SlotSchema,
        productIds: z.array(z.string().min(1)).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Apaga tudo do slot e re-insere com nova posicao
    const { error: delErr } = await supabaseAdmin
      .from("home_featured_manual")
      .delete()
      .eq("slot", data.slot);
    if (delErr) return { success: false, error: delErr.message };
    if (data.productIds.length === 0) return { success: true as const };
    const rows = data.productIds.map((product_id, position) => ({
      slot: data.slot,
      product_id,
      position,
    }));
    const { error } = await supabaseAdmin
      .from("home_featured_manual")
      .insert(rows);
    if (error) return { success: false, error: error.message };
    return { success: true as const };
  });

export const resetFeatured = createServerFn({ method: "POST" })
  .validator((d: unknown) => SlotSchema.parse(d))
  .handler(async ({ data: slot }) => {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("home_featured_manual")
      .delete()
      .eq("slot", slot);
    if (error) return { success: false, error: error.message };
    return { success: true as const };
  });

// ============================================
// Helpers locais
// ============================================

function filterBySlot(products: Product[], slot: Slot): Product[] {
  switch (slot) {
    case "bestsellers":
      // Sem metrica real de vendas, usa "tem desconto OU featured OU kit"
      return products.filter(
        (p) => p.featured || (p.originalPrice && p.originalPrice > p.price),
      );
    case "new_arrivals":
      return products.filter((p) => p.isNew);
    case "on_sale":
      return products.filter(
        (p) => p.originalPrice != null && p.originalPrice > p.price,
      );
    case "kits":
      return products.filter((p) => p.category === "kits");
  }
}

// Ordena estavelmente (nao randomiza) usando o slot como chave — para que
// dois reloads no mesmo dia deem a mesma ordem antes de cair no random.
function stableSort(products: Product[], slot: Slot): Product[] {
  return [...products].sort((a, b) => {
    if (slot === "bestsellers") {
      // Prioriza maior desconto percentual
      const da = a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0;
      const db = b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0;
      return db - da;
    }
    if (slot === "on_sale") {
      const da = a.originalPrice ? a.originalPrice - a.price : 0;
      const db = b.originalPrice ? b.originalPrice - b.price : 0;
      return db - da;
    }
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

// Mulberry32: PRNG determinístico e rápido. Mesmo seed = mesmo resultado.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailySeed(slot: Slot): number {
  const d = new Date();
  const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}-${slot}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
