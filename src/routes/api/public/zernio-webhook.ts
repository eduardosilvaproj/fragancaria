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
): Promise<void> {
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    console.error("[zernio-webhook] ZERNIO_API_KEY não configurada — não respondeu");
    return;
  }
  const res = await fetch(
    `${ZERNIO_API_BASE}/inbox/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ accountId, message }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    console.error(
      `[zernio-webhook] erro ao responder (${res.status}): ${body}`,
    );
  }
}

async function processFranResponse(payload: {
  message: { conversationId: string; text?: string; id: string };
  account: { id: string };
}): Promise<void> {
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

  // Texto vazio (só anexo) — não chama a Fran
  const text = (payload.message.text || "").trim();
  if (!text) {
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
  // Usamos .neq("zernio_message_id") NÃO funciona porque as respostas da Fran
  // têm zernio_message_id=NULL, e SQL NULL != 'id' é NULL (falso) — essas
  // linhas seriam excluídas. Buscamos tudo e filtramos em JS.
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

  // Chama a Fran (reusa a lógica existente).
  // Não passa sessionId — a conversa Instagram já foi criada no handler e o
  // check de replied_by já foi feito acima. O sessionId faria a chatWithFran
  // buscar por session_id+channel='web' e criar uma conversa duplicada.
  const { chatWithFran } = await import("@/lib/agent/fran-chat.functions");
  const result = await chatWithFran({
    data: {
      mensagem: text,
      historico,
      channel: "instagram",
    },
  });

  if (!result.success) {
    if (result.error === "human_mode") return; // handoff detectado
    console.error("[zernio-webhook] Fran erro:", result.error);
    return;
  }

  // Envia a resposta para o Zernio
  await sendZernioMessage(
    payload.message.conversationId,
    payload.account.id,
    result.resposta,
  );

  // Grava a resposta da Fran no banco (sender='agent') e atualiza a conversa
  await (supabaseAdmin as any).from("messages").insert({
    conversation_id: conv.id,
    content: result.resposta,
    sender: "agent",
    message_type: "text",
    read: false,
  });
  await (supabaseAdmin as any)
    .from("conversations")
    .update({
      last_message: result.resposta,
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // =============================================================
        // 1. UPSERT da conversa (FK precisa existir antes da mensagem)
        // =============================================================
        const conversationId = msg.conversationId;
        const accountId = payload.account?.id;
        const participantName = payload.conversation?.participantName || "Visitante Instagram";

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
              channel: "instagram",
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
          message: { conversationId, text: msg.text, id: msg.id },
          account: { id: accountId },
        }).catch((err) =>
          console.error("[zernio-webhook] background error:", err),
        );

        return response;
      },
    },
  },
});
