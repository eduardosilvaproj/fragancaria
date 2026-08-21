import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Normaliza telefone para formato E.164 exigido pela Meta/Zernio (ex: +5511999999999)
export function normalizePhoneToE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // Se já tem DDI 55 e tamanho correto (12 ou 13 dígitos: 55 + DDD + 8/9 dígitos)
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Se tem 10 ou 11 dígitos (DDD + número)
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  return `+${digits}`;
}

export async function isWhatsAppEnabled(): Promise<boolean> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("store_settings")
      .select("whatsapp_notifications_enabled")
      .maybeSingle();

    if (error) {
      console.error("[ZernioWhatsApp] Falha ao ler configuração de WhatsApp:", error.message);
      throw new Error("Failed to read WhatsApp settings");
    }

    if (!data) {
      console.warn("[ZernioWhatsApp] Configuração de WhatsApp não encontrada — usando default (habilitado).");
      return true; // Default seguro: habilitado
    }

    // Coluna booleana explícita
    return data.whatsapp_notifications_enabled === true;
  } catch (err: any) {
    console.error("[ZernioWhatsApp] Exceção ao verificar configuração:", err);
    throw err; // Não silenciar — quem chama decide como tratar
  }
}

export async function sendZernioWhatsAppTemplate({
  phone,
  templateName,
  templateParams,
  category = "utility",
}: {
  phone: string;
  templateName: string;
  templateParams: Array<{ type: "text"; text: string }>;
  category?: "utility" | "marketing";
}): Promise<{ success: boolean; error?: string }> {
  const enabled = await isWhatsAppEnabled();
  if (!enabled) {
    console.log("[ZernioWhatsApp] Envio desativado por configuração (whatsapp_notifications_enabled = false).");
    return { success: false, error: "WhatsApp notifications disabled" };
  }

  const normalizedPhone = normalizePhoneToE164(phone);
  if (!normalizedPhone) {
    return { success: false, error: "Invalid phone number" };
  }

  // Buscar credenciais da Zernio (API Key / Account ID) nas configurações ou env
  const apiKey = process.env.ZERNIO_API_KEY;
  const accountId = process.env.ZERNIO_WHATSAPP_ACCOUNT_ID;

  if (!apiKey || !accountId) {
    console.warn("[ZernioWhatsApp] ZERNIO_API_KEY ou ZERNIO_WHATSAPP_ACCOUNT_ID ausentes.");
    return { success: false, error: "Zernio credentials missing" };
  }

  try {
    const url = "https://zernio.com/api/v1/whatsapp/templates/send";
    const payload = {
      platform: "whatsapp",
      accountId,
      recipient: {
        phone: normalizedPhone,
      },
      templateName,
      templateLanguage: "pt_BR",
      templateParams,
      category,
    };

    console.log("[ZernioWhatsApp] Enviando payload:", { url, payload });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    console.log("[ZernioWhatsApp] Resposta da API:", response.status, responseBody);

    if (!response.ok) {
      const errorMessage = `Zernio API error: ${response.status} - ${responseBody}`;
      console.error("[ZernioWhatsApp] Erro na API:", errorMessage);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao enviar mensagem";
    console.error("[ZernioWhatsApp] Exceção ao enviar mensagem:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
