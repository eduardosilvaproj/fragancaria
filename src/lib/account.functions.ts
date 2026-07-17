import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Server functions da area do cliente (/minha-conta).
//
// Pos-lockdown de RLS em orders (20260708b), seguimos o mesmo padrao de
// payments/orders-admin/tracking: validar o Bearer token do usuario (anexado
// no cliente por attachSupabaseAuth) e usar supabaseAdmin (service role) com
// escopo manual por user.id / customer_email em cada query. Assim nao
// dependemos de haver policy RLS por tabela, e o fluxo funciona esteja ou nao
// o lockdown aplicado em prod.

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
  // types.ts esta incompleto (faltam customers/wishlist/notifications/etc — ver
  // B2). Cast frouxo ate a regeneracao dos types; o file ja faz `as any` nos
  // resultados. Nao depende do B2 para compilar/rodar.
  return {
    user: data.user,
    supabase: supabaseAdmin as unknown as SupabaseClient,
  } as const;
}

function emailScope(email: string | undefined) {
  return (email ?? "").trim().toLowerCase().replace(/[%_]/g, (c) => `\\${c}`);
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

export const linkCurrentAccount = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const email = user.email?.trim().toLowerCase();
      if (!email) return { success: false, error: "Conta sem e-mail" };

      const { data, error } = await supabase
        .from("customers")
        .select("id, auth_user_id, created_at")
        .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
        .order("created_at", { ascending: true });
      if (error) return { success: false, error: error.message };

      const customers = (data ?? []) as Array<{
        id: string;
        auth_user_id: string | null;
        created_at: string;
      }>;
      const ownCustomer = customers.find((customer) => customer.auth_user_id === user.id);
      const guestCustomer = customers.find((customer) => customer.auth_user_id === null);
      const foreignCustomer = customers.find(
        (customer) => customer.auth_user_id !== null && customer.auth_user_id !== user.id,
      );

      if (!ownCustomer && foreignCustomer) {
        return { success: false, error: "Este e-mail já está vinculado a outra conta" };
      }

      if (guestCustomer && !ownCustomer) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({ auth_user_id: user.id } as any)
          .eq("id", guestCustomer.id);
        if (updateError) return { success: false, error: updateError.message };
      } else if (!ownCustomer) {
        const meta = user.user_metadata as Record<string, unknown>;
        const name = (meta.full_name as string) || (meta.name as string) || null;
        const { error: insertError } = await supabase.from("customers").insert({
          auth_user_id: user.id,
          email,
          name,
        } as any);
        if (insertError) return { success: false, error: insertError.message };
      }

      const { error: ordersError } = await supabase
        .from("orders")
        .update({ auth_user_id: user.id } as any)
        .is("auth_user_id", null)
        .ilike("customer_email", email.replace(/[\\%_]/g, "\\$&"));
      if (ordersError) return { success: false, error: ordersError.message };

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "erro" };
    }
  },
);

