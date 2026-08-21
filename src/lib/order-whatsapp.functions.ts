import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendZernioWhatsAppTemplate, isWhatsAppEnabled } from "./zernio-whatsapp.functions";
import { formatBRL } from "./utils";

type WhatsAppOrderRow = {
  id: string;
  total: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  whatsapp_sent_approved: string | null;
  whatsapp_sent_shipped: string | null;
};

type WhatsAppSentField = "whatsapp_sent_approved" | "whatsapp_sent_shipped";

async function claimWhatsAppSend(orderId: string, field: WhatsAppSentField) {
  const now = new Date().toISOString();
  console.log(`[OrderWhatsApp] Tentando reivindicar ${field} para o pedido ${orderId} com timestamp ${now}`);

  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ [field]: now } as any)
    .eq("id", orderId)
    .is(field, null)
    .select("id, total, customer_name, customer_phone, whatsapp_sent_approved, whatsapp_sent_shipped")
    .maybeSingle();

  if (error) {
    console.error(`[OrderWhatsApp] Erro ao reivindicar ${field} para ${orderId}:`, error.message, error.details, error.hint);
    throw error;
  }

  console.log(`[OrderWhatsApp] Resultado da reivindicação para ${orderId} (${field}):`, data ? "SUCESSO (reivindicado)" : "JÁ REIVINDICADO ANTERIORMENTE ou NENHUMA LINHA ATUALIZADA");
  return (data as WhatsAppOrderRow | null) ?? null;
}

async function markWhatsAppSendFailed(orderId: string, field: WhatsAppSentField) {
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ [field]: null } as any)
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
}

function buildWhatsAppPayload(order: WhatsAppOrderRow, trackingCode?: string) {
  const firstName = (order.customer_name || "Cliente").split(" ")[0] || "Cliente";
  const shortId = order.id.slice(0, 8).toUpperCase();

  return trackingCode
    ? {
        templateName: "pedido_enviado",
        templateParams: [
          { type: "text" as const, text: firstName },
          { type: "text" as const, text: shortId },
          { type: "text" as const, text: trackingCode },
        ],
      }
    : {
        templateName: "venda_aprovada",
        templateParams: [
          { type: "text" as const, text: firstName },
          { type: "text" as const, text: shortId },
          { type: "text" as const, text: formatBRL(order.total || 0) },
        ],
      };
}

async function sendTransactionalWhatsApp(orderId: string, field: WhatsAppSentField, trackingCode?: string): Promise<void> {
  try {
    const enabled = await isWhatsAppEnabled();
    if (!enabled) {
      console.log(`[OrderWhatsApp] Envio ignorado para ${orderId}: WhatsApp desativado nas configurações.`);
      return;
    }

    const order = await claimWhatsAppSend(orderId, field);
    if (!order) {
      console.log(`[OrderWhatsApp] Envio ignorado para ${orderId} (${field}): já enviado anteriormente (idempotência) ou pedido não encontrado.`);
      return;
    }

    const phone = order.customer_phone;
    if (!phone) {
      console.warn(`[OrderWhatsApp] Falha no envio para ${orderId}: cliente sem número de telefone cadastrado.`);
      await markWhatsAppSendFailed(orderId, field);
      return;
    }

    if (field === "whatsapp_sent_shipped" && !trackingCode) {
      console.warn(`[OrderWhatsApp] Falha no envio de pedido enviado para ${orderId}: código de rastreio ausente.`);
      await markWhatsAppSendFailed(orderId, field);
      return;
    }

    const payload = buildWhatsAppPayload(order, trackingCode);
    const res = await sendZernioWhatsAppTemplate({
      phone,
      templateName: payload.templateName,
      templateParams: payload.templateParams,
      category: "utility",
    });

    if (!res.success) {
      console.error(`[OrderWhatsApp] Erro ao disparar template ${payload.templateName} para ${orderId}:`, res.error);
      await markWhatsAppSendFailed(orderId, field);
    } else {
      console.log(`[OrderWhatsApp] Sucesso ao disparar ${payload.templateName} para ${orderId} (${phone}).`);
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`[OrderWhatsApp] Exceção crítica ao processar envio para ${orderId}:`, errorMessage);
  }
}

/**
 * Dispara o WhatsApp de Venda Aprovada (Utility)
 */
export async function sendVendaAprovadaWhatsApp(orderId: string): Promise<void> {
  await sendTransactionalWhatsApp(orderId, "whatsapp_sent_approved");
}

/**
 * Dispara o WhatsApp de Pedido Enviado / Rastreio (Utility)
 */
export async function sendPedidoEnviadoWhatsApp(orderId: string, trackingCode: string): Promise<void> {
  await sendTransactionalWhatsApp(orderId, "whatsapp_sent_shipped", trackingCode);
}
