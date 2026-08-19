import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendZernioWhatsAppTemplate, isWhatsAppEnabled } from "./zernio-whatsapp.functions";

/**
 * Dispara o WhatsApp de Venda Aprovada (Utility)
 */
export async function sendVendaAprovadaWhatsApp(orderId: string): Promise<void> {
  try {
    const enabled = await isWhatsAppEnabled();
    if (!enabled) return;

    // Buscar dados do pedido
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, total, customer_name, customer_phone, auth_user_id, customer_email, whatsapp_sent_approved")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) return;
    const ord = order as any;

    if (ord.whatsapp_sent_approved) {
      // Já enviado anteriormente, evita duplicidade
      return;
    }

    const phone = ord.customer_phone;
    if (!phone) return;

    const firstName = (ord.customer_name || "Cliente").split(" ")[0];
    const shortId = ord.id.slice(0, 8).toUpperCase();

    const res = await sendZernioWhatsAppTemplate({
      phone,
      templateName: "pedido_aprovado",
      templateParams: [
        { type: "text", text: firstName },
        { type: "text", text: shortId },
      ],
      category: "utility",
    });

    if (res.success) {
      await supabaseAdmin
        .from("orders")
        .update({ whatsapp_sent_approved: true } as any)
        .eq("id", orderId);
    }
  } catch (err) {
    console.error("[OrderWhatsApp] Erro ao enviar WhatsApp de venda aprovada:", err);
  }
}

/**
 * Dispara o WhatsApp de Pedido Enviado / Rastreio (Utility)
 */
export async function sendPedidoEnviadoWhatsApp(orderId: string, trackingCode: string): Promise<void> {
  try {
    const enabled = await isWhatsAppEnabled();
    if (!enabled) return;

    // Buscar dados do pedido
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, customer_name, customer_phone, whatsapp_sent_shipped")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) return;
    const ord = order as any;

    if (ord.whatsapp_sent_shipped) {
      return;
    }

    const phone = ord.customer_phone;
    if (!phone) return;

    const firstName = (ord.customer_name || "Cliente").split(" ")[0];
    const shortId = ord.id.slice(0, 8).toUpperCase();

    const res = await sendZernioWhatsAppTemplate({
      phone,
      templateName: "pedido_enviado",
      templateParams: [
        { type: "text", text: firstName },
        { type: "text", text: shortId },
        { type: "text", text: trackingCode },
      ],
      category: "utility",
    });

    if (res.success) {
      await supabaseAdmin
        .from("orders")
        .update({ whatsapp_sent_shipped: true } as any)
        .eq("id", orderId);
    }
  } catch (err) {
    console.error("[OrderWhatsApp] Erro ao enviar WhatsApp de pedido enviado:", err);
  }
}
