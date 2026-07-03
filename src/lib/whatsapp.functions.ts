import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Funções server do atendimento (SAC). Leem/escrevem as tabelas conversations
// e messages via service role (bypassa RLS) — ver migration
// 20260628_whatsapp_conversations.sql. O envio de resposta usa a WhatsApp
// Cloud API da Meta. Sem auth no /admin ainda; quando existir, proteger aqui.

export type Channel = "whatsapp" | "instagram" | "email";

export type ConversationDTO = {
  id: string;
  customer: { name: string; phone?: string; email?: string; instagram?: string };
  channel: Channel;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  status: "open" | "pending" | "resolved";
  priority: "low" | "medium" | "high";
  tags: string[];
};

export type MessageDTO = {
  id: string;
  content: string;
  sender: "customer" | "agent";
  timestamp: string;
  read: boolean;
};

// Formata um timestamp ISO para exibição curta (HH:MM hoje, senão dd/mm).
function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Lista conversas para o painel, mais recentes primeiro.
export const listConversations = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    data: ConversationDTO[];
    error?: string;
  }> => {
    try {
      const { requireAdmin } = await import("./admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data, error } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200);

      if (error) return { success: false, data: [], error: error.message };

      const rows = (data ?? []) as any[];
      const mapped: ConversationDTO[] = rows.map((r) => ({
        id: String(r.id),
        customer: {
          name: r.customer_name || r.customer_phone || "Contato",
          phone: r.customer_phone || undefined,
        },
        channel: (r.channel || "whatsapp") as Channel,
        lastMessage: r.last_message || "",
        lastMessageTime: formatTime(r.last_message_at),
        unread: Boolean(r.unread),
        status: (r.status || "open") as "open" | "pending" | "resolved",
        priority: (r.priority || "medium") as "low" | "medium" | "high",
        tags: Array.isArray(r.tags) ? r.tags : [],
      }));

      return { success: true, data: mapped };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  }
);

// Lê as mensagens de uma conversa (ordem cronológica) e marca a conversa como
// lida (unread=false, messages.read=true).
export const getMessages = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ conversationId: z.string() }).parse(d))
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; data: MessageDTO[]; error?: string }> => {
      try {
        const { requireAdmin } = await import("./admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const { data: rows, error } = await supabaseAdmin
          .from("messages")
          .select("*")
          .eq("conversation_id", data.conversationId)
          .order("created_at", { ascending: true })
          .limit(500);

        if (error) return { success: false, data: [], error: error.message };

        const mapped: MessageDTO[] = (rows ?? []).map((r: any) => ({
          id: String(r.id),
          content: r.content || "",
          sender: (r.sender || "customer") as "customer" | "agent",
          timestamp: formatTime(r.created_at),
          read: Boolean(r.read),
        }));

        // Marca conversa e mensagens como lidas.
        await supabaseAdmin
          .from("conversations")
          .update({ unread: false })
          .eq("id", data.conversationId);
        await supabaseAdmin
          .from("messages")
          .update({ read: true })
          .eq("conversation_id", data.conversationId)
          .eq("read", false);

        return { success: true, data: mapped };
      } catch (err: any) {
        return { success: false, data: [], error: err?.message || "erro" };
      }
    }
  );

// Envia uma resposta do atendente: chama a WhatsApp Cloud API e grava a mensagem
// (sender = agent). Requer WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN.
export const sendMessage = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        conversationId: z.string(),
        content: z.string().min(1).max(4096),
      })
      .parse(d)
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const { requireAdmin } = await import("./admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Busca o telefone do contato.
        const conv = await supabaseAdmin
          .from("conversations")
          .select("customer_phone, channel")
          .eq("id", data.conversationId)
          .single();

        if (conv.error || !conv.data) {
          return { success: false, error: "Conversa não encontrada" };
        }
        const phone = (conv.data as any).customer_phone as string | null;
        if (!phone) return { success: false, error: "Conversa sem telefone" };

        // Envia via WhatsApp Cloud API.
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        if (!phoneNumberId || !accessToken) {
          return {
            success: false,
            error: "WhatsApp não configurado (faltam variáveis de ambiente)",
          };
        }

        const resp = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body: data.content },
            }),
          }
        );

        if (!resp.ok) {
          const errText = await resp.text();
          console.error("WhatsApp send error:", resp.status, errText);
          return { success: false, error: `Falha no envio (${resp.status})` };
        }

        const sent = (await resp.json()) as any;
        const waMessageId = sent?.messages?.[0]?.id ?? null;

        // Grava a mensagem enviada (sender = agent).
        await supabaseAdmin.from("messages").insert({
          conversation_id: data.conversationId,
          wa_message_id: waMessageId,
          content: data.content,
          sender: "agent",
          message_type: "text",
          read: true,
        });

        // Atualiza resumo da conversa (sai de não lida).
        await supabaseAdmin
          .from("conversations")
          .update({
            last_message: data.content,
            last_message_at: new Date().toISOString(),
            unread: false,
          })
          .eq("id", data.conversationId);

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || "erro" };
      }
    }
  );
