import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, x-hub-signature-256, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type IncomingMessage = {
  wa_message_id: string;
  phone: string;
  name: string;
  content: string;
  message_type: string;
};

// Percorre o payload da Meta (entry[].changes[].value.messages[]) e extrai as
// mensagens recebidas, juntando o nome do contato (value.contacts[]).
function extractMessages(body: any): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value ?? {};
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const nameByWaId = new Map<string, string>();
      for (const c of contacts) {
        if (c?.wa_id) nameByWaId.set(String(c.wa_id), c?.profile?.name ?? "");
      }
      for (const m of messages) {
        const phone = String(m?.from ?? "");
        const type = String(m?.type ?? "text");
        const content =
          type === "text" ? String(m?.text?.body ?? "") : `[${type}]`;
        out.push({
          wa_message_id: String(m?.id ?? ""),
          phone,
          name: nameByWaId.get(phone) ?? "",
          content,
          message_type: type,
        });
      }
    }
  }
  return out;
}

// Persiste as mensagens recebidas. Tabelas reais (ver migration):
//   conversations(customer_phone, customer_name, channel, last_message, last_message_at, unread)
//   messages(conversation_id, wa_message_id, content, sender, message_type, read)
// Usa service role (bypassa RLS) — server-only.
async function persistMessages(msgs: IncomingMessage[]) {
  if (msgs.length === 0) return;
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  for (const msg of msgs) {
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
        console.error("persistMessages conv error:", created.error.message);
        continue;
      }
      conversationId = (created.data as any).id;
    }

    // Insere a mensagem recebida (sender = customer).
    const ins = await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      wa_message_id: msg.wa_message_id || null,
      content: msg.content,
      sender: "customer",
      message_type: msg.message_type,
      read: false,
    });
    if (ins.error) {
      console.error("persistMessages msg error:", ins.error.message);
      continue;
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
}

export const Route = createFileRoute("/api/public/whatsapp-webhook")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const mode = u.searchParams.get("hub.mode");
        const token = u.searchParams.get("hub.verify_token");
        const challenge = u.searchParams.get("hub.challenge");
        const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && token && token === verifyToken) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      },
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const msgs = extractMessages(body);
          await persistMessages(msgs);
        } catch (err: any) {
          console.error("whatsapp-webhook POST error:", err?.message || err);
        }
        // A Meta exige 200 sempre, senão fica reenviando o webhook.
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      },
    },
  },
});