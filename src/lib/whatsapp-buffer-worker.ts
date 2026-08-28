import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Worker para processar rajadas de mensagens do WhatsApp
// Roda a cada 2s e agrupa mensagens não processadas do mesmo telefone

const phoneSchema = z.string().min(10).max(15);

/**
 * Processa uma rajada de mensagens de um único telefone.
 * - Junta as mensagens não processadas ordenadas por message_ts
 * - Chama o modelo UMA vez
 * - Envia a resposta
 * - Marca processed_at e limpa processing_since
 */
async function processPhoneBatch(phone: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { chatWithFran } = await import("@/lib/agent/fran-chat.functions");
  const { sendZernioMessage } = await import("../routes/api/public/zernio-webhook");

  // 1. Busca mensagens não processadas ordenadas por timestamp
  const { data: messages, error: msgError } = await (supabaseAdmin as any)
    .from("whatsapp_inbound_buffer")
    .select("*")
    .eq("phone", phone)
    .eq("processed_at", null)
    .order("message_ts", { ascending: true });

  if (msgError || !messages || messages.length === 0) {
    console.log(`[whatsapp-buffer-worker] ${phone}: sem mensagens não processadas`);
    await (supabaseAdmin as any)
      .from("whatsapp_flush_state")
      .update({ processing_since: null })
      .eq("phone", phone);
    return;
  }

  // 2. Busca a conversa associada ao telefone
  const { data: conv } = await (supabaseAdmin as any)
    .from("conversations")
    .select("id, zernio_conversation_id, zernio_account_id")
    .eq("customer_phone", phone)
    .maybeSingle();

  if (!conv) {
    console.error(`[whatsapp-buffer-worker] ${phone}: conversa não encontrada`);
    await (supabaseAdmin as any)
      .from("whatsapp_flush_state")
      .update({ processing_since: null })
      .eq("phone", phone);
    return;
  }

  // 3. Junta as mensagens em um único texto
  const combinedText = messages.map((m: any) => m.body).join(" \n");

  // 4. Busca histórico da conversa (exclui mensagens já processadas)
  const { data: historicoBruto } = await (supabaseAdmin as any)
    .from("messages")
    .select("content, sender, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const historico = (historicoBruto || [])
    .filter((m: any) => m.content)
    .map((m: any) => ({
      role: m.sender === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  // 5. Chama o modelo UMA vez
  let reply: string;
  try {
    const result = await chatWithFran({
      data: {
        mensagem: combinedText,
        historico,
        channel: "whatsapp",
        senderPhone: phone,
      },
    });

    if (!result.success) {
      console.error(`[whatsapp-buffer-worker] ${phone}: Fran erro:`, result.error);
      await (supabaseAdmin as any)
        .from("whatsapp_flush_state")
        .update({ processing_since: null })
        .eq("phone", phone);
      return;
    }
    reply = result.resposta;
  } catch (err) {
    console.error(`[whatsapp-buffer-worker] ${phone}: erro ao chamar Fran:`, err);
    await (supabaseAdmin as any)
      .from("whatsapp_flush_state")
      .update({ processing_since: null })
      .eq("phone", phone);
    return;
  }

  // 6. Envia a resposta para o Zernio
  try {
    await sendZernioMessage(conv.zernio_conversation_id, conv.zernio_account_id, reply);
  } catch (err) {
    console.error(`[whatsapp-buffer-worker] ${phone}: erro ao enviar resposta:`, err);
    await (supabaseAdmin as any)
      .from("whatsapp_flush_state")
      .update({ processing_since: null })
      .eq("phone", phone);
    return;
  }

  // 7. Marca mensagens como processadas
  const messageIds = messages.map((m: any) => m.message_id);
  await (supabaseAdmin as any)
    .from("whatsapp_inbound_buffer")
    .update({ processed_at: new Date().toISOString() })
    .in("message_id", messageIds);

  // 8. Limpa processing_since
  await (supabaseAdmin as any)
    .from("whatsapp_flush_state")
    .update({ processing_since: null })
    .eq("phone", phone);

  console.log(`[whatsapp-buffer-worker] ${phone}: processadas ${messages.length} mensagens`);
}

/**
 * Worker principal: roda a cada 2s e processa telefones com flush_at <= now()
 */
export const runWhatsAppBufferWorker = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ processed: number; errors: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Busca telefones com flush_at <= now() e processing_since null
    const { data: phones, error: phoneError } = await (supabaseAdmin as any)
      .from("whatsapp_flush_state")
      .select("phone")
      .lte("flush_at", new Date().toISOString())
      .is("processing_since", null);

    if (phoneError || !phones || phones.length === 0) {
      return { processed: 0, errors: 0 };
    }

    let processed = 0;
    let errors = 0;

    // 2. Processa cada telefone em paralelo (até 5 por vez para evitar sobrecarga)
    const batchSize = 5;
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      const promises = batch.map((p: any) =>
        (supabaseAdmin as any)
          .from("whatsapp_flush_state")
          .update({ processing_since: new Date().toISOString() })
          .eq("phone", p.phone)
          .then(() => processPhoneBatch(p.phone))
          .then(() => {
            processed += 1;
          })
          .catch((err: any) => {
            console.error(`[whatsapp-buffer-worker] erro no lote para ${p.phone}:`, err);
            errors += 1;
          }),
      );
      await Promise.all(promises);
    }

    return { processed, errors };
  });

/**
 * Inicia o worker de buffer do WhatsApp no topo do processo servidor.
 * - Guarda contra dupla inicialização armazenando o handle do intervalo em globalThis.__whatsappBufferInterval
 * - Apenas inicia se WHATSAPP_BUFFER_ENABLED === "true"
 * - Loga o valor lido da env e o ID do intervalo criado
 * Deve ser chamada uma vez em src/server.ts
 */
export function startWhatsAppBufferWorker(): boolean {
  const envValue = process.env.WHATSAPP_BUFFER_ENABLED;
  if (envValue !== "true") {
    if (process.env.NODE_ENV !== "test") {
      console.log(`[whatsapp-buffer-worker] desligado por env (WHATSAPP_BUFFER_ENABLED="${envValue}")`);
    }
    return false;
  }

  const g = globalThis as { __whatsappBufferInterval?: NodeJS.Timeout };
  if (g.__whatsappBufferInterval) {
    console.log(`[whatsapp-buffer-worker] já inicializado — ignorando dupla inicialização (intervalo ativo)`);
    return false;
  }

  const intervalHandle = setInterval(runWhatsAppBufferWorkerJob, 2000);
  g.__whatsappBufferInterval = intervalHandle;
  console.log(`[whatsapp-buffer-worker] iniciado (intervalo 2s, id=${(intervalHandle as any)[Symbol.for('nodejs.util.inspect.custom')]?.() || 'unknown'})`);
  return true;
}

/**
 * Exporta função para ser chamada por cron/scheduler ou pelo worker interno.
 */
export async function runWhatsAppBufferWorkerJob(): Promise<void> {
  try {
    const result = await runWhatsAppBufferWorker({});
    if (result.processed > 0 || result.errors > 0) {
      console.log(`[whatsapp-buffer-worker] processados=${result.processed}, erros=${result.errors}`);
    }
  } catch (err) {
    console.error("[whatsapp-buffer-worker] erro no job:", err);
  }
}