import { createFileRoute } from "@tanstack/react-router";
import {
  runSincronizarRastreiosCore,
  type SincronizarRastreiosResult,
} from "@/lib/logistics.functions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cron-Secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const CRON_SECRET = process.env.CRON_SECRET;

// Variável de ambiente opcional específica para este endpoint
// Se não estiver configurada, usa CRON_SECRET
const MELHOR_ENVIO_CRON_SECRET = process.env.MELHOR_ENVIO_CRON_SECRET || CRON_SECRET;

export const Route = createFileRoute("/api/cron/sincronizar-rastreios")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => handleCron(request),
      POST: async ({ request }) => handleCron(request),
    },
  },
});

async function handleCron(request: Request) {
  const secret = request.headers.get("X-Cron-Secret") || new URL(request.url).searchParams.get("secret");

  // Rejeita acesso se nenhum segredo de cron estiver configurado ou se o segredo enviado for incorreto.
  // Exige o segredo SEMPRE, em qualquer ambiente (produção, desenvolvimento, etc).
  const hasSecret = MELHOR_ENVIO_CRON_SECRET && secret !== MELHOR_ENVIO_CRON_SECRET;
  if (!MELHOR_ENVIO_CRON_SECRET || hasSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    console.log("[SincronizarRastreiosCron] Iniciando sincronização automática de rastreios...");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { consultarRastreioEmLote } = await import("@/lib/melhor-envio-client.server");

    const NOTIFICAR_ENTREGUE_ENABLED = process.env.NOTIFICAR_ENTREGUE_ENABLED === "true";

    const result = await runSincronizarRastreiosCore(supabaseAdmin, consultarRastreioEmLote, {
      onDelivered: NOTIFICAR_ENTREGUE_ENABLED
        ? async ({ orderId, customerName, customerEmail, trackingCode }) => {
            try {
              const { sendOrderStatusEmail } = await import("@/lib/email.functions");
              await sendOrderStatusEmail({
                orderId,
                customerName,
                customerEmail,
                status: "delivered",
                trackingCode,
              });
            } catch (notifyErr) {
              console.warn(
                `[SincronizarRastreiosCron] Notificação de entrega falhou para pedido ${orderId}:`,
                notifyErr,
              );
            }
          }
        : undefined,
    });

    const summary: SincronizarRastreiosResult & { timestamp?: string } = {
      ...result,
      timestamp: new Date().toISOString(),
    };

    console.log("[SincronizarRastreiosCron] Execução concluída:", summary);

    return new Response(JSON.stringify(summary), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal Error";
    console.error("[SincronizarRastreiosCron] Erro fatal na execução:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
}
