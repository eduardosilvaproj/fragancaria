import { createFileRoute } from "@tanstack/react-router";

// Webhook de recebimento de mensagens do WhatsApp via Z-API.
// A Z-API não assina o webhook (sem HMAC como a Meta), então protegemos a URL
// com um segredo próprio na query string: ?secret=<ZAPI_WEBHOOK_SECRET>.
// Configurar o callback no painel Z-API apontando para:
//   https://<dominio>/api/public/whatsapp-webhook?secret=<ZAPI_WEBHOOK_SECRET>

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_SECRET = process.env.ZAPI_WEBHOOK_SECRET;

// Valida o segredo da query string. Se o segredo não estiver setado, recusa
// em produção (fail-closed) e libera só em dev.
function verifyWebhookSecret(request: Request): boolean {
  if (!WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === "development") return true;
    console.error("[whatsapp-webhook] ZAPI_WEBHOOK_SECRET ausente — rejeitando em produção");
    return false;
  }
  const provided = new URL(request.url).searchParams.get("secret") || "";
  return provided === WEBHOOK_SECRET;
}

type IncomingMessage = {
  wa_message_id: string;
  phone: string;
  name: string;
  content: string;
  message_type: string;
};

// Extrai a mensagem recebida do payload da Z-API (ReceivedCallback).
// Formato (texto):
//   { phone, messageId, fromMe, senderName, text: { message }, isGroup, type }
// Retorna null quando o evento deve ser ignorado (eco, grupo, não-texto).
function extractMessage(body: any): IncomingMessage | null {
  if (body?.type !== "ReceivedCallback") return null;
  if (body?.fromMe === true) return null; // eco da própria mensagem enviada
  if (body?.isGroup === true) return null; // ignora grupos

  const phone = String(body?.phone ?? "");
  const messageId = String(body?.messageId ?? "");
  if (!phone || !messageId) return null;

  // Só texto por enquanto; mídia entra como marcador.
  const text = body?.text?.message;
  const hasText = typeof text === "string" && text.length > 0;
  const content = hasText ? String(text) : "[mídia]";
  const messageType = hasText ? "text" : "media";

  return {
    wa_message_id: messageId,
    phone,
    name: String(body?.senderName ?? ""),
    content,
    message_type: messageType,
  };
}

// Persiste a mensagem recebida. Tabelas reais (ver migration
// 20260628_whatsapp_conversations.sql):
//   conversations(customer_phone, customer_name, channel, last_message, last_message_at, unread)
//   messages(conversation_id, wa_message_id, content, sender, message_type, read)
// Usa service role (bypassa RLS) — server-only.
async function persistMessage(msg: IncomingMessage) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  // Acha ou cria a conversa pelo telefone (canal whatsapp).
  const existing = await supabaseAdmin
    .from("conversations")
    .select("id")
    .eq("customer_phone", msg.phone)
    .eq("channel", "whatsapp")
    .maybeSingle();

  let conversationId = (existing.data as any)?.id as string | undefined;

  if (!conversationId) {
    const created = await supabaseAdmin
      .from("conversations")
      .insert({
        channel: "whatsapp",
        customer_phone: msg.phone,
        customer_name: msg.name || null,
        last_message: msg.content,
        last_message_at: new Date().toISOString(),
        unread: true,
        status: "open",
      })
      .select("id")
      .single();
    if (created.error) {
      console.error("persistMessage conv error:", created.error.message);
      return;
    }
    conversationId = (created.data as any).id;
  }

  if (!conversationId) return;

  // Insere a mensagem recebida (sender = customer). A coluna wa_message_id tem
  // UNIQUE, então mensagem duplicada (retry do webhook) é ignorada pelo banco.
  const ins = await supabaseAdmin.from("messages").insert({
    conversation_id: conversationId,
    wa_message_id: msg.wa_message_id || null,
    content: msg.content,
    sender: "customer",
    message_type: msg.message_type,
    read: false,
  });
  if (ins.error) {
    console.error("persistMessage msg error:", ins.error.message);
    return;
  }

  // Atualiza resumo da conversa (última mensagem + marca não lida).
  await supabaseAdmin
    .from("conversations")
    .update({
      last_message: msg.content,
      last_message_at: new Date().toISOString(),
      unread: true,
      ...(msg.name ? { customer_name: msg.name } : {}),
    })
    .eq("id", conversationId);
}

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        if (!verifyWebhookSecret(request)) {
          return new Response(JSON.stringify({ error: "invalid secret" }), {
            status: 401,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }
        try {
          const body = await request.json();
          const msg = extractMessage(body);
          if (msg) await persistMessage(msg);
        } catch (err: any) {
          console.error("whatsapp-webhook POST error:", err?.message || err);
        }
        // Sempre 200 para a Z-API não ficar reenviando.
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      },
    },
  },
});
