import { createFileRoute } from "@tanstack/react-router";
import {
  handleMpWebhookRequest,
  mpWebhookCorsHeaders,
  type WebhookOrder,
  type WebhookUpdate,
} from "@/lib/mp-webhook-handler";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: mpWebhookCorsHeaders }),
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const accessToken = process.env.MP_ACCESS_TOKEN;

        return handleMpWebhookRequest(request, {
          webhookSecret: process.env.MP_WEBHOOK_SECRET,
          isDevelopment: process.env.NODE_ENV === "development",
          fetchPayment: async (paymentId) => {
            if (!accessToken) throw new Error("MP_ACCESS_TOKEN nao configurado");
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!response.ok) throw new Error(`Mercado Pago respondeu ${response.status}`);
            return response.json();
          },
          findOrderById: async (orderId) => {
            const { data, error } = await supabaseAdmin
              .from("orders")
              .select("id, status, payment_status, payment_id, status_history, shipping_address, customer_phone, customer_cpf, affiliate_id, affiliate_link_id, affiliate_commission_rate, subtotal, discount, total")
              .eq("id", orderId)
              .maybeSingle();
            if (error) throw error;
            return data as WebhookOrder | null;
          },
          findOrderByPaymentId: async (paymentId) => {
            const { data, error } = await supabaseAdmin
              .from("orders")
              .select("id, status, payment_status, payment_id, status_history, shipping_address, customer_phone, customer_cpf, affiliate_id, affiliate_link_id, affiliate_commission_rate, subtotal, discount, total")
              .eq("payment_id", paymentId)
              .maybeSingle();
            if (error) throw error;
            return data as WebhookOrder | null;
          },
          updateOrder: async (orderId, patch: WebhookUpdate) => {
            const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
            if (error) throw error;
          },
          // Busca os dados do pedido aqui (e não no handler) para manter o
          // handler puro e testável sem banco. Silencioso de propósito: e-mail
          // não pode derrubar o processamento do pagamento.
          sendPaymentConfirmedEmail: async (orderId) => {
            const { data, error } = await supabaseAdmin
              .from("orders")
              .select("tracking_token, total, items, customer_name, customer_email, payer_email")
              .eq("id", orderId)
              .maybeSingle();
            if (error) throw error;
            const order = data as unknown as {
              tracking_token?: string | null;
              total?: number | null;
              items?: unknown;
              customer_name?: string | null;
              customer_email?: string | null;
              payer_email?: string | null;
            } | null;
            // payer_email é o que o MP devolveu; customer_email é o do checkout.
            // Sem e-mail ou sem token não há como montar a mensagem.
            const email = order?.customer_email || order?.payer_email;
            if (!order?.tracking_token || !email) {
              console.warn("[mp-webhook] sem e-mail/token para confirmar", { orderId });
              return;
            }
            const { sendOrderConfirmationEmail } = await import("@/lib/email.functions");
            const { formatToken } = await import("@/lib/payments.functions");
            await sendOrderConfirmationEmail({
              orderId,
              customerName: order.customer_name || "cliente",
              customerEmail: email,
              total: Number(order.total ?? 0),
              trackingTokenFormatted: formatToken(order.tracking_token),
              items: Array.isArray(order.items) ? (order.items as any[]) : [],
            });
          },
          // Consumo do cupom na aprovação. Lê orders.coupon_code (gravado por
          // createPayment) e incrementa coupons.usage_count. rpc atômico para
          // não perder contagem sob concorrência (dois webhooks do mesmo
          // pedido não acontecem — a guarda do handler garante —, mas dois
          // pedidos com o mesmo cupom, sim). Fallback para read-modify-write se
          // a função SQL não existir.
          incrementCouponUsage: async (orderId) => {
            const { data, error } = await supabaseAdmin
              .from("orders")
              .select("coupon_code")
              .eq("id", orderId)
              .maybeSingle();
            if (error) throw error;
            const code = (data as { coupon_code?: string | null } | null)?.coupon_code;
            if (!code) return; // pedido sem cupom, nada a fazer
            const { error: rpcErr } = await supabaseAdmin.rpc(
              "increment_coupon_usage",
              { p_code: code } as unknown as Database["public"]["Functions"]["increment_coupon_usage"]["Args"],
            );
            if (rpcErr) throw rpcErr;
          },
          createAffiliateSale: async (params) => {
            const commissionAmount = Number((params.commissionBase * params.commissionRate).toFixed(2));
            const { error } = await supabaseAdmin.from("affiliate_sales").insert({
              order_id: params.orderId,
              affiliate_id: params.affiliateId,
              link_id: params.linkId,
              order_total: params.orderTotal,
              commission_base: params.commissionBase,
              commission_rate: params.commissionRate,
              commission_amount: commissionAmount,
              status: "confirmed",
              confirmed_at: params.confirmedAt,
            });
            if (error && !error.message?.includes("duplicate key")) throw error;
          },
        });
      },
    },
  },
});
