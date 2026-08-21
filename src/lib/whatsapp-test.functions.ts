import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendZernioWhatsAppTemplate } from "./zernio-whatsapp.functions";

export const sendTestWhatsApp = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      phone: z.string().min(1, "Telefone obrigatório"),
      templateName: z.string().default("venda_aprovada"),
      param1: z.string().min(1, "Variável 1 obrigatória"),
      param2: z.string().min(1, "Variável 2 obrigatória"),
      param3: z.string().min(1, "Variável 3 obrigatória"),
    }).parse(d)
  )
  .handler(async ({ data: { phone, templateName, param1, param2, param3 } }) => {
    try {
      const { requireRole, requireAdmin } = await import("./admin-auth");
      const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
      const { logAdminAction } = await import("./admin-audit");

      // Segurança: exige autenticação administrativa com papel de config
      const admin = await requireAdmin();
      await requireRole(ADMIN_AREA_ROLES.storeSettings);

      console.log(`[sendTestWhatsApp] Iniciando teste para ${phone} com template ${templateName}`);

      const templateParams = [
        { type: "text" as const, text: param1 },
        { type: "text" as const, text: param2 },
        { type: "text" as const, text: param3 },
      ];

      // Chamada direta para capturar o resultado bruto / erro
      const res = await sendZernioWhatsAppTemplate({
        phone,
        templateName,
        templateParams,
        category: "utility",
      });

      // Registrar auditoria
      await logAdminAction(
        admin,
        "whatsapp.test_send",
        "settings",
        "whatsapp-test",
        { phone, templateName, params: templateParams },
        { success: res.success, error: res.error }
      );

      return {
        success: res.success,
        error: res.error || null,
        response: res,
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido ao testar WhatsApp";
      console.error("[sendTestWhatsApp] Exceção:", errorMessage);
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  });
