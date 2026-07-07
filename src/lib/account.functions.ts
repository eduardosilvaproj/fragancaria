import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server functions da area do cliente (/minha-conta). RLS decide o que cada
// user pode ver/mexer; nunca usar service_role aqui.

async function getUserClient() {
  const { getSupabaseServerClient } = await import(
    "@/integrations/supabase/client.server"
  );
  const { user, supabase } = await getSupabaseServerClient();
  if (!user) throw new Error("UNAUTHENTICATED");
  return { user, supabase } as const;
}

export type DashboardSummary = {
  user: { id: string; email: string; fullName?: string };
  points: number;
  tier: string;
  ordersCount: number;
  activeOrdersCount: number;
  wishlistCount: number;
  unreadNotifications: number;
};

export const getMyDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data?: DashboardSummary; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const [customer, orders, activeOrders, wishlist, unread] = await Promise.all([
        supabase
          .from("customers")
          .select("loyalty_points, loyalty_tier")
          .eq("auth_user_id", user.id)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .or(`auth_user_id.eq.${user.id},customer_email.eq.${user.email}`),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .or(`auth_user_id.eq.${user.id},customer_email.eq.${user.email}`)
          .in("status", ["paid", "processing", "shipped"]),
        supabase
          .from("wishlist")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
      ]);
      const points = Number((customer.data as any)?.loyalty_points ?? 0);
      const tier = (customer.data as any)?.loyalty_tier ?? "bronze";
      const fullName =
        (user.user_metadata as any)?.full_name ||
        (user.user_metadata as any)?.name ||
        undefined;
      return {
        success: true,
        data: {
          user: { id: user.id, email: user.email ?? "", fullName },
          points,
          tier,
          ordersCount: orders.count ?? 0,
          activeOrdersCount: activeOrders.count ?? 0,
          wishlistCount: wishlist.count ?? 0,
          unreadNotifications: unread.count ?? 0,
        },
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "erro" };
    }
  }
);

// ----- Pedidos -------------------------------------------------------------

export type MyOrder = {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  refundStatus: string | null;
  total: number;
  trackingCode: string | null;
  trackingUrl: string | null;
  items: Array<{ name: string; quantity: number; price: number }>;
};

export const listMyOrders = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data: MyOrder[]; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, created_at, status, payment_status, refund_status, total, tracking_code, tracking_url")
        .or(`auth_user_id.eq.${user.id},customer_email.eq.${user.email}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return { success: false, data: [], error: error.message };
      const orderIds = (orders ?? []).map((o: any) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("order_id, name, quantity, price")
        .in("order_id", orderIds);
      const itemsByOrder = new Map<string, Array<any>>();
      for (const it of items ?? []) {
        const arr = itemsByOrder.get((it as any).order_id) ?? [];
        arr.push(it);
        itemsByOrder.set((it as any).order_id, arr);
      }
      const mapped: MyOrder[] = (orders ?? []).map((o: any) => ({
        id: o.id,
        createdAt: o.created_at ?? "",
        status: o.status ?? "pending",
        paymentStatus: o.payment_status ?? "pending",
        refundStatus: o.refund_status ?? null,
        total: Number(o.total ?? 0),
        trackingCode: o.tracking_code ?? null,
        trackingUrl: o.tracking_url ?? null,
        items: (itemsByOrder.get(o.id) ?? []).map((it: any) => ({
          name: it.name ?? "",
          quantity: Number(it.quantity ?? 0),
          price: Number(it.price ?? 0),
        })),
      }));
      return { success: true, data: mapped };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  }
);

export type MyOrderDetail = MyOrder & {
  history: Array<{ status: string; createdAt: string; notes?: string | null }>;
  shippingAddress: any;
  customer: { name: string; email: string; phone?: string | null };
};

export const getMyOrder = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ orderId: z.string() }).parse(d))
  .handler(
    async ({ data }): Promise<{ success: boolean; data?: MyOrderDetail; error?: string }> => {
      try {
        const { user, supabase } = await getUserClient();
        const { data: order, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", data.orderId)
          .or(`auth_user_id.eq.${user.id},customer_email.eq.${user.email}`)
          .maybeSingle();
        if (error || !order) return { success: false, error: "Pedido nao encontrado" };
        const [{ data: items }, { data: history }] = await Promise.all([
          supabase
            .from("order_items")
            .select("name, quantity, price")
            .eq("order_id", data.orderId),
          supabase
            .from("order_status_history")
            .select("status, created_at, notes")
            .eq("order_id", data.orderId)
            .order("created_at", { ascending: true }),
        ]);
        const o: any = order;
        return {
          success: true,
          data: {
            id: o.id,
            createdAt: o.created_at ?? "",
            status: o.status ?? "pending",
            paymentStatus: o.payment_status ?? "pending",
            refundStatus: o.refund_status ?? null,
            total: Number(o.total ?? 0),
            trackingCode: o.tracking_code ?? null,
            trackingUrl: o.tracking_url ?? null,
            items: (items ?? []).map((it: any) => ({
              name: it.name ?? "",
              quantity: Number(it.quantity ?? 0),
              price: Number(it.price ?? 0),
            })),
            history: (history ?? []).map((h: any) => ({
              status: h.status ?? "",
              createdAt: h.created_at ?? "",
              notes: h.notes ?? null,
            })),
            shippingAddress: o.shipping_address ?? null,
            customer: {
              name: o.customer_name ?? "",
              email: o.customer_email ?? "",
              phone: o.customer_phone ?? null,
            },
          },
        };
      } catch (err: any) {
        return { success: false, error: err?.message || "erro" };
      }
    }
  );

// ----- Wishlist ------------------------------------------------------------

export type WishlistItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string | null;
  inStock: boolean;
  createdAt: string;
};

export const listMyWishlist = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data: WishlistItem[]; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const { data, error } = await supabase
        .from("wishlist")
        .select("id, product_id, created_at, products:product_id (id, name, price, images, in_stock)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return { success: false, data: [], error: error.message };
      const mapped: WishlistItem[] = (data ?? []).map((r: any) => {
        const p = r.products ?? {};
        return {
          id: r.id,
          productId: r.product_id,
          name: p.name ?? "",
          price: Number(p.price ?? 0),
          image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
          inStock: Boolean(p.in_stock),
          createdAt: r.created_at,
        };
      });
      return { success: true, data: mapped };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  }
);

export const addToWishlist = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ productId: z.string() }).parse(d)
  )
  .handler(async ({ data }) => {
    try {
      const { user, supabase } = await getUserClient();
      const { error } = await supabase
        .from("wishlist")
        .upsert({ user_id: user.id, product_id: data.productId }, { onConflict: "user_id,product_id" });
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (err: any) {
      return { success: false as const, error: err?.message || "erro" };
    }
  });

export const removeFromWishlist = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ productId: z.string() }).parse(d)
  )
  .handler(async ({ data }) => {
    try {
      const { user, supabase } = await getUserClient();
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", data.productId);
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (err: any) {
      return { success: false as const, error: err?.message || "erro" };
    }
  });

// Recebe lista de productIds locais (localStorage / zustand) e faz merge:
//   - insere os que faltam
//   - remove do local os que ja estavam no servidor
// Retorna a lista unificada de productIds para o cliente sincronizar.
export const mergeLocalWishlist = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ localIds: z.array(z.string()).max(500) }).parse(d)
  )
  .handler(async ({ data }) => {
    try {
      const { user, supabase } = await getUserClient();
      const serverRes = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user.id);
      const serverIds = new Set<string>(
        (serverRes.data ?? []).map((r: any) => r.product_id)
      );
      const toInsert = data.localIds.filter((id) => !serverIds.has(id));
      if (toInsert.length > 0) {
        await supabase
          .from("wishlist")
          .upsert(
            toInsert.map((product_id) => ({ user_id: user.id, product_id })),
            { onConflict: "user_id,product_id" }
          );
      }
      return { success: true as const, ids: Array.from(serverIds).concat(toInsert) };
    } catch (err: any) {
      return { success: false as const, error: err?.message || "erro" };
    }
  });

// ----- Notifications -------------------------------------------------------

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export const listMyNotifications = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data: Notification[]; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, link, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return { success: false, data: [], error: error.message };
      const mapped: Notification[] = (data ?? []).map((r: any) => ({
        id: r.id,
        type: r.type ?? "general",
        title: r.title ?? "",
        message: r.message ?? "",
        link: r.link ?? null,
        read: Boolean(r.read),
        createdAt: r.created_at ?? "",
      }));
      return { success: true, data: mapped };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  }
);

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const { user, supabase } = await getUserClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) return { success: false as const, error: error.message };
      return { success: true as const };
    } catch (err: any) {
      return { success: false as const, error: err?.message || "erro" };
    }
  }
);

// ----- Refund (cliente solicita) -------------------------------------------

export const requestRefund = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      orderId: z.string(),
      reason: z.string().min(10).max(1000),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    try {
      const { user, supabase } = await getUserClient();
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, status")
        .eq("id", data.orderId)
        .or(`auth_user_id.eq.${user.id},customer_email.eq.${user.email}`)
        .maybeSingle();
      if (!order) return { success: false as const, error: "Pedido nao encontrado" };
      const o: any = order;
      if (!["paid", "processing"].includes(o.status)) {
        return {
          success: false as const,
          error: "Este pedido nao pode mais ser cancelado (ja enviado ou entregue).",
        };
      }
      const { data: created, error } = await supabase
        .from("refund_requests")
        .insert({
          order_id: data.orderId,
          user_id: user.id,
          reason: data.reason,
          requested_amount: Number(o.total ?? 0),
          status: "pending",
        })
        .select("id")
        .single();
      if (error) return { success: false as const, error: error.message };
      await supabase
        .from("orders")
        .update({ refund_status: "requested" })
        .eq("id", data.orderId);
      return { success: true as const, refundId: (created as any)?.id };
    } catch (err: any) {
      return { success: false as const, error: err?.message || "erro" };
    }
  });

export const listMyRefundRequests = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const { user, supabase } = await getUserClient();
      const { data, error } = await supabase
        .from("refund_requests")
        .select("id, order_id, reason, requested_amount, status, admin_notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return { success: false, data: [], error: error.message };
      return { success: true, data: data ?? [] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  }
);

// ----- Perfil --------------------------------------------------------------

export const updateProfile = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      fullName: z.string().min(1).max(120).optional(),
      phone: z.string().max(40).optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    try {
      const { user, supabase } = await getUserClient();
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          phone: data.phone,
        } as any,
      });
      if (error) return { success: false as const, error: error.message };
      const { data: cust } = await supabase
        .from("customers")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (cust) {
        await supabase
          .from("customers")
          .update({ name: data.fullName, phone: data.phone } as any)
          .eq("id", (cust as any).id);
      } else {
        await supabase.from("customers").insert({
          auth_user_id: user.id,
          email: user.email,
          name: data.fullName,
          phone: data.phone,
        } as any);
      }
      return { success: true as const };
    } catch (err: any) {
      return { success: false as const, error: err?.message || "erro" };
    }
  });
