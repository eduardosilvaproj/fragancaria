import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server fns de CRUD de produtos para o admin. Padrão: requireAdmin() +
// supabaseAdmin (service role, bypassa RLS). O guard beforeLoad em admin.tsx
// já barra visitantes; requireAdmin é defesa em profundidade.

function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const variationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  color: z.string().max(30).nullable().optional(),
  image: z.string().max(2000).nullable().optional(),
});

const productInput = z.object({
  name: z.string().min(1).max(300),
  brand: z.string().max(120).nullable().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  subcategory: z.string().max(120).nullable().optional(),
  images: z.array(z.string()).max(20).optional(),
  tags: z.array(z.string()).max(50).optional(),
  inStock: z.boolean().optional(),
  quantity: z.number().int().nonnegative().optional(),
  sku: z.string().max(120).nullable().optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // Dimensões para frete
  weightGrams: z.number().int().nonnegative().nullable().optional(),
  heightCm: z.number().nonnegative().nullable().optional(),
  widthCm: z.number().nonnegative().nullable().optional(),
  lengthCm: z.number().nonnegative().nullable().optional(),
  // Dados fiscais
  ncm: z.string().max(10).nullable().optional(),
  eanBarcode: z.string().max(20).nullable().optional(),
  // Variações (ex.: tons de coloração)
  variations: z.array(variationSchema).max(50).optional(),
});

type ProductInput = z.infer<typeof productInput>;

// Mapeia o input (camelCase da UI) para a row do banco (snake_case).
function inputToRow(data: ProductInput) {
  const brandSlug = data.brand ? slugify(data.brand) : null;
  return {
    name: data.name,
    brand: data.brand ?? null,
    brand_slug: brandSlug,
    price: data.price,
    original_price: data.originalPrice ?? null,
    description: data.description ?? null,
    category: data.category ?? null,
    category_slug: data.category ?? null,
    subcategory: data.subcategory ?? null,
    images: data.images ?? [],
    tags: data.tags ?? [],
    in_stock: data.inStock ?? true,
    quantity: data.quantity ?? 0,
    sku: data.sku ?? null,
    featured: data.featured ?? false,
    is_new: data.isNew ?? false,
    is_active: data.isActive ?? true,
    // Dimensões para frete
    weight_grams: data.weightGrams ?? null,
    height_cm: data.heightCm ?? null,
    width_cm: data.widthCm ?? null,
    length_cm: data.lengthCm ?? null,
    // Dados fiscais
    ncm: data.ncm ?? null,
    ean_barcode: data.eanBarcode ?? null,
    // Variações
    variations: data.variations ?? [],
  };
}

export const listProductsForAdmin = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        status: z.enum(["all", "active", "inactive", "low_stock", "out_of_stock"]).optional(),
        limit: z.number().int().positive().max(200).optional(),
        offset: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const limit = data.limit ?? 50;
      const offset = data.offset ?? 0;

      let query = supabaseAdmin
        .from("products")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (data.category) query = query.eq("category", data.category);
      if (data.brand) query = query.eq("brand", data.brand);
      if (data.status === "active") query = query.eq("is_active", true);
      if (data.status === "inactive") query = query.eq("is_active", false);
      if (data.status === "out_of_stock") query = query.eq("quantity", 0);
      if (data.search && data.search.trim()) {
        const term = data.search.replace(/[%_]/g, (c) => "\\" + c).trim();
        query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%`);
      }

      const { data: rows, error, count } = await query;
      if (error) return { success: false as const, error: error.message };
      return { success: true as const, data: { products: rows ?? [], total: count ?? 0 } };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const getProductForAdmin = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error) return { success: false as const, error: error.message };
      if (!row) return { success: false as const, error: "Produto nao encontrado" };
      return { success: true as const, data: row };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const createProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => productInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { randomUUID } = await import("node:crypto");

      const id = data.sku?.trim() || `FRAG-${randomUUID().slice(0, 12)}`;
      const row = {
        ...inputToRow(data),
        id,
        slug: `${slugify(data.name)}-${id.toLowerCase()}`.slice(0, 200),
        external_ids: {},
      };
      const { data: created, error } = await supabaseAdmin
        .from("products")
        .insert(row as any)
        .select("id")
        .single();
      if (error) return { success: false as const, error: error.message };
      return { success: true as const, id: created.id };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const updateProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string(), patch: productInput.partial() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const p = data.patch;
      const patch: Record<string, unknown> = {};
      if (p.name !== undefined) patch.name = p.name;
      if (p.brand !== undefined) {
        patch.brand = p.brand;
        patch.brand_slug = p.brand ? slugify(p.brand) : null;
      }
      if (p.price !== undefined) patch.price = p.price;
      if (p.originalPrice !== undefined) patch.original_price = p.originalPrice;
      if (p.description !== undefined) patch.description = p.description;
      if (p.category !== undefined) {
        patch.category = p.category;
        patch.category_slug = p.category;
      }
      if (p.subcategory !== undefined) patch.subcategory = p.subcategory;
      if (p.images !== undefined) patch.images = p.images;
      if (p.tags !== undefined) patch.tags = p.tags;
      if (p.inStock !== undefined) patch.in_stock = p.inStock;
      if (p.quantity !== undefined) patch.quantity = p.quantity;
      if (p.sku !== undefined) patch.sku = p.sku;
      if (p.featured !== undefined) patch.featured = p.featured;
      if (p.isNew !== undefined) patch.is_new = p.isNew;
      if (p.isActive !== undefined) patch.is_active = p.isActive;
      if (p.variations !== undefined) patch.variations = p.variations;

      if (Object.keys(patch).length === 0) {
        return { success: false as const, error: "nenhum campo para atualizar" };
      }
      const { error } = await supabaseAdmin
        .from("products")
        .update(patch as unknown as Record<string, never>)
        .eq("id", data.id);
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const deleteProducts = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ ids: z.array(z.string()).min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("products").delete().in("id", data.ids);
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const setProductsActive = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ ids: z.array(z.string()).min(1).max(500), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("products")
        .update({ is_active: data.isActive })
        .in("id", data.ids);
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

// Importa lote de linhas (CSV parseado no cliente). Idempotente por id:
// id = sku (se houver) senão gerado. Re-importar o mesmo CSV atualiza.
export const importProducts = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ rows: z.array(productInput).min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { randomUUID } = await import("node:crypto");

      const rows = data.rows.map((r) => {
        const id = r.sku?.trim() || `FRAG-${randomUUID().slice(0, 12)}`;
        return {
          ...inputToRow(r),
          id,
          slug: `${slugify(r.name)}-${id.toLowerCase()}`.slice(0, 200),
          external_ids: {},
        };
      });
      const { error } = await supabaseAdmin.from("products").upsert(rows as any, { onConflict: "id" });
      if (error) return { success: false as const, error: error.message };
      return { success: true as const, imported: rows.length };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const exportProducts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select("id, sku, name, brand, category, price, original_price, quantity, in_stock, is_active, featured, is_new, images, tags, description")
      .order("name", { ascending: true });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data: rows ?? [] };
  } catch (e: any) {
    return { success: false as const, error: e?.message || "erro" };
  }
});
