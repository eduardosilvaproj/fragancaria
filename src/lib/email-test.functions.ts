import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Resend } from "resend";
import { buildEmailLayout } from "./email-layout";

function htmlToText(html: string | undefined): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export const sendTestEmail = createServerFn({
  method: "POST",
})
  .validator((d: unknown) =>
    z.object({ destination: z.string().email() }).parse(d),
  )
  .handler(async ({ data: { destination } }: { data: { destination: string } }) => {
  try {
    const { requireRole } = await import("./admin-auth");
    const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
    await requireRole(ADMIN_AREA_ROLES.settings);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "RESEND_API_KEY não configurada no servidor (Railway).",
      };
    }

    const resend = new Resend(apiKey);
    const html = buildEmailLayout({
      assunto: "E-mail de teste - Fragranciaria",
      preheader: "Teste de entrega do novo layout.",
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">Teste de E-mail</h1>
        <p style="margin:0 0 16px;color:#51635F;font-size:16px;">Este é um e-mail de teste do novo layout compartilhado.</p>
        <p style="margin:0;color:#51635F;font-size:15px;line-height:1.5;">Se você recebeu este e-mail, a configuração do Resend está funcionando corretamente.</p>
      `,
    });

    const { error, data: result } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [destination],
      subject: "E-mail de teste - Fragranciaria",
      html,
      text: htmlToText(html),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        messageId: (result as any)?.id,
      },
    };
  } catch (err: any) {
    console.error("[TEST-EMAIL-ERROR]", err);
    if (err.message && typeof err.message === 'string' && err.message.includes('includes')) {
        return { success: false, error: "Erro interno: variável de ambiente mal configurada" };
    }
    return { success: false, error: err?.message || "Erro interno" };
  }
});