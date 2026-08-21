import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendZernioWhatsAppTemplate, isWhatsAppEnabled } from "./zernio-whatsapp.functions";

type WhatsAppOrderRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  whatsapp_sent_approved: string | null;
  whatsapp_sent_shipped: string | null;
};

type WhatsAppSentField = "whatsapp_sent_approved" | "whatsapp_sent_shipped";

async function claimWhatsAppSend(orderId: string, field: WhatsAppSentField) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ [field]: now } as any)
    .eq("id", orderId)
    .is(field, null)
    .select("id, customer_name, customer_phone, whatsapp_sent_approved, whatsapp_sent_shipped")
    .maybeSingle();

  if (error) throw error;
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
        templateName: "pedido_aprovado",
        templateParams: [
          { type: "text" as const, text: firstName },
          { type: "text" as const, text: shortId },
        ],
      };
}

async function sendTransactionalWhatsApp(orderId: string, field: WhatsAppSentField, trackingCode?: string): Promise<void> {
  try {
    const enabled = await isWhatsAppEnabled();
    if (!enabled) return;

    const order = await claimWhatsAppSend(orderId, field);
    if (!order) return;

    const phone = order.customer_phone;
    if (!phone) {
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
      await markWhatsAppSendFailed(orderId, field);
    }
  } catch (err) {
    console.error("[OrderWhatsApp] Erro ao enviar WhatsApp transacional:", err);
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