export const getMyDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data?: DashboardSummary; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const email = emailScope(user.email);
      const orderScope = `auth_user_id.eq.${user.id},customer_email.ilike.${email}`;
      const [customer, orders, activeOrders, wishlist, unread] = await Promise.all([
        supabase
          .from("customers")
          .select("loyalty_points, loyalty_tier")
          .eq("auth_user_id", user.id)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .or(orderScope),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .or(orderScope)
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
      const email = emailScope(user.email);
      // Itens ficam na coluna JSON orders.items (schema canonico); nao existe
      // tabela order_items em prod. Shape gravado por createPayment: cartItem
      // { id, title, quantity, price, image }.
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, created_at, status, payment_status, refund_status, total, tracking_code, items")
        .or(`auth_user_id.eq.${user.id},customer_email.ilike.${email}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return { success: false, data: [], error: error.message };
      const mapped: MyOrder[] = (orders ?? []).map((o: any) => ({
        id: o.id,
        createdAt: o.created_at ?? "",
        status: o.status ?? "pending",
        paymentStatus: o.payment_status ?? "pending",
        refundStatus: o.refund_status ?? null,
        total: Number(o.total ?? 0),
        trackingCode: o.tracking_code ?? null,
        trackingUrl: null,
        items: (Array.isArray(o.items) ? o.items : []).map((it: any) => ({
          name: it.title ?? it.name ?? "",
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
        const email = emailScope(user.email);
        const { data: order, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", data.orderId)
          .or(`auth_user_id.eq.${user.id},customer_email.ilike.${email}`)
          .maybeSingle();
        if (error || !order) return { success: false, error: "Pedido nao encontrado" };
        const o: any = order;
        // Itens e histórico vêm das colunas JSON de orders (schema canônico de
        // prod). Não existem tabelas order_items / order_status_history.
        // items: { id, title, quantity, price, image } (gravado por createPayment).
        // status_history: { status, detail, at } (gravado por mp-webhook/admin).
        const items = Array.isArray(o.items) ? o.items : [];
        const history = Array.isArray(o.status_history) ? o.status_history : [];
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
            trackingUrl: null,
            items: items.map((it: any) => ({
              name: it.title ?? it.name ?? "",
              quantity: Number(it.quantity ?? 0),
              price: Number(it.price ?? 0),
            })),
            history: history.map((h: any) => ({
              status: h.status ?? "",
              createdAt: h.at ?? h.created_at ?? "",
              notes: h.detail ?? h.notes ?? null,
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

// ----- Endereços -----------------------------------------------------------

export type CustomerAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  isDefault: boolean;
};

const addressInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().max(60).optional(),
  recipientName: z.string().min(1).max(120),
  cep: z.string().min(8).max(9),
  street: z.string().min(1).max(200),
  number: z.string().min(1).max(20),
  complement: z.string().max(120).optional(),
  neighborhood: z.string().min(1).max(120),
  city: z.string().min(1).max(120),
  state: z.string().length(2),
  isDefault: z.boolean().optional(),
});

function rowToAddress(r: any): CustomerAddress {
  return {
    id: r.id,
    label: r.label ?? null,
    recipientName: r.recipient_name ?? "",
    cep: r.cep ?? "",
    street: r.street ?? "",
    number: r.number ?? "",
    complement: r.complement ?? null,
    neighborhood: r.neighborhood ?? "",
    city: r.city ?? "",
    state: r.state ?? "",
    isDefault: Boolean(r.is_default),
  };
}

export const listMyAddresses = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data: CustomerAddress[]; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const { data, error } = await supabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) return { success: false, data: [], error: error.message };
      return { success: true, data: (data ?? []).map(rowToAddress) };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  }
);

export const saveAddress = createServerFn({ method: "POST" })
  .validator((d: unknown) => addressInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const row: Record<string, unknown> = {
        user_id: user.id,
        label: data.label ?? null,
        recipient_name: data.recipientName,
        cep: data.cep.replace(/\D/g, ""),
        street: data.street,
        number: data.number,
        complement: data.complement ?? null,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state.toUpperCase(),
        is_default: data.isDefault ?? false,
      };

      // O índice único parcial garante um só default por usuário. Se este vai
      // ser o default, limpa o default anterior antes de gravar.
      if (data.isDefault) {
        await supabase
          .from("customer_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("is_default", true);
      }

      if (data.id) {
        const { error } = await supabase
          .from("customer_addresses")
          .update(row)
          .eq("id", data.id)
          .eq("user_id", user.id);
        if (error) return { success: false, error: error.message };
        return { success: true, id: data.id };
      }
      const { data: inserted, error } = await supabase
        .from("customer_addresses")
        .insert(row)
        .select("id")
        .single();
      if (error || !inserted) return { success: false, error: error?.message || "erro" };
      return { success: true, id: (inserted as { id: string }).id };
    } catch (err: any) {
      return { success: false, error: err?.message || "erro" };
    }
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      const { error } = await supabase
        .from("customer_addresses")
        .delete()
        .eq("id", data.id)
        .eq("user_id", user.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "erro" };
    }
  });

export const setDefaultAddress = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { user, supabase } = await getUserClient();
      await supabase
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
      const { error } = await supabase
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", data.id)
        .eq("user_id", user.id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "erro" };
    }
  });

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
      const email = emailScope(user.email);
      const { data: order } = await supabase
        .from("orders")
        .select("id, total, status")
        .eq("id", data.orderId)
        .or(`auth_user_id.eq.${user.id},customer_email.ilike.${email}`)
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
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          full_name: data.fullName,
          phone: data.phone,
        },
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
