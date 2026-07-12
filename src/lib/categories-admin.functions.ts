import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// CRUD de categorias e marcas para o admin. Padrão: requireAdmin() +
// supabaseAdmin (service role).

function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ----- Categorias ----------------------------------------------------------

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data: data ?? [] };
  } catch (e: any) {
    return { success: false as const, error: e?.message || "erro" };
  }
});

export const upsertCategory = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(1000).nullable().optional(),
        image: z.string().max(1000).nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const row = {
        name: data.name,
        slug: slugify(data.name),
        description: data.description ?? null,
        image: data.image ?? null,
        ...(data.sortOrder !== undefined ? { sort_order: data.sortOrder } : {}),
      };
      if (data.id) {
        const { error } = await supabaseAdmin
          .from("categories")
          .update(row)
          .eq("id", data.id);
        if (error) return { success: false as const, error: error.message };
      } else {
        const { error } = await supabaseAdmin.from("categories").insert(row);
        if (error) return { success: false as const, error: error.message };
      }
      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

// ----- Marcas --------------------------------------------------------------

export const listBrands = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("brands")
      .select("*")
      .order("name", { ascending: true });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data: data ?? [] };
  } catch (e: any) {
    return { success: false as const, error: e?.message || "erro" };
  }
});

export const upsertBrand = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), name: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const row = { name: data.name, slug: slugify(data.name) };
      if (data.id) {
        const { error } = await supabaseAdmin.from("brands").update(row).eq("id", data.id);
        if (error) return { success: false as const, error: error.message };
      } else {
        const { error } = await supabaseAdmin.from("brands").insert(row);
        if (error) return { success: false as const, error: error.message };
      }
      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("brands").delete().eq("id", data.id);
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });
