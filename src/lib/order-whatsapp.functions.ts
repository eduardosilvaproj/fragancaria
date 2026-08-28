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

  const { data, error } = await (supabaseAdmin as any).rpc("claim_whatsapp_send", {
    p_order_id: orderId,
    p_field: field,
  });

  if (error) {
    console.error(`[OrderWhatsApp] Erro ao reivindicar ${field} para ${orderId}:`, error.message, error.details, error.hint);
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    console.warn(`[OrderWhatsApp] Reivindicação não aplicada para ${orderId} (${field}): linha já tinha valor ou não foi atualizada.`);
    return null;
  }

  console.log(`[OrderWhatsApp] Reivindicação aplicada para ${orderId} (${field}):`, {
    id: row.id,
    whatsapp_sent_approved: row.whatsapp_sent_approved,
    whatsapp_sent_shipped: row.whatsapp_sent_shipped,
  });
  return row as WhatsAppOrderRow;
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

    if (field === "whatsapp_sent_shipped" && !trackingCode) {
      console.warn(`[OrderWhatsApp] Falha no envio de pedido enviado para ${orderId}: código de rastreio ausente.`);
      return;
    }

    // Carrega pedido para verificar telefone antes de reivindicar
    const { data: rawOrder, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, total, customer_name, customer_phone, whatsapp_sent_approved, whatsapp_sent_shipped")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError || !rawOrder) {
      console.warn(`[OrderWhatsApp] Pedido ${orderId} não encontrado para envio de WhatsApp.`);
      return;
    }

    const phone = rawOrder.customer_phone;
    if (!phone) {
      console.warn(`[OrderWhatsApp] Falha no envio para ${orderId}: cliente sem número de telefone cadastrado.`);
      return;
    }

    const order = await claimWhatsAppSend(orderId, field);
    if (!order) {
      console.log(`[OrderWhatsApp] Envio ignorado para ${orderId} (${field}): já enviado anteriormente (idempotência) ou pedido não encontrado.`);
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
      // Falha após o claim: não zerar a trava automaticamente para evitar reenvio duplicado
    } else {
      console.log(`[OrderWhatsApp] Sucesso ao disparar ${payload.templateName} para ${orderId} (${phone}). IDs:`, {
        broadcastId: res.broadcastId,
        messageId: res.messageId,
      });

      // Grava o ID de referência do envio no banco de dados para conciliar webhooks de status de entrega
      const refId = res.messageId || res.broadcastId;
      if (refId) {
        const idField = field === "whatsapp_sent_approved" ? "zernio_message_id_approved" : "zernio_message_id_shipped";
        const { error: updateIdError } = await supabaseAdmin
          .from("orders")
          .update({ [idField]: refId } as any)
          .eq("id", orderId);

        if (updateIdError) {
          console.error(`[OrderWhatsApp] Erro ao atualizar ${idField} para o pedido ${orderId}:`, updateIdError.message);
        }
      }
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

export function getAdminPhones(): string[] {
  const raw = process.env.WHATSAPP_ADMIN_PHONES || "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Dispara alerta de venda aprovada para os sócios/admins configurados.
 * Utiliza o template dedicado "alerta_nova_venda" (requer aprovação prévia pela Meta).
 * O envio permanece inativo por padrão até que WHATSAPP_PARTNER_ALERTS_ENABLED seja "true".
 */
export async function sendPartnersSaleAlertWhatsApp(orderId: string): Promise<void> {
  try {
    // Guarda de ativação: inativo por padrão até que a Meta aprove o template
    if (process.env.WHATSAPP_PARTNER_ALERTS_ENABLED !== "true") {
      console.log(`[OrderWhatsApp] Alerta de sócios ignorado para ${orderId}: WHATSAPP_PARTNER_ALERTS_ENABLED não está ativo (aguardando aprovação da Meta do template 'alerta_nova_venda').`);
      return;
    }

    const adminPhones = getAdminPhones();
    if (adminPhones.length === 0) return;

    const { data: rawOrder, error: fetchError } = await (supabaseAdmin
      .from("orders") as any)
      .select("id, total, customer_name, order_number")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError || !rawOrder) return;

    const shortId = (rawOrder.order_number || rawOrder.id).slice(0, 12).toUpperCase();
    const totalFormatted = formatBRL(rawOrder.total || 0);
    const customerName = rawOrder.customer_name || "Cliente";

    for (const phone of adminPhones) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!cleanPhone) continue;

      const res = await sendZernioWhatsAppTemplate({
        phone: cleanPhone,
        templateName: "alerta_nova_venda",
        templateParams: [
          { type: "text", text: shortId },
          { type: "text", text: customerName },
          { type: "text", text: totalFormatted },
        ],
        category: "utility",
      });

      if (!res.success) {
        console.error(`[OrderWhatsApp] Falha ao enviar alerta de venda para sócio (${cleanPhone}):`, res.error);
      }
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error(`[OrderWhatsApp] Exceção ao enviar alerta de venda para sócios no pedido ${orderId}:`, errorMessage);
  }
}

