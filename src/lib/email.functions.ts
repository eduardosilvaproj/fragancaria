import { Resend } from "resend";
import { formatBRL } from "./utils";

// Envia e-mail de confirmação com token de rastreio via Resend.
// Chamada APENAS server-side (a partir de createPayment); nunca pelo cliente.
// Por isso é plain function, não createServerFn — menos overhead e menos risco.
// Requer RESEND_API_KEY no Railway. Se ausente, loga e retorna sem quebrar o
// checkout (o token continua sendo exibido na tela de confirmação).
//
// IMPORTANTE: o dominio do remetente (fragranciaria.com) precisa estar
// verificado no Resend, senao o envio falha com erro de dominio.

type OrderEmailInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  trackingTokenFormatted: string;
  items: Array<{ title?: string; name?: string; quantity: number; price: number }>;
};

export async function sendOrderConfirmationEmail(
  input: OrderEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY ausente — e-mail nao enviado", {
      orderId: input.orderId,
    });
    return { success: false, error: "RESEND_API_KEY ausente" };
  }

  try {
    const resend = new Resend(apiKey);
    const base = process.env.PUBLIC_URL || "https://www.fragranciaria.com";
    const orderUrl = `${base}/pedido/${input.trackingTokenFormatted.replace(/-/g, "")}`;
    const firstName = input.customerName.split(" ")[0] || "cliente";
    const itemsHtml = input.items
      .map((it) => {
        const title = it.title ?? it.name ?? "";
        return `<tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${it.quantity}x ${title}</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${formatBRL(it.price * it.quantity)}</td>
            </tr>`;
      })
      .join("");

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.customerEmail],
      subject: `Pedido Confirmado #${input.orderId.slice(0, 8).toUpperCase()}`,
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
        <div style="width: 64px; height: 64px; background: #1c6b4a; border-radius: 50%; margin: 0 auto 24px; line-height: 64px;">
          <span style="color: white; font-size: 32px;">&#10004;</span>
        </div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: normal;">Pedido Confirmado!</h1>
        <p style="margin: 0 0 24px; color: #51635f; font-size: 16px;">
          Obrigado pela sua compra, ${firstName}!
        </p>

        <div style="background: #f3eee3; border-radius: 6px; padding: 16px; margin: 24px 0;">
          <div style="font-size: 12px; color: #51635f; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Codigo de rastreio
          </div>
          <div style="font-family: monospace; font-size: 20px; letter-spacing: 1px; color: #0f3a3e;">
            ${input.trackingTokenFormatted}
          </div>
          <a href="${orderUrl}" style="display: inline-block; margin-top: 16px; background: #0f3a3e; color: white; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-size: 14px; font-weight: 600;">
            Acompanhar Pedido
          </a>
        </div>

        <div style="text-align: left; margin: 32px 0;">
          <div style="font-size: 12px; color: #51635f; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px;">
            Resumo do Pedido #${input.orderId.slice(0, 8).toUpperCase()}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${itemsHtml}
            <tr>
              <td style="padding: 16px 0 8px; font-weight: 600;">Total</td>
              <td style="padding: 16px 0 8px; font-weight: 600; text-align: right;">${formatBRL(input.total)}</td>
            </tr>
          </table>
        </div>

        <p style="margin: 32px 0 0; color: #51635f; font-size: 14px; line-height: 1.5;">
          Voce recebera atualizacoes sobre o status do seu pedido por e-mail.<br>
          Em caso de duvidas: <a href="mailto:sac@fragranciaria.com" style="color: #b07b1e;">sac@fragranciaria.com</a>
        </p>
      </div>
      <div style="text-align: center; margin-top: 24px; color: #51635f; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Fragranciaria. Todos os direitos reservados.
      </div>
    </div>
  </body>
</html>`,
    });

    if (error) {
      console.error("[email] Falha ao enviar", {
        orderId: input.orderId,
        error: error.message,
      });
      return { success: false, error: error.message };
    }

    console.log("[email] E-mail de confirmacao enviado", {
      orderId: input.orderId,
      email: input.customerEmail,
    });
    return { success: true };
  } catch (err: any) {
    console.error("[email] Erro inesperado", {
      orderId: input.orderId,
      error: err?.message,
    });
    return { success: false, error: err?.message || "Erro ao enviar e-mail" };
  }
}
