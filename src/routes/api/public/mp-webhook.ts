import { createFileRoute } from "@tanstack/react-router";
import {
  handleMpWebhookRequest,
  mpWebhookCorsHeaders,
  type WebhookOrder,
  type WebhookUpdate,
} from "@/lib/mp-webhook-handler";

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
              status: "pending",
            });
            if (error && !error.message?.includes("duplicate key")) throw error;
          },
        });
      },
    },
  },
});
