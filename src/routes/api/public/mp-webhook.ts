import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          console.log("MP webhook:", JSON.stringify(body));

          const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
          if (!MP_ACCESS_TOKEN) {
            return Response.json({ error: "MP_ACCESS_TOKEN não configurado" }, { status: 500, headers: corsHeaders });
          }

          if (body?.type === "payment" && body?.data?.id) {
            const paymentId = String(body.data.id);
            const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
            });
            const payment: any = await res.json();

            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { error } = await supabaseAdmin.from("orders" as any).upsert(
              {
                payment_id: paymentId,
                status: payment.status,
                amount: payment.transaction_amount,
                payment_method: payment.payment_method_id,
                payer_email: payment.payer?.email,
                raw: payment,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "payment_id" },
            );
            if (error) console.error("orders upsert error", error);
            console.log(`Pagamento ${paymentId} atualizado: ${payment.status}`);
          }

          return Response.json({ received: true }, { headers: corsHeaders });
        } catch (err: any) {
          console.error("Webhook error", err);
          return Response.json({ error: err?.message ?? "error" }, { status: 500, headers: corsHeaders });
        }
      },
    },
  },
});