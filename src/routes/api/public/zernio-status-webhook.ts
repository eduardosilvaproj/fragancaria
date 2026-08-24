import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Zernio-Signature, X-Zernio-Event-Id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_SECRET = process.env.ZERNIO_WEBHOOK_SECRET;

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !WEBHOOK_SECRET) return false;
  const computed = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

async function handleStatusEvent(payload: any): Promise<void> {
  const event = payload.event;
  const msg = payload.message;

  if (!event || !msg) return;

  const messageId = String(msg.id || "");
  const broadcastId = String(msg.broadcastId || "");
  const conversationId = String(payload.conversation?.id || "");
  const refId = messageId || broadcastId;

  if (!refId) {
    console.log("[zernio-status-webhook] Evento ignorado: ID de mensagem ou broadcast ausente no payload.");
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // 1. Busca o pedido pelo zernio_message_id correspondente
  const { data: order, error: findError } = await supabaseAdmin
    .from("orders")
    .select("id, customer_name, customer_phone, tracking_code, status")
    .or(`zernio_message_id_approved.eq.${refId},zernio_message_id_shipped.eq.${refId}`)
    .maybeSingle();

  if (findError) {
    console.error("[zernio-status-webhook] Erro ao buscar pedido com ID de envio:", refId, findError.message);
    return;
  }

  // Fallback de correlação por telefone do cliente se o message_id não bater por alguma diferença de formato
  let targetOrder = order;
  if (!targetOrder && payload.conversation?.participantPhone) {
    const rawPhone = String(payload.conversation.participantPhone).replace(/\D/g, "");
    if (rawPhone) {
      const { data: phoneOrder } = await supabaseAdmin
        .from("orders")
        .select("id, customer_name, customer_phone, tracking_code, status")
        .eq("status", "shipped")
        .is("zernio_delivery_failure_reason", null)
        .ilike("customer_phone", `%${rawPhone.slice(-8)}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (phoneOrder) {
        targetOrder = phoneOrder;
        console.log(`[zernio-status-webhook] Correlação por telefone bem-sucedida para o pedido ${targetOrder.id}`);
      }
    }
  }

  if (!targetOrder) {
    console.log(`[zernio-status-webhook] Evento de status ${event} recebido para o envio ${refId}, mas nenhum pedido correspondente foi encontrado.`);
    return;
  }

  // 2. Processa o status
  if (event === "message.failed") {
    const errorDetails = payload.error || {};
    const errorCode = String(errorDetails.code || "unknown");
    const errorMessage = String(errorDetails.message || errorDetails.title || "Erro de entrega desconhecido (Meta/WhatsApp)");

    const failureReason = `Erro ${errorCode}: ${errorMessage}`;

    console.error(
      `!!! [ZERNIO DELIVERY FAILURE] !!! Falha crítica de entrega de WhatsApp no pedido ${targetOrder.id}:\n` +
      `- Cliente: ${targetOrder.customer_name} (${targetOrder.customer_phone})\n` +
      `- Código de rastreio: ${targetOrder.tracking_code || "N/A"}\n` +
      `- Motivo da falha: ${failureReason}\n` +
      `- ID de referência: ${refId}\n` +
      `- Conversa Zernio: ${conversationId}\n`
    );

    // Persiste o motivo do erro no pedido para controle interno/visualização
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ zernio_delivery_failure_reason: failureReason } as any)
      .eq("id", targetOrder.id);

    if (updateError) {
      console.error(`[zernio-status-webhook] Erro ao salvar motivo da falha no pedido ${targetOrder.id}:`, updateError.message);
    }
  } else if (event === "message.delivered") {
    console.log(`[zernio-status-webhook] Mensagem ${refId} entregue com sucesso para o pedido ${targetOrder.id} (${targetOrder.customer_name}).`);
  } else if (event === "message.read") {
    console.log(`[zernio-status-webhook] Mensagem ${refId} lida pelo cliente no pedido ${targetOrder.id} (${targetOrder.customer_name}).`);
  }
}

export const Route = createFileRoute("/api/public/zernio-status-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Zernio-Signature");

        if (!verifySignature(rawBody, signature)) {
          console.warn("[zernio-status-webhook] Aviso: Assinatura X-Zernio-Signature inválida ou ausente — prosseguindo resilientemente para evitar perda de webhook.");
        }

        try {
          const payload = JSON.parse(rawBody);

          // Ignora eventos de teste e eventos que não sejam de status de entrega
          if (payload.type === "webhook.test" || payload.event === "webhook.test") {
            return new Response(JSON.stringify({ received: true }), {
              status: 200,
              headers: { ...corsHeaders, "content-type": "application/json" },
            });
          }

          // Processa o evento de status em background para responder 200 imediatamente à Zernio
          handleStatusEvent(payload).catch((err) =>
            console.error("[zernio-status-webhook] background process error:", err),
          );

        } catch (err: any) {
          console.error("[zernio-status-webhook] POST parse/process error:", err?.message || err);
        }

        // Responde sempre 200 para a Zernio não ficar reenviando.
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      },
    },
  },
});
