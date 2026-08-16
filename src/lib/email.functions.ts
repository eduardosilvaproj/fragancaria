import { Resend } from "resend";
import { formatBRL } from "./utils";
import { buildEmailLayout } from "./email-layout";

// Helper para converter HTML para texto puro simples (stripping de tags)
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type OrderEmailInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  trackingTokenFormatted: string;
  items: Array<{ title?: string; name?: string; quantity: number; price: number }>;
};

type RefundEmailInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  kind: "cancelled" | "refunded";
};

type OrderReceivedEmailInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  trackingTokenFormatted: string;
  paymentMethod: "pix" | "boleto";
};

export async function sendOrderReceivedEmail(
  input: OrderReceivedEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY ausente — e-mail não enviado");
    return { success: false, error: "RESEND_API_KEY ausente" };
  }
  try {
    const resend = new Resend(apiKey);
    const firstName = input.customerName.split(" ")[0] || "cliente";
    const shortId = input.orderId.slice(0, 8).toUpperCase();
    const isPix = input.paymentMethod === "pix";
    const instrucao = isPix
      ? "Seu pedido está reservado e aguarda o pagamento via PIX. Assim que o PIX cair, enviamos a confirmação."
      : "Seu pedido está reservado e aguarda o pagamento do boleto.";

    const html = buildEmailLayout({
      assunto: `Pedido recebido #${shortId} — falta o pagamento`,
      preheader: "Pagamento pendente para o seu pedido na Fragranciaria.",
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">Recebemos seu pedido</h1>
        <p style="margin:0 0 16px;color:#51635F;font-size:16px;">Olá, ${firstName}.</p>
        <p style="margin:0 0 20px;color:#51635F;font-size:15px;line-height:1.5;">${instrucao}</p>
        <p style="margin:0 0 24px;color:#51635F;font-size:15px;">Pedido <strong>#${shortId}</strong> · Total ${formatBRL(input.total)}</p>
      `,
    });

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.customerEmail],
      subject: `Pedido recebido #${shortId} — falta o pagamento`,
      html,
      text: htmlToText(html),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro interno" };
  }
}

export async function sendRefundEmail(
  input: RefundEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY ausente" };
  try {
    const resend = new Resend(apiKey);
    const firstName = input.customerName.split(" ")[0] || "cliente";
    const shortId = input.orderId.slice(0, 8).toUpperCase();
    const isRefund = input.kind === "refunded";
    const title = isRefund ? "Estorno processado" : "Pedido cancelado";
    const body = isRefund
      ? "Seu estorno foi processado."
      : "Seu pedido foi cancelado.";

    const html = buildEmailLayout({
      assunto: `${title} — Pedido #${shortId}`,
      preheader: title,
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">${title}</h1>
        <p style="margin:0 0 16px;color:#51635F;font-size:16px;">Olá, ${firstName}.</p>
        <p style="margin:0 0 16px;color:#51635F;font-size:15px;">${body}</p>
        <p style="margin:0 0 24px;color:#51635F;font-size:15px;">Pedido <strong>#${shortId}</strong></p>
      `,
    });

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.customerEmail],
      subject: `${title} — Pedido #${shortId}`,
      html,
      text: htmlToText(html),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro interno" };
  }
}

type StatusEmailInput = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  status: "shipped" | "delivered";
  trackingCode?: string | null;
};

export async function sendOrderStatusEmail(
  input: StatusEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY ausente" };
  try {
    const resend = new Resend(apiKey);
    const firstName = input.customerName.split(" ")[0] || "cliente";
    const shortId = input.orderId.slice(0, 8).toUpperCase();
    const shipped = input.status === "shipped";
    const title = shipped ? "Seu pedido foi enviado!" : "Seu pedido foi entregue!";
    const body = shipped ? "Boas notícias: seu pedido saiu para entrega." : "Seu pedido foi entregue.";

    const html = buildEmailLayout({
      assunto: `${title} — Pedido #${shortId}`,
      preheader: title,
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">${title}</h1>
        <p style="margin:0 0 16px;color:#51635F;font-size:16px;">Olá, ${firstName}.</p>
        <p style="margin:0 0 16px;color:#51635F;font-size:15px;">${body}</p>
        ${shipped && input.trackingCode ? `<p>Rastreio: <strong>${input.trackingCode}</strong></p>` : ""}
        <p style="margin:24px 0 0;color:#51635F;font-size:14px;">Pedido <strong>#${shortId}</strong></p>
      `,
    });

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.customerEmail],
      subject: `${title} — Pedido #${shortId}`,
      html,
      text: htmlToText(html),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro interno" };
  }
}

type AdminWelcomeEmailInput = {
  email: string;
  name: string;
  role: string;
  tempPassword: string;
};

export async function sendAdminWelcomeEmail(
  input: AdminWelcomeEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY ausente" };
  try {
    const resend = new Resend(apiKey);
    const html = buildEmailLayout({
      assunto: `Acesso administrativo`,
      preheader: "Bem-vindo ao painel.",
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">Acesso administrativo</h1>
        <p>Olá, ${input.name}. Seu acesso como ${input.role} foi criado.</p>
        <p>Senha temporária: <strong>${input.tempPassword}</strong></p>
      `,
    });

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.email],
      subject: `Acesso ao painel administrativo — ${input.name}`,
      html,
      text: htmlToText(html),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro interno" };
  }
}

export async function sendOrderConfirmationEmail(
  input: OrderEmailInput,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY ausente" };
  try {
    const resend = new Resend(apiKey);
    const firstName = input.customerName.split(" ")[0] || "cliente";
    const shortId = input.orderId.slice(0, 8).toUpperCase();

    const html = buildEmailLayout({
      assunto: `Pedido Confirmado #${shortId}`,
      preheader: "Obrigado pela sua compra!",
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">Pedido Confirmado!</h1>
        <p>Obrigado pela sua compra, ${firstName}!</p>
        <p>Pedido <strong>#${shortId}</strong> · Total ${formatBRL(input.total)}</p>
      `,
    });

    const { error } = await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.customerEmail],
      subject: `Pedido Confirmado #${shortId}`,
      html,
      text: htmlToText(html),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro interno" };
  }
}

export async function sendAdminSaleNotificationEmail(input: any) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const resend = new Resend(apiKey);
    const html = buildEmailLayout({
      assunto: `Novo Pedido #${input.orderId.slice(0, 8)}`,
      preheader: "Nova venda aprovada.",
      conteudo: `
        <h1 style="margin:0 0 16px;font-size:22px;color:#0F3A3E;">Novo pedido aprovado!</h1>
        <p>Pedido #${input.orderId.slice(0, 8)} - ${formatBRL(input.total)}</p>
      `,
    });
    await resend.emails.send({
      from: "Fragranciaria <naoresponda@fragranciaria.com>",
      to: [input.destination],
      subject: `🚨 Novo Pedido: #${input.orderId.slice(0, 8)}`,
      html,
      text: htmlToText(html),
    });
  } catch (err) {
    console.error(err);
  }
}
