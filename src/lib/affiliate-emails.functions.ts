import { Resend } from "resend";
import { buildEmailLayout } from "./email-layout";

function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function sendAffiliateRegistrationReceivedEmail(input: {
  email: string;
  fullName: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY ausente" };

  try {
    const resend = new Resend(apiKey);
    const html = buildEmailLayout({
      assunto: "Cadastro de afiliado recebido",
      preheader: "Sua inscrição está em análise.",
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">Recebemos seu cadastro</h1>
        <p style="margin:0 0 16px;color:#51635F;font-size:16px;">Olá, ${input.fullName}.</p>
        <p style="margin:0 0 16px;color:#51635F;font-size:15px;line-height:1.5;">Sua inscrição de afiliado está em análise. Assim que houver retorno, nossa equipe vai entrar em contato.</p>
        <p style="margin:0;color:#51635F;font-size:15px;line-height:1.5;">Se não receber uma resposta dentro do prazo esperado, fale com <strong>contato@fragranciaria.com</strong>.</p>
      `,
    });

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.email],
      subject: "Cadastro de afiliado recebido",
      html,
      text: htmlToText(html),
    });

    return error ? { success: false, error: error.message } : { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro interno" };
  }
}

export async function sendAffiliateApprovedEmail(input: {
  email: string;
  fullName: string;
  affiliateCode: string;
  dashboardUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY ausente" };

  try {
    const resend = new Resend(apiKey);
    const html = buildEmailLayout({
      assunto: "Afiliado aprovado",
      preheader: "Seu acesso ao painel foi liberado.",
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">Seu cadastro foi aprovado</h1>
        <p style="margin:0 0 16px;color:#51635F;font-size:16px;">Olá, ${input.fullName}.</p>
        <p style="margin:0 0 16px;color:#51635F;font-size:15px;line-height:1.5;">Seu cadastro como afiliado foi aprovado.</p>
        <p style="margin:0 0 16px;color:#51635F;font-size:15px;">Código de afiliado: <strong>${input.affiliateCode}</strong></p>
        <p style="margin:0;color:#51635F;font-size:15px;line-height:1.5;">Acesse o painel: <a href="${input.dashboardUrl}" style="color:#B07B1E;">${input.dashboardUrl}</a></p>
      `,
    });

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.email],
      subject: "Afiliado aprovado",
      html,
      text: htmlToText(html),
    });

    return error ? { success: false, error: error.message } : { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro interno" };
  }
}
