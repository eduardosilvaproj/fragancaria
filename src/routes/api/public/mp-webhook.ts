import { createFileRoute } from '@tanstack/react-router';
import crypto from 'node:crypto';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
// Valida X-Signature (header: 'v1,<hmac>'). Se MP_WEBHOOK_SECRET nao estiver
// setado, pula (modo dev). Docs: https://www.mercadopago.com.br/developers/pt/reference/notifications/webhooks
function verifySignature(request: Request, rawBody: string): boolean {
  if (!WEBHOOK_SECRET) return true;
  const header = request.headers.get('x-signature') || '';
  const ts = request.headers.get('x-timestamp') || '';
  const m = header.match(/v1=([a-f0-9]+)/i);
  if (!m) return false;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${ts}.${rawBody}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(m[1], 'hex'), Buffer.from(expected, 'hex')); } catch { return false; }
}
function mapMpStatus(p: any): { orderStatus: string; paymentStatus: string } {
  const s = String(p?.status || '').toLowerCase();
  switch (s) {
    case 'approved': return { orderStatus: 'paid', paymentStatus: 'approved' };
    case 'pending':
    case 'in_process': return { orderStatus: 'pending', paymentStatus: 'pending' };
    case 'authorized': return { orderStatus: 'pending', paymentStatus: 'authorized' };
    case 'rejected':
    case 'cancelled': return { orderStatus: 'cancelled', paymentStatus: 'rejected' };
    case 'refunded':
    case 'charged_back': return { orderStatus: 'refunded', paymentStatus: s };
    default: return { orderStatus: 'pending', paymentStatus: s || 'unknown' };
  }
}
export const Route = createFileRoute('/api/public/mp-webhook')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!verifySignature(request, raw)) {
          return Response.json({ error: 'invalid signature' }, { status: 401, headers: corsHeaders });
        }
        let body: any = {};
        try { body = JSON.parse(raw); } catch { return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders }); }
        if (body?.type !== 'payment' || !body?.data?.id) {
          return Response.json({ received: true, ignored: true }, { headers: corsHeaders });
        }
        const paymentId = String(body.data.id);
        const accessToken = process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
          return Response.json({ error: 'MP_ACCESS_TOKEN nao configurado' }, { status: 500, headers: corsHeaders });
        }
        try {
          const authHeader = 'Bearer ' + accessToken;
          const resp = await fetch('https://api.mercadopago.com/v1/payments/' + paymentId, { headers: { Authorization: authHeader } });
          const payment: any = await resp.json();
          const externalRef = payment?.external_reference || null;
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
          // 1) dedupe: se o ultimo pagamento registrado for igual ao atual e ja foi processado, ignora.
          if (externalRef) {
            const { data: existing } = await supabaseAdmin.from('orders').select('payment_id, payment_status, status_history').eq('id', externalRef).single();
            if (existing && (existing as any).payment_id === paymentId && (existing as any).payment_status === payment?.status) {
              console.log('[mp-webhook] reentrega ignorada para', paymentId, 'status', payment?.status);
              return Response.json({ received: true, deduplicated: true }, { headers: corsHeaders });
            }
          }
          const mapped = mapMpStatus(payment);
          // 2) monta status_history (mantem os 20 ultimos).
          const history = Array.isArray((existing as any)?.status_history) ? (existing as any).status_history : [];
          history.push({ status: payment?.status || 'unknown', detail: payment?.status_detail || null, at: new Date().toISOString() });
          const trimmedHistory = history.slice(-20);
          // 3) update por external_reference (preferencial) OU por payment_id (fallback).
          const updatePayload: any = {
            payment_id: paymentId,
            status: mapped.orderStatus,
            payment_status: mapped.paymentStatus,
            payment_method_id: payment?.payment_method_id || null,
            payer_email: payment?.payer?.email || null,
            transaction_amount: payment?.transaction_amount ?? null,
            status_history: trimmedHistory,
            raw: payment,
            updated_at: new Date().toISOString(),
          };
          let upErr: any = null;
          if (externalRef) {
            const r = await supabaseAdmin.from('orders').update(updatePayload).eq('id', externalRef);
            upErr = r.error;
          } else {
            // fallback: tenta por payment_id (webhook chegou antes do createPayment salvar o external_ref)
            const r = await supabaseAdmin.from('orders').update(updatePayload).eq('payment_id', paymentId);
            upErr = r.error;
          }
          if (upErr) console.error('[mp-webhook] orders update error', upErr);
          console.log('[mp-webhook] payment', paymentId, '->', mapped.paymentStatus, '(order', externalRef, ')');
          return Response.json({ received: true }, { headers: corsHeaders });
        } catch (err: any) {
          console.error('[mp-webhook] error', err);
          // devolve 200 mesmo em erro para MP nao reentregar a cada 5s.
          // o erro fica no log; investigar depois.
          return Response.json({ received: true, error: err?.message || 'unknown' }, { status: 200, headers: corsHeaders });
        }
      },
    },
  },
});
