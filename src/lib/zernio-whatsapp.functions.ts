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
}): Promise<{ success: boolean; error?: string; broadcastId?: string; messageId?: string }> {
  const enabled = await isWhatsAppEnabled();
  if (!enabled) {
    console.log("[ZernioWhatsApp] Envio desativado por configuração (whatsapp_notifications_enabled = false).");
    return { success: false, error: "WhatsApp notifications disabled" };
  }

  const normalizedPhone = normalizePhoneToE164(phone);
  if (!normalizedPhone) {
    return { success: false, error: "Invalid phone number" };
  }

  // Buscar credenciais da Zernio (API Key / Account ID / Profile ID)
  const apiKey = process.env.ZERNIO_API_KEY;
  const accountId = process.env.ZERNIO_WHATSAPP_ACCOUNT_ID;
  const profileId = process.env.ZERNIO_WHATSAPP_PROFILE_ID;

  if (!apiKey || !accountId || !profileId) {
    const missing = [];
    if (!apiKey) missing.push("ZERNIO_API_KEY");
    if (!accountId) missing.push("ZERNIO_WHATSAPP_ACCOUNT_ID");
    if (!profileId) missing.push("ZERNIO_WHATSAPP_PROFILE_ID");
    const errText = `Zernio credentials missing: ${missing.join(", ")}`;
    console.warn(`[ZernioWhatsApp] ${errText}`);
    return { success: false, error: errText };
  }

  try {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };

    // Passo 1: Criar o Broadcast com o template e os parâmetros no corpo (componentes body)
    const createUrl = "https://zernio.com/api/v1/broadcasts";
    const createPayload = {
      profileId,
      accountId,
      platform: "whatsapp",
      name: `Transacional_${templateName}_${Date.now()}`,
      template: {
        name: templateName,
        language: "pt_BR",
        components: [
          {
            type: "body",
            parameters: templateParams,
          },
        ],
      },
      category,
    };

    console.log("[ZernioWhatsApp] Passo 1/3 - Criando broadcast (Corpo exato):", JSON.stringify({ url: createUrl, payload: createPayload }, null, 2));
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(createPayload),
    });

    const createBody = await createRes.text();
    console.log("[ZernioWhatsApp] Resposta Criar Broadcast:", createRes.status, createBody);

    if (!createRes.ok) {
      return { success: false, error: `Passo 1 (Criar) falhou: ${createRes.status} - ${createBody}` };
    }

    const broadcast = JSON.parse(createBody);
    console.log("[ZernioWhatsApp] JSON parseado do Broadcast criado:", JSON.stringify(broadcast, null, 2));

    const broadcastId =
      broadcast?.id ||
      broadcast?._id ||
      broadcast?.broadcast?.id ||
      broadcast?.broadcast?._id ||
      broadcast?.data?.id ||
      broadcast?.data?._id;

    if (!broadcastId) {
      return { success: false, error: `Broadcast criado com sucesso, mas ID não encontrado no retorno: ${createBody}` };
    }

    // Passo 2: Adicionar destinatário contendo SOMENTE phones (sem variáveis)
    const recipientsUrl = `https://zernio.com/api/v1/broadcasts/${broadcastId}/recipients`;
    const recipientsPayload = {
      phones: [normalizedPhone],
    };

    console.log("[ZernioWhatsApp] Passo 2/3 - Adicionando destinatários (Corpo exato):", JSON.stringify({ url: recipientsUrl, payload: recipientsPayload }, null, 2));

    const recRes = await fetch(recipientsUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(recipientsPayload),
    });

    const recBody = await recRes.text();
    console.log("[ZernioWhatsApp] Resposta Adicionar Destinatários:", recRes.status, recBody);

    if (!recRes.ok) {
      return { success: false, error: `Passo 2 (Destinatários) falhou: ${recRes.status} - ${recBody}` };
    }

    // Passo 3: Enviar o Broadcast
    const sendUrl = `https://zernio.com/api/v1/broadcasts/${broadcastId}/send`;
    console.log("[ZernioWhatsApp] Passo 3/3 - Disparando broadcast:", { url: sendUrl });
    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers,
    });

    const sendBody = await sendRes.text();
    console.log("[ZernioWhatsApp] Resposta Disparar Broadcast:", sendRes.status, sendBody);

    if (!sendRes.ok) {
      return { success: false, error: `Passo 3 (Disparo) falhou: ${sendRes.status} - ${sendBody}` };
    }

    let messageId: string | undefined;
    try {
      const parsed = JSON.parse(sendBody);
      messageId =
        parsed?.message?.id ||
        parsed?.messageId ||
        parsed?.id ||
        parsed?.data?.message?.id ||
        parsed?.data?.id;
    } catch {
      // Resposta não-JSON ou sem message id explícito; seguimos com broadcastId
    }

    return { success: true, broadcastId: String(broadcastId), messageId };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao enviar broadcast";
    console.error("[ZernioWhatsApp] Exceção no fluxo de broadcast:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
