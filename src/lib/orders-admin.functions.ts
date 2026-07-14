import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server fns para o painel /admin/pedidos. Antes: usava supabase client direto
// no browser, dependia das 3 policies USING(true) abertas. Agora: server fn
// com requireAdmin + supabaseAdmin (bypass RLS). O guard beforeLoad em
// src/routes/admin.tsx ja barra visitantes, mas a defesa em profundidade
// aqui significa que mesmo se o guard for burlado, o service role nunca
// aceita input anonimo (sem o cookie, requireAdmin joga 401).
//
// Por design: SELECT/UPDATE de pedidos por admin sao SEMPRE via service
// role. A camada RLS para admin seria fragil (RLS depende de JWT claim, e
// admins nao tem role custom no JWT). O caminho limpo eh:
//   client -> server fn -> admin check -> service role -> DB.

const orderIdSchema = z.string().uuid();

// A2: search sanitization. PostgREST .or() injects raw syntax into the
// parser, so untrusted input MUST NOT pass through verbatim. We strip a
// fixed character class (commas, parens, dots, quotes, whitespace, backslash)
// that has no meaning in id/email/name matching and is the only path to
// PostgREST syntax injection.
function sanitizeSearch(raw: string): string {
  return raw
    .replace(/[(),."'`\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AdminOrderRow = {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  total: number;
  subtotal: number;
  shippingPrice: number;
  discount: number;
  customerEmail: string;
  customerName: string;
  payerEmail: string | null;
  createdAt: string;
  paymentId: string | null;
  trackingCode: string | null;
  refundStatus: string | null;
  items: Array<Record<string, unknown>>;
  authUserId: string | null;
  shippingAddress: Record<string, unknown> | null;
  shippingMethod: string | null;
  nfeKey: string | null;
  nfeNumber: number | null;
  nfeStatus: string | null;
};

export type AdminOrderList = {
  orders: AdminOrderRow[];
  total: number;
};

// B2: tracking_url REMOVED from the projection. Column does not exist in
// public.orders; any reference would error at query time. Tracking URL,
// if needed in the future, is built client-side from tracking_code.
const LIST_COLUMNS = [
  "id",
  "status",
  "payment_status",
  "payment_method",
  "total",
  "subtotal",
  "shipping_price",
  "discount",
  "customer_email",
  "customer_name",
  "payer_email",
  "created_at",
  "payment_id",
  "tracking_code",
  "refund_status",
  "items",
  "auth_user_id",
  "shipping_address",
  "shipping_method",
  "nfe_key",
  "nfe_number",
  "nfe_status",
].join(", ");

export const getAllOrdersForAdmin = createServerFn({ method: "GET" })
  .validator(
    (d: unknown) =>
      z
        .object({
          status: z.string().optional(),
          paymentStatus: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().int().positive().max(200).optional(),
          offset: z.number().int().nonnegative().optional(),
        })
        .parse(d),
  )
  .handler(
    // @ts-expect-error Generated `orders` row type lacks tracking_token/auth_user_id/refund_status columns, causing
    // serialization in TS to flake out. Fixed after `supabase gen types typescript`
    // is re-run post-migrations. See docs/agente-fase1.md (pendência: types).
    async ({
      data,
    }): Promise<
      { success: true; data: AdminOrderList } | { success: false; error: string }
    > => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const limit = data.limit ?? 50;
        const offset = data.offset ?? 0;

        let query = supabaseAdmin
          .from("orders")
          .select(LIST_COLUMNS, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (data.status) query = query.eq("status", data.status);
        if (data.paymentStatus)
          query = query.eq("payment_status", data.paymentStatus);
        if (data.search && data.search.length > 0) {
          // A2: sanitize + only inject id.eq. when the cleaned input is
          // a uuid. Anything else is a string match by email or name.
          const cleaned = sanitizeSearch(data.search);
          if (cleaned.length > 0) {
            const ilike =
              "%" + cleaned.replace(/[%_]/g, (c) => "\\" + c) + "%";
            const orParts = [
              "customer_email.ilike." + ilike,
              "customer_name.ilike." + ilike,
            ];
            if (uuidRegex.test(cleaned)) {
              orParts.push("id.eq." + cleaned);
            }
            query = query.or(orParts.join(","));
          }
        }

        const { data: rows, error, count } = await query;
        if (error) return { success: false, error: error.message };

        const orders: AdminOrderRow[] = (
          (rows ?? []) as unknown as Array<Record<string, unknown>>
        ).map((r) => ({
          id: String(r.id),
          status: String(r.status ?? "pending"),
          paymentStatus: String(r.payment_status ?? "pending"),
          paymentMethod: (r.payment_method as string | null) ?? null,
          total: Number(r.total ?? 0),
          subtotal: Number(r.subtotal ?? 0),
          shippingPrice: Number(r.shipping_price ?? 0),
          discount: Number(r.discount ?? 0),
          customerEmail: String(r.customer_email ?? ""),
          customerName: String(r.customer_name ?? ""),
          payerEmail: (r.payer_email as string | null) ?? null,
          createdAt: String(r.created_at ?? ""),
          paymentId: (r.payment_id as string | null) ?? null,
          trackingCode: (r.tracking_code as string | null) ?? null,
          refundStatus: (r.refund_status as string | null) ?? null,
          items: Array.isArray(r.items)
            ? (r.items as Array<Record<string, unknown>>)
            : [],
          authUserId: (r.auth_user_id as string | null) ?? null,
          shippingAddress: (r.shipping_address as Record<string, unknown> | null) ?? null,
          shippingMethod: (r.shipping_method as string | null) ?? null,
          nfeKey: (r.nfe_key as string | null) ?? null,
          nfeNumber: (r.nfe_number as number | null) ?? null,
          nfeStatus: (r.nfe_status as string | null) ?? null,
        }));

        return {
          success: true,
          data: { orders, total: count ?? orders.length },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const updateOrderForAdmin = createServerFn({ method: "POST" })
  .validator(
    (d: unknown) =>
      z
        .object({
          orderId: orderIdSchema,
          patch: z
            .object({
              status: z.string().min(1).max(64).optional(),
              paymentStatus: z.string().min(1).max(64).optional(),
              trackingCode: z.string().min(1).max(120).nullable().optional(),
              refundStatus: z.string().min(1).max(64).nullable().optional(),
            })
            .strict(),
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

        // Se o admin está mudando o status, valida a transição contra a
        // máquina de estados. Bloqueia saltos impossíveis (ex.: pending ->
        // delivered sem pagar) e regressões (ex.: delivered -> paid).
        let notify: {
          status: "shipped" | "delivered";
          email: string;
          name: string;
          trackingCode: string | null;
        } | null = null;
        if (data.patch.status !== undefined) {
          const { canTransition } = await import("@/lib/order-state");
          const { data: current, error: readErr } = await supabaseAdmin
            .from("orders")
            .select("status, customer_email, customer_name, tracking_code")
            .eq("id", data.orderId)
            .maybeSingle();
          if (readErr || !current) {
            return { success: false, error: "Pedido não encontrado" };
          }
          const c = current as {
            status: string;
            customer_email: string | null;
            customer_name: string | null;
            tracking_code: string | null;
          };
          const from = String(c.status);
          if (!canTransition(from, data.patch.status)) {
            return {
              success: false,
              error: `Transição inválida: ${from} → ${data.patch.status}`,
            };
          }
          if (
            (data.patch.status === "shipped" || data.patch.status === "delivered") &&
            c.customer_email
          ) {
            notify = {
              status: data.patch.status,
              email: c.customer_email,
              name: c.customer_name ?? "",
              // trackingCode do patch tem prioridade (admin pode setar junto).
              trackingCode: data.patch.trackingCode ?? c.tracking_code,
            };
          }
        }

        const updatePayload: Record<string, unknown> = {};
        if (data.patch.status !== undefined)
          updatePayload.status = data.patch.status;
        if (data.patch.paymentStatus !== undefined)
          updatePayload.payment_status = data.patch.paymentStatus;
        if (data.patch.trackingCode !== undefined)
          updatePayload.tracking_code = data.patch.trackingCode;
        if (data.patch.refundStatus !== undefined)
          updatePayload.refund_status = data.patch.refundStatus;

        if (Object.keys(updatePayload).length === 0) {
          return { success: false, error: "nenhum campo para atualizar" };
        }

        const { error } = await supabaseAdmin
          .from("orders")
          .update(updatePayload as unknown as Record<string, never>)
          .eq("id", data.orderId);
        if (error) return { success: false, error: error.message };

        // Notifica o cliente por e-mail quando o pedido foi enviado/entregue.
        // Não bloqueia a resposta se o envio falhar.
        if (notify) {
          const { sendOrderStatusEmail } = await import("@/lib/email.functions");
          await sendOrderStatusEmail({
            orderId: data.orderId,
            customerName: notify.name,
            customerEmail: notify.email,
            status: notify.status,
            trackingCode: notify.trackingCode,
          }).catch((err) =>
            console.warn("[updateOrderForAdmin] e-mail de status falhou (não bloqueia)", err),
          );
        }
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );