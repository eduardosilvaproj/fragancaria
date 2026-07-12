import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- Tipo (espelha o schema do banco) ----------
export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount" | "free_shipping";
  discount_value: number;
  minimum_order_value: number | null;
  maximum_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  usage_limit_per_customer: number;
  applies_to_products: string[] | null;
  applies_to_categories: string[] | null;
  applies_to_brands: string[] | null;
  excluded_products: string[] | null;
  customer_ids: string[] | null;
  first_purchase_only: boolean;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// ---------- Validadores ----------
const createInputSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
  discountType: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  discountValue: z.number().min(0),
  minimumOrderValue: z.number().min(0).nullable().optional(),
  maximumDiscount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  usageLimitPerCustomer: z.number().int().min(1).optional(),
  appliesToProducts: z.array(z.string()).nullable().optional(),
  appliesToCategories: z.array(z.string()).nullable().optional(),
  appliesToBrands: z.array(z.string()).nullable().optional(),
  excludedProducts: z.array(z.string()).nullable().optional(),
  customerIds: z.array(z.string()).nullable().optional(),
  firstPurchaseOnly: z.boolean().optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateInputSchema = createInputSchema.extend({
  id: z.string().uuid(),
});

// ---------- Listar ----------
export const listCoupons = createServerFn({ method: "GET" })
  .validator((d: unknown) => (d ?? {}) as { activeOnly?: boolean })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      let query = db.from("coupons").select("*");

      if (data.activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data: rows, error } = await query.order("created_at", { ascending: false });

      if (error) return { success: false as const, error: error.message };
      return { success: true as const, data: rows as unknown as Coupon[] };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// ---------- Criar ----------
export const createCoupon = createServerFn({ method: "POST" })
  .validator((d: unknown) => createInputSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const row = {
        code: data.code.trim().toUpperCase(),
        description: data.description || null,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        minimum_order_value: data.minimumOrderValue ?? null,
        maximum_discount: data.maximumDiscount ?? null,
        usage_limit: data.usageLimit ?? null,
        usage_limit_per_customer: data.usageLimitPerCustomer ?? 1,
        applies_to_products: data.appliesToProducts ?? null,
        applies_to_categories: data.appliesToCategories ?? null,
        applies_to_brands: data.appliesToBrands ?? null,
        excluded_products: data.excludedProducts ?? null,
        customer_ids: data.customerIds ?? null,
        first_purchase_only: data.firstPurchaseOnly ?? false,
        starts_at: data.startsAt || new Date().toISOString(),
        expires_at: data.expiresAt || null,
        is_active: data.isActive ?? true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created, error } = await db.from("coupons").insert(row).select().single();

      if (error) {
        if (error.code === "23505") return { success: false as const, error: "Código já existe" };
        return { success: false as const, error: error.message };
      }

      return { success: true as const, data: created as unknown as Coupon };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// ---------- Atualizar ----------
export const updateCoupon = createServerFn({ method: "POST" })
  .validator((d: unknown) => updateInputSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.code !== undefined) patch.code = data.code.trim().toUpperCase();
      if (data.description !== undefined) patch.description = data.description;
      if (data.discountType !== undefined) patch.discount_type = data.discountType;
      if (data.discountValue !== undefined) patch.discount_value = data.discountValue;
      if (data.minimumOrderValue !== undefined) patch.minimum_order_value = data.minimumOrderValue;
      if (data.maximumDiscount !== undefined) patch.maximum_discount = data.maximumDiscount;
      if (data.usageLimit !== undefined) patch.usage_limit = data.usageLimit;
      if (data.usageLimitPerCustomer !== undefined) patch.usage_limit_per_customer = data.usageLimitPerCustomer;
      if (data.appliesToProducts !== undefined) patch.applies_to_products = data.appliesToProducts;
      if (data.appliesToCategories !== undefined) patch.applies_to_categories = data.appliesToCategories;
      if (data.appliesToBrands !== undefined) patch.applies_to_brands = data.appliesToBrands;
      if (data.excludedProducts !== undefined) patch.excluded_products = data.excludedProducts;
      if (data.customerIds !== undefined) patch.customer_ids = data.customerIds;
      if (data.firstPurchaseOnly !== undefined) patch.first_purchase_only = data.firstPurchaseOnly;
      if (data.startsAt !== undefined) patch.starts_at = data.startsAt;
      if (data.expiresAt !== undefined) patch.expires_at = data.expiresAt;
      if (data.isActive !== undefined) patch.is_active = data.isActive;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error } = await db.from("coupons").update(patch).eq("id", data.id).select().single();

      if (error) {
        if (error.code === "23505") return { success: false as const, error: "Código já existe" };
        return { success: false as const, error: error.message };
      }

      return { success: true as const, data: updated as unknown as Coupon };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// ---------- Desativar ----------
export const deactivateCoupon = createServerFn({ method: "POST" })
  .validator((d: unknown) => ({ id: z.string().uuid().parse(d) }))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await db.from("coupons").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", data.id);

      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });