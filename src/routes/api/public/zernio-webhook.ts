import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { rateLimit } from "@/lib/rate-limit";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Zernio-Signature, X-Zernio-Event-Id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_SECRET = process.env.ZERNIO_WEBHOOK_SECRET;
const ZERNIO_API_BASE = "https://zernio.com/api/v1";

// Rate-limit: 30 mensagens / 10 min por conversa do Instagram
const RL_MAX = 30;
const RL_WINDOW_MS = 10 * 60 * 1000;

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

async function sendZernioMessage(
  conversationId: string,
  accountId: string,
  message: string,
  options?: {
    buttons?: Array<{ type: "reply"; title: string; payload: string }>;
    interactive?: {
      type: "cta_url";
      body: { text: string };
      action: { name: "cta_url"; parameters: { display_text: string; url: string } };
    };
  },
): Promise<void> {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    console.error("[zernio-webhook] ZERNIO_API_KEY não configurada — não respondeu");
    return;
  }

  const payload: any = { accountId };
  if (options?.interactive) {
    payload.interactive = options.interactive;
  } else {
    payload.message = message;
    if (options?.buttons) {
      payload.buttons = options.buttons;
    }
  }

  const res = await fetch(
    `${ZERNIO_API_BASE}/inbox/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[zernio-webhook] erro ao responder (${res.status}): ${body}`,
    );
  }
}

function isShortReply(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  const emojiOnly = /^[\p{Emoji_Presentation}\p{Emoji}\s]+$/u.test(normalized);
  // Adicionar mais variações comuns
  return ["ok", "obrigado", "obrigada", "valeu", "blz", "beleza", "obg", "vlw", "thanks", "thank you", "grato", "grata"].includes(normalized) || emojiOnly;
}

function isEscalationTopic(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(cancel|troc|devolv|devolu|errad|danific|reclam)\w*\b/.test(normalized);
}

function getEscalationSubject(text: string): string {
  const norm = text.toLowerCase();
  if (norm.includes("cancel") || norm.includes("cancelar")) return "Cancelamento";
  if (norm.includes("troca")) return "Troca";
  if (norm.includes("devolu") || norm.includes("devolver")) return "Devolução";
  if (norm.includes("errado") || norm.includes("danificado") || norm.includes("defeito")) return "Produto com defeito / Errado";
  return "Reclamação";
}

async function processFranResponse(payload: {
  message: { conversationId: string; text?: string | null; id: string; type?: string; attachments?: any[]; sender?: { phoneNumber?: string } };
  account: { id: string };
  channel: "instagram" | "whatsapp";
}): Promise<void> {
  console.log("[zernio-webhook] Processando mensagem:", {
    conversationId: payload.message.conversationId,
    text: payload.message.text,
    type: payload.message.type,
    channel: payload.channel,
  });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Busca a conversa pelo zernio_conversation_id
  const { data: conv } = await (supabaseAdmin as any)
    .from("conversations")
    .select("id, replied_by, zernio_conversation_id")
    .eq("zernio_conversation_id", payload.message.conversationId)
    .maybeSingle();

  if (!conv) {
    console.error(
      "[zernio-webhook] conversa não encontrada após upsert:",
      payload.message.conversationId,
    );
    return;
  }

  // Handoff: se humano assumiu, não responde
  if (conv.replied_by === "human") {
    return;
  }

  const rawText = (payload.message.text || "").trim();
  const attachments = payload.message.attachments || [];
  const isAttachment = !rawText && attachments.length > 0;

  // Se tiver anexo, pedir texto (independente do tipo: áudio, imagem, vídeo)
  if (isAttachment) {
      console.log("[zernio-webhook] Mensagem com anexo:", JSON.stringify({
        conversationId: payload.message.conversationId,
        id: payload.message.id,
        attachments: attachments,
      }));
      const reply = "Oi! Por enquanto só consigo ler mensagens de texto. Pode mandar sua dúvida por escrito que eu respondo por aqui.";
      await sendZernioMessage(
        payload.message.conversationId,
        payload.account.id,
        reply,
      );
      await (supabaseAdmin as any).from("conversations").update({
        last_message: reply,
        last_message_at: new Date().toISOString(),
        unread: true,
      }).eq("id", conv.id);
      await (supabaseAdmin as any).from("messages").insert({
        conversation_id: conv.id,
        content: reply,
        sender: "agent",
        message_type: "text",
        read: false,
      });
      return;
  }

  // Rate-limit por conversationId
  const rl = rateLimit(`zernio:${payload.message.conversationId}`, RL_MAX, RL_WINDOW_MS);
  if (!rl.allowed) {
    console.log(
      `[zernio-webhook] rate-limit excedido para ${payload.message.conversationId}`,
    );
    return;
  }

  // Busca histórico da conversa (exclui a mensagem atual para não duplicar).
  const { data: historicoBruto } = await (supabaseAdmin as any)
    .from("messages")
    .select("content, sender, created_at, zernio_message_id")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const historico = (historicoBruto || [])
    .filter((m: any) => m.content && m.zernio_message_id !== payload.message.id)
    .map((m: any) => ({
      role: m.sender === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  let reply: string;

  if (isShortReply(rawText)) {
      console.log("[zernio-webhook] Resposta curta detectada:", rawText);
      reply = "De nada! 😊";
  }
  else if (isEscalationTopic(rawText)) {
      const subject = getEscalationSubject(rawText);
      reply = `Entendi, isso precisa da nossa equipe. Por favor, envie um e-mail para contato@fragranciaria.com com o assunto "${subject}" e explique seu caso por escrito.`;
      await (supabaseAdmin as any).from("conversations").update({ replied_by: "human" }).eq("id", conv.id);
  }
  else {
      const { chatWithFran } = await import("@/lib/agent/fran-chat.functions");
      const senderPhone = payload.message.sender?.phoneNumber;
      const result = await chatWithFran({
        data: {
          mensagem: rawText,
          historico,
          channel: payload.channel,
          senderPhone,
        },
      });

      if (!result.success) {
        if (result.error === "human_mode") return;
        console.error("[zernio-webhook] Fran erro:", result.error);
        return;
      }
      reply = result.resposta;
  }

  // Envia a resposta para o Zernio
  await sendZernioMessage(
    payload.message.conversationId,
    payload.account.id,
    reply,
  );

  // Grava a resposta da Fran no banco (sender='agent') e atualiza a conversa
  await (supabaseAdmin as any).from("messages").insert({
    conversation_id: conv.id,
    content: reply,
    sender: "agent",
    message_type: "text",
    read: false,
  });
  await (supabaseAdmin as any)
    .from("conversations")
    .update({
      last_message: reply,
      last_message_at: new Date().toISOString(),
      unread: true,
    })
    .eq("id", conv.id);
}

export const Route = createFileRoute("/api/public/zernio-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Zernio-Signature");

        if (!verifySignature(rawBody, signature)) {
          console.log("[zernio-webhook] 401 — assinatura inválida ou secret ausente");
          return new Response("Invalid signature", {
            status: 401,
            headers: { ...corsHeaders, "content-type": "text/plain" },
          });
        }

        const payload = JSON.parse(rawBody);

        // Ignora eventos de teste e conversation.started
        if (payload.type === "webhook.test" || payload.type === "conversation.started") {
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }

        const msg = payload.message;
        if (!msg) {
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }

        // TRAVA ANTI-LOOP: só processa mensagens recebidas (incoming)
        if (msg.direction !== "incoming") {
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }

        // Se não for texto E não tiver anexos, loga o payload e retorna 200
        const hasText = Boolean(msg.text && String(msg.text).trim().length > 0);
        const hasAttachments = Boolean(msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0);
        if (!hasText && !hasAttachments) {
          console.log("[zernio-webhook] payload sem texto e sem anexos:", JSON.stringify(payload));
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // =============================================================
        // 1. UPSERT da conversa (FK precisa existir antes da mensagem)
        // =============================================================
        const conversationId = msg.conversationId;
        const accountId = payload.account?.id;
        // Define o canal a partir da plataforma da mensagem. O Instagram usa
        // participantName do perfil; o WhatsApp pode vir com número — usamos
        // fallback legível para cada caso.
        const channel = msg.platform === "whatsapp" ? "whatsapp" : "instagram";
        const participantName =
          payload.conversation?.participantName ||
          (channel === "whatsapp" ? "Cliente WhatsApp" : "Visitante Instagram");

        // Tenta encontrar conversa existente
        const { data: existingConv } = await (supabaseAdmin as any)
          .from("conversations")
          .select("id")
          .eq("zernio_conversation_id", conversationId)
          .maybeSingle();

        let convRowId: string;

        if (existingConv) {
          convRowId = existingConv.id;
          // Atualiza last_message (ainda sem o texto, será atualizado após insert)
          await (supabaseAdmin as any)
            .from("conversations")
            .update({
              last_message_at: new Date().toISOString(),
              unread: true,
            })
            .eq("id", convRowId);
        } else {
          const { data: created } = await (supabaseAdmin as any)
            .from("conversations")
            .insert({
              channel: channel,
              customer_name: participantName,
              zernio_conversation_id: conversationId,
              zernio_account_id: accountId,
              status: "open",
              replied_by: "fran",
            })
            .select("id")
            .single();
          convRowId = created?.id;
          if (!convRowId) {
            console.error("[zernio-webhook] falha ao criar conversa");
            return new Response(JSON.stringify({ received: true }), {
              status: 200,
              headers: { ...corsHeaders, "content-type": "application/json" },
            });
          }
        }

        // =============================================================
        // 2. INSERT da mensagem com idempotência (zernio_message_id)
        // =============================================================
        const messageText = (msg.text || "").trim();
        const messageType = messageText ? "text" : "attachment";

        const { error: msgError } = await (supabaseAdmin as any)
          .from("messages")
          .insert({
            conversation_id: convRowId,
            zernio_message_id: msg.id,
            content: messageText,
            sender: "customer",
            message_type: messageType,
            read: false,
          });

        if (msgError) {
          // Unique violation = já processada (idempotência)
          if (msgError.code === "23505") {
            return new Response(JSON.stringify({ received: true }), {
              status: 200,
              headers: { ...corsHeaders, "content-type": "application/json" },
            });
          }
          console.error("[zernio-webhook] erro ao inserir mensagem:", msgError);
        }

        // Atualiza last_message com o texto real
        if (messageText) {
          await (supabaseAdmin as any)
            .from("conversations")
            .update({
              last_message: messageText,
              last_message_at: new Date().toISOString(),
              unread: true,
            })
            .eq("id", convRowId);
        }

        // =============================================================
        // 3. Responde 200 IMEDIATAMENTE
        // =============================================================
        const response = new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });

        // =============================================================
        // 4. Processa a Fran em background
        // =============================================================
        processFranResponse({
          message: {
            conversationId,
            text: msg.text,
            id: msg.id,
            attachments: msg.attachments,
            sender: msg.sender,
          },
          account: { id: accountId },
          channel: channel,
        }).catch((err) =>
          console.error("[zernio-webhook] background error:", err),
        );

        return response;
      },
    },
  },
});
