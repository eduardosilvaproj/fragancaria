import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server fns para o painel /admin/reviews. Mesmo padrão de
// orders-admin.functions.ts: requireAdmin + supabaseAdmin (service role).

export type AdminReviewRow = {
  id: string;
  productId: string;
  customerName: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  status: string;
  isVerifiedPurchase: boolean;
  storeReply: string | null;
  createdAt: string;
};

const REVIEW_COLUMNS =
  "id, product_id, rating, title, content, status, is_verified_purchase, store_reply, created_at, customers:customer_id (name)";

function mapReview(r: Record<string, any>): AdminReviewRow {
  return {
    id: String(r.id),
    productId: String(r.product_id),
    customerName: r.customers?.name ?? null,
    rating: Number(r.rating ?? 0),
    title: r.title ?? null,
    content: r.content ?? null,
    status: String(r.status ?? "pending"),
    isVerifiedPurchase: Boolean(r.is_verified_purchase),
    storeReply: r.store_reply ?? null,
    createdAt: String(r.created_at ?? ""),
  };
}

export const listReviewsForAdmin = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { success: true; data: AdminReviewRow[] }
      | { success: false; error: string }
    > => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        let query = db
          .from("product_reviews")
          .select(REVIEW_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(200);

        if (data.status && data.status !== "all") {
          query = query.eq("status", data.status);
        }

        const { data: rows, error } = await query;
        if (error) return { success: false, error: error.message };
        return {
          success: true,
          data: ((rows ?? []) as Array<Record<string, any>>).map(mapReview),
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const moderateReview = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        reviewId: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        rejectionReason: z.string().max(280).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        const admin = await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        const { error } = await db
          .from("product_reviews")
          .update({
            status: data.status,
            moderated_at: new Date().toISOString(),
            moderated_by: admin.email || null,
            rejection_reason:
              data.status === "rejected" ? data.rejectionReason || null : null,
          })
          .eq("id", data.reviewId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const replyToReview = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        reviewId: z.string().uuid(),
        reply: z.string().min(1).max(2000),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const db = supabaseAdmin as any;

        const { error } = await db
          .from("product_reviews")
          .update({
            store_reply: data.reply,
            store_reply_at: new Date().toISOString(),
          })
          .eq("id", data.reviewId);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );
