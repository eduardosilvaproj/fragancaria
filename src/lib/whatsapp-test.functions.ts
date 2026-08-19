import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendZernioWhatsAppTemplate } from "./zernio-whatsapp.functions";

export const sendTestWhatsApp = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      phone: z.string().min(1, "Telefone obrigatório"),
      templateName: z.string().default("pedido_aprovado"),
    }).parse(d)
  )
  .handler(async ({ data: { phone, templateName } }) => {
    try {
      const { requireRole } = await import("./admin-auth");
      const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
      await requireRole(ADMIN_AREA_ROLES.settings);

      console.log(`[sendTestWhatsApp] Iniciando teste para ${phone} com template ${templateName}`);

      // Chamada direta para capturar o resultado bruto / erro
      const res = await sendZernioWhatsAppTemplate({
        phone,
        templateName,
        templateParams: [
          { type: "text", text: "Cliente Teste" },
          { type: "text", text: "TESTE-ADMIN-123" }
        ],
        category: "utility",
      });

      return {
        success: res.success,
        response: res,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("[sendTestWhatsApp] Exceção:", err);
      return {
        success: false,
        error: err?.message || "Erro desconhecido ao testar WhatsApp",
        timestamp: new Date().toISOString(),
      };
    }
  });
