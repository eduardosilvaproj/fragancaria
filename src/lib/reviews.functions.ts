import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Server functions da área de avaliações do cliente (/minha-conta/avaliacoes).
// Mesmo padrão de account.functions.ts: valida o Bearer token do usuário e
// usa supabaseAdmin (service role) com escopo manual. A submissão passa por
// aqui porque product_reviews não tem policy de INSERT para authenticated —
// só service_role escreve.

async function getUserClient() {
  const authHeader = getRequest()?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new Error("UNAUTHENTICATED");
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("UNAUTHENTICATED");
  return { user: data.user, db: supabaseAdmin as any } as const;
}

export type MyReview = {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  content: string | null;
  status: string;
  createdAt: string;
};

export const listMyReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data: MyReview[]; error?: string }> => {
    try {
      const { user, db } = await getUserClient();

      const { data: cust } = await db
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!cust) return { success: true, data: [] };

      const { data, error } = await db
        .from("product_reviews")
        .select("id, product_id, rating, title, content, status, created_at")
        .eq("customer_id", cust.id)
        .order("created_at", { ascending: false });
      if (error) return { success: false, data: [], error: error.message };

      const mapped: MyReview[] = (data ?? []).map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        rating: Number(r.rating ?? 0),
        title: r.title ?? null,
        content: r.content ?? null,
        status: r.status ?? "pending",
        createdAt: r.created_at ?? "",
      }));
      return { success: true, data: mapped };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  },
);

export type ReviewableProduct = {
  productId: string;
  name: string;
  image: string | null;
  orderId: string;
  alreadyReviewed: boolean;
};

// Produtos que o cliente comprou (pedidos pagos/entregues) e ainda pode avaliar.
export const listReviewableProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    data: ReviewableProduct[];
    error?: string;
  }> => {
    try {
      const { user, db } = await getUserClient();

      const { data: cust } = await db
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      // Pedidos do usuário (por auth_user_id ou email), status entregue/pago.
      const { data: orders } = await db
        .from("orders")
        .select("id, items, status")
        .or(
          `auth_user_id.eq.${user.id},customer_email.eq.${user.email}`,
        )
        .in("status", ["paid", "approved", "processing", "shipped", "delivered"])
        .order("created_at", { ascending: false })
        .limit(50);

      // Reviews já feitas (para marcar alreadyReviewed).
      const reviewedSet = new Set<string>();
      if (cust) {
        const { data: reviews } = await db
          .from("product_reviews")
          .select("product_id")
          .eq("customer_id", cust.id);
        for (const r of (reviews ?? []) as any[]) {
          reviewedSet.add(String(r.product_id));
        }
      }

      const seen = new Map<string, ReviewableProduct>();
      for (const order of (orders ?? []) as any[]) {
        const items = Array.isArray(order.items) ? order.items : [];
        for (const it of items) {
          const pid = String(it.productId || it.product_id || it.id || "");
          if (!pid || seen.has(pid)) continue;
          seen.set(pid, {
            productId: pid,
            name: String(it.title || it.name || "Produto"),
            image: it.image || null,
            orderId: String(order.id),
            alreadyReviewed: reviewedSet.has(pid),
          });
        }
      }

      return { success: true, data: Array.from(seen.values()) };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  },
);

export const submitReview = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        productId: z.string().min(1),
        orderId: z.string().uuid().optional(),
        rating: z.number().int().min(1).max(5),
        title: z.string().max(255).optional(),
        content: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const { user, db } = await getUserClient();

        // Garante registro de customer (idempotente).
        const { data: existing } = await db
          .from("customers")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        let customerId = existing?.id as string | undefined;
        if (!customerId) {
          const { data: created } = await db
            .from("customers")
            .insert({
              auth_user_id: user.id,
              email: user.email ?? null,
              name: (user.user_metadata?.full_name as string) ?? null,
            })
            .select("id")
            .single();
          customerId = created?.id;
        }
        if (!customerId) {
          return { success: false, error: "Não foi possível identificar o cliente" };
        }

        // Uma avaliação por produto por cliente.
        const { data: dup } = await db
          .from("product_reviews")
          .select("id")
          .eq("customer_id", customerId)
          .eq("product_id", data.productId)
          .maybeSingle();
        if (dup) {
          return { success: false, error: "Você já avaliou este produto." };
        }

        // Verifica compra para marcar is_verified_purchase.
        let isVerified = false;
        if (data.orderId) {
          const { data: order } = await db
            .from("orders")
            .select("id")
            .eq("id", data.orderId)
            .or(`auth_user_id.eq.${user.id},customer_email.eq.${user.email}`)
            .maybeSingle();
          isVerified = !!order;
        }

        const { error } = await db.from("product_reviews").insert({
          product_id: data.productId,
          customer_id: customerId,
          order_id: data.orderId ?? null,
          rating: data.rating,
          title: data.title || null,
          content: data.content || null,
          is_verified_purchase: isVerified,
          status: "pending",
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "erro" };
      }
    },
  );
