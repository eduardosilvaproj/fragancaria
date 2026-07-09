import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
const MP_API = "https://api.mercadopago.com/v1/payments";

// A3: token alphabet (31 glyphs: A-Z minus I/L/O plus 2-9) matches the
// regex enforced by getOrderByTrackingToken. randomBytes(32) gives ~256 bits
// of entropy from /dev/urandom; modulo-31 with rejection sampling means we
// draw uniform over the 31 glyphs. 16 chars * log2(31) = ~77.5 bits output.
const TRACKING_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function generateTrackingToken(): string {
  const buf = randomBytes(32);
  const len = TRACKING_ALPHABET.length;
  let out = "";
  for (let i = 0; out.length < 16 && i < buf.length; i++) {
    const b = buf[i]!;
    if (b < 256 - (256 % len)) out += TRACKING_ALPHABET[b % len];
  }
  return out.length === 16 ? out : generateTrackingToken();
}
function formatToken(t: string): string {
  return `${t.slice(0, 4)}-${t.slice(4, 8)}-${t.slice(8, 12)}-${t.slice(12, 16)}`;
}
const cpfSchema = z.string().min(11).max(14).transform((v) => v.replace(/\D/g, "")).refine((d) => d.length === 11, "CPF deve ter 11 digitos");
const payerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  identification: z.object({ type: z.literal("CPF"), number: cpfSchema }),
  address: z.object({ zipCode: z.string().min(8).max(9), streetName: z.string().min(1), streetNumber: z.string().min(1), neighborhood: z.string().min(1), city: z.string().min(1), state: z.string().length(2), complement: z.string().optional() }).optional(),
});
const cartItemSchema = z.object({ id: z.string(), title: z.string(), quantity: z.number().int().positive(), price: z.number().positive(), image: z.string().optional() });
const inputSchema = z.object({
  method: z.enum(["pix", "boleto", "credit_card"]),
  amount: z.number().positive().max(1_000_000),
  description: z.string().min(1).max(256),
  payer: payerSchema,
  token: z.string().optional(),
  installments: z.number().int().min(1).max(12).optional(),
  paymentMethodId: z.string().optional(),
  issuerId: z.string().optional(),
  items: z.array(cartItemSchema).min(1).optional(),
  subtotal: z.number().nonnegative().optional(),
  discount: z.number().nonnegative().optional(),
  shippingPrice: z.number().nonnegative().optional(),
  shippingMethod: z.string().optional(),
  userId: z.string().uuid().optional(),
  externalReference: z.string().uuid().optional(),
});
function translateMpError(msg: string, method: string): string {
  const lower = (msg || "").toLowerCase();
  if (lower.includes('collector user without key enabled for qr render')) return 'PIX nao habilitado. Use cartao.';
  if (lower.includes('invalid card_token') || lower.includes('invalid token')) return 'Dados do cartao invalidos.';
  if (lower.includes('invalid installments')) return 'Parcelas invalidas.';
  if (lower.includes('invalid access token')) return 'Token MP invalido.';
  return msg;
}
function mpWebhookUrl(req: Request | undefined, fallback: string): string {
  try {
    const host = req?.headers?.get('host') || req?.headers?.get('x-forwarded-host');
    const proto = req?.headers?.get('x-forwarded-proto') || 'https';
    if (!host) return fallback;
    return `${proto}://${host}/api/public/mp-webhook`;
  } catch { return fallback; }
}
function itemsForMp(items: Array<{ id: string; title: string; quantity: number; price: number }> | undefined) {
  if (!items || items.length === 0) return undefined;
  return items.map((i) => ({ id: i.id, title: i.title, quantity: i.quantity, unit_price: Number(i.price.toFixed(2)) }));
}
type CreatePaymentInput = z.infer<typeof inputSchema>;
export const createPayment = createServerFn({ method: 'POST' })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const request = getRequest();
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return { success: false, error: 'MP_ACCESS_TOKEN nao configurado' };
    const { supabaseAdmin: admin } = await import(
      '@/integrations/supabase/client.server'
    );
    let orderId: string | undefined;
    try {
      // 1) cria pedido "pending" antes de chamar MP. external_reference = order.id.
      //    se o cliente reenviar, o id do pedido continua igual (idempotente).
      orderId = data.externalReference;
      if (!orderId) {
        const { data: inserted, error: orderErr } = await admin
          .from('orders')
          .insert({
            status: 'pending',
            payment_status: 'pending',
            payment_method: data.method,
            total: data.amount,
            subtotal: data.subtotal ?? data.amount,
            discount: data.discount ?? 0,
            shipping_price: data.shippingPrice ?? 0,
            shipping_method: data.shippingMethod ?? null,
            items: data.items ?? [],
            // @ts-expect-error auth_user_id added in prior migration; generated types stale. See agente-fase1.md.
            auth_user_id: data.userId ?? null,
            customer_email: data.payer.email,
            customer_name: `${data.payer.firstName} ${data.payer.lastName}`.trim(),
            // @ts-expect-error tracking_token added in 20260708a; generated types stale. See agente-fase1.md.
            tracking_token: generateTrackingToken(),
          })
          .select('id')
          .single();
        if (orderErr || !inserted) {
          return { success: false, error: orderErr?.message || 'Falha ao criar pedido' };
        }
        orderId = inserted.id;
      }
      // 2) monta body do pagamento conforme spec /v1/payments (sdk mercadopago v2.x).
      //    - payer.address: snake_case (zip_code, street_name, street_number, federal_unit)
      //    - 'state' (BR) -> 'federal_unit'; 'complement' NAO EXISTE no AddressRequest -> omitir.
      //    - items vao em additional_info.items (nao na raiz).
      const itemsForAdditionalInfo = data.items ? itemsForMp(data.items) : undefined;
      const payerAddress = data.payer.address
        ? {
            zip_code: data.payer.address.zipCode,
            street_name: data.payer.address.streetName,
            street_number: data.payer.address.streetNumber,
            neighborhood: data.payer.address.neighborhood,
            city: data.payer.address.city,
            federal_unit: data.payer.address.state,
          }
        : undefined;
      const body: any = {
        transaction_amount: Number(data.amount.toFixed(2)),
        description: data.description,
        payment_method_id: data.method === 'pix' ? 'pix' : data.method === 'boleto' ? 'bolbradesco' : (data.paymentMethodId || ''),
        external_reference: orderId,
        notification_url: mpWebhookUrl(request, `${process.env.PUBLIC_URL || 'https://www.fragranciaria.com'}/api/public/mp-webhook`),
        payer: {
          email: data.payer.email,
          first_name: data.payer.firstName,
          last_name: data.payer.lastName,
          identification: data.payer.identification,
          ...(payerAddress && { address: payerAddress }),
        },
      };
      if (itemsForAdditionalInfo && itemsForAdditionalInfo.length > 0) {
        body.additional_info = { items: itemsForAdditionalInfo };
      }
      if (data.method === 'credit_card') {
        body.token = data.token;
        body.installments = data.installments || 1;
        if (data.issuerId) body.issuer_id = data.issuerId;
      }
      const resp = await fetch(MP_API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': orderId },
        body: JSON.stringify(body),
      });
      const json: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const mpMsg = json?.message || json?.error || `HTTP ${resp.status}`;
        // apaga o pedido "pending" para nao ficar orfao.
        await admin.from('orders').delete().eq('id', orderId).is('payment_id', null);
        return { success: false, error: translateMpError(mpMsg, data.method) };
      }
      // 3) vincula payment_id ao pedido e guarda a primeira versao do status.
      const paymentId = json?.id;
      // guarda contra MP retornar 200 sem id (resposta degenerada): trata como falha e apaga orfao.
      if (!paymentId) {
        await admin.from('orders').delete().eq('id', orderId).is('payment_id', null);
        return { success: false, error: 'Resposta MP sem payment_id (rejeitada sem detalhe).' };
      }
      const status = json?.status || 'pending';
      const statusDetail = json?.status_detail || null;
      if (paymentId) {
        await admin.from('orders').update({
          payment_id: String(paymentId),
          payment_status: status,
          // @ts-expect-error payment_method_id added in prior migration; generated types stale. See agente-fase1.md.
          payment_method_id: json?.payment_method_id || null,
          // @ts-expect-error transaction_amount added in prior migration; generated types stale. See agente-fase1.md.
          transaction_amount: json?.transaction_amount ?? null,
          payer_email: data.payer.email,
          raw: json,
        }).eq('id', orderId);
      }
      const result: any = { id: paymentId, orderId, status };
// devolve o token (raw + formatado) para a UI do checkout exibir o banner.
      const { data: freshOrder } = await admin.from('orders').select('tracking_token').eq('id', orderId).maybeSingle();
      const trackingToken = (freshOrder as unknown as { tracking_token?: string | null } | null)?.tracking_token;
      if (trackingToken) {
        result.trackingToken = trackingToken;
        result.trackingTokenFormatted = formatToken(trackingToken);
      }
      if (data.method === 'pix') {
        const tx = json?.point_of_interaction?.transaction_data || {};
        result.pixQrCode = tx.qr_code_base64 || null;
        result.pixCode = tx.qr_code || null;
        result.pixTicketUrl = tx.ticket_url || null;
        result.expiresAt = tx.expiration_date || json?.date_of_expiration || null;
      }
      if (data.method === 'boleto') {
        result.boletoUrl = json?.transaction_details?.external_resource_url || json?.point_of_interaction?.transaction_data?.ticket_url || null;
        result.boletoBarcode = json?.barcode?.content || null;
        result.expiresAt = json?.date_of_expiration || null;
      }
      result.installments = json?.installments || null;
      result.statusDetail = statusDetail;
      return { success: true, data: result };
    } catch (e: any) {
      // se o INSERT passou antes do erro (ex.: fetch do MP estourou), apaga o orfao.
      if (orderId) {
        try { await admin.from('orders').delete().eq('id', orderId).is('payment_id', null); }
        catch { /* ignore secondary error */ }
      }
      return { success: false, error: e?.message || 'erro' };
    }
  });
