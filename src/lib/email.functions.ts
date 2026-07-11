import { createServerFn } from "@tanstack/react-start";
import { Resend } from "resend";
import type { z } from "zod";
import { formatBRL } from "../lib/utils";

// Dispara e-mail de confirmação com token de rastreio via Resend.
// Chamada server-side, só após o pedido ser inserido com sucesso.
//
// Requer RESEND_API_KEY no Railway (Edu configura). Se ausente, loga erro
// mas não quebra o fluxo de checkout (o token continua no frontend).
//
// TODO (quando Resend estiver configurado):
//   1. Edu cria conta Resend, verifica fragranciaria.com, gera API key
//   2. Setar RESEND_API_KEY no Railway (projeto storefront)
//   3. Adicionar "resend": "^4.0.0" ao package.json (npm install resend)
//   4. Registrar RESEND_API_KEY na matriz de secrets do CLAUDE.md

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Schema de input validado pela server fn (evita injection de template).
const emailInputSchema = {
  orderId: "string",
  customerName: "string",
  customerEmail: "string",
  total: "number",
  trackingTokenFormatted: "string",
  items: "array",
} as const;

type EmailInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  trackingTokenFormatted: string;
  items: Array<{ title: string; quantity: number; price: number }>;
};

export const sendOrderConfirmationEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    // Runtime validation (zod-like, inline, zero dep)
    if (!input || typeof input !== "object") throw new Error("Input inválido");
    const i = input as Record<string, unknown>;
    for (const [key, expected] of Object.entries(emailInputSchema)) {
      if (!(key in i)) throw new Error(`Campo obrigatório: ${key}`);
      if (expected === "array" && !Array.isArray(i[key])) {
        throw new Error(`Campo ${key} deve ser array`);
      }
      if (expected !== "array" && typeof i[key] !== expected) {
        throw new Error(`Campo ${key} deve ser ${expected}`);
      }
    }
    return i as EmailInput;
  })
  .handler(async ({ data }) => {
    if (!resend) {
      console.warn(
        "[email] RESEND_API_KEY não configurada — e-mail de confirmação não enviado",
        { orderId: data.orderId },
      );
      return { success: false, error: "RESEND_API_KEY ausente" };
    }

    try {
      const orderUrl = `${process.env.PUBLIC_URL || "https://www.fragranciaria.com"}/pedido/${data.trackingTokenFormatted.replace(/-/g, "")}`;
      const itemsHtml = data.items
        .map(
          (it) =>
            `<tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${it.quantity}x ${it.title}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatBRL(it.price * it.quantity)}</td>
            </tr>`,
        )
        .join("");

      const { error } = await resend.emails.send({
        from: "Fragranciaria <naoresponda@fragranciaria.com>",
        to: [data.customerEmail],
        subject: `Pedido Confirmado #${data.orderId.slice(0, 8).toUpperCase()}`,
        html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: #f3eee3; color: #0f3a3e;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: white; border: 1px solid #e9e1d2; border-radius: 8px; padding: 32px; text-align: center;">
        <div style="width: 64px; height: 64px; background: #1c6b4a; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: normal;">Pedido Confirmado!</h1>
        <p style="margin: 0 0 24px; color: #51635f; font-size: 16px;">
          Obrigado pela sua compra, ${data.customerName.split(" ")[0]}!
        </p>

        <div style="background: #f3eee3; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <div style="font-size: 12px; color: #51635f; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Código de rastreio
          </div>
          <div style="font-family: monospace; font-size: 20px; letter-spacing: 1px; color: #0f3a3e;">
            ${data.trackingTokenFormatted}
          </div>
          <a href="${orderUrl}" style="display: inline-block; margin-top: 16px; background: #0f3a3e; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: 600;">
            Acompanhar Pedido
          </a>
        </div>

        <div style="text-align: left; margin: 32px 0;">
          <div style="font-size: 12px; color: #51635f; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
            Resumo do Pedido #${data.orderId.slice(0, 8).toUpperCase()}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${itemsHtml}
            <tr>
              <td style="padding: 16px 0 8px; font-weight: 600;">Total</td>
              <td style="padding: 16px 0 8px; font-weight: 600; text-align: right;">${formatBRL(data.total)}</td>
            </tr>
          </table>
        </div>

        <p style="margin: 32px 0 0; color: #51635f; font-size: 14px; line-height: 1.5;">
          Você receberá atualizações sobre o status do seu pedido por e-mail.<br>
          Em caso de dúvidas, entre em contato: <a href="mailto:sac@fragranciaria.com" style="color: #b07b1e;">sac@fragranciaria.com</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 24px; color: #51635f; font-size: 12px;">
        © ${(new Date()).getFullYear()} Fragranciaria. Todos os direitos reservados.
      </div>
    </div>
  </body>
</html>`,
      });

      if (error) {
        console.error("[email] Falha ao enviar e-mail", {
          orderId: data.orderId,
          error: error.message,
        });
        return { success: false, error: error.message };
      }

      console.log("[email] E-mail de confirmação enviado", {
        orderId: data.orderId,
        email: data.customerEmail,
      });
      return { success: true };
    } catch (err: any) {
      console.error("[email] Erro inesperado", {
        orderId: data.orderId,
        error: err?.message,
      });
      return { success: false, error: err?.message || "Erro ao enviar e-mail" };
    }
  });