import { createFileRoute } from '@tanstack/react-router';
import crypto from 'node:crypto';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-signature, x-request-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
// Valida a assinatura do Mercado Pago conforme o esquema oficial.
// O header x-signature vem no formato "ts=<n>,v1=<hmac>". O texto assinado
// (manifest) é "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" — usando o
// data.id da query string, o header x-request-id e o ts extraído do próprio
// x-signature. Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
function verifySignature(request: Request, dataId: string): boolean {
  if (!WEBHOOK_SECRET) {
    // Fail closed: só ignora a verificação em modo dev explícito.
    if (process.env.NODE_ENV === 'development') return true;
    console.error('[mp-webhook] MP_WEBHOOK_SECRET ausente — rejeitando em produção');
    return false;
  }
  const sigHeader = request.headers.get('x-signature') || '';
  const requestId = request.headers.get('x-request-id') || '';
  // Parseia "ts=...,v1=..." em pares chave/valor.
  const parts: Record<string, string> = {};
  for (const seg of sigHeader.split(',')) {
    const [k, v] = seg.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) {
    console.error('[mp-webhook] x-signature sem ts/v1');
    return false;
  }
  // MP recomenda lowercase quando o id tiver letras (pagamentos são numéricos).
  const id = dataId ? dataId.toLowerCase() : '';
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex')); } catch { return false; }
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
        let body: any = {};
        try { body = JSON.parse(raw); } catch { return Response.json({ error: 'invalid json' }, { status: 400, headers: corsHeaders }); }
        if (body?.type !== 'payment' || !body?.data?.id) {
          return Response.json({ received: true, ignored: true }, { headers: corsHeaders });
        }
        const paymentId = String(body.data.id);
        if (!verifySignature(request, paymentId)) {
          return Response.json({ error: 'invalid signature' }, { status: 401, headers: corsHeaders });
        }
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
          let existing: any = null;
          if (externalRef) {
            const res = await supabaseAdmin.from('orders').select('status, payment_id, payment_status, status_history').eq('id', externalRef).single();
            existing = res.data;
            if (existing && existing.payment_id === paymentId && existing.payment_status === payment?.status) {
              console.log('[mp-webhook] reentrega ignorada para', paymentId, 'status', payment?.status);
              return Response.json({ received: true, deduplicated: true }, { headers: corsHeaders });
            }
          }
          const mapped = mapMpStatus(payment);
          // 2) monta status_history (mantem os 20 ultimos).
          const history = Array.isArray(existing?.status_history) ? existing.status_history : [];
          history.push({ status: payment?.status || 'unknown', detail: payment?.status_detail || null, at: new Date().toISOString() });
          const trimmedHistory = history.slice(-20);
          // 2b) guard de transição: uma notificação atrasada do MP não pode
          // regredir um pedido que já avançou (ex.: delivered/shipped voltar
          // para paid). Se a transição for inválida, preserva o status atual e
          // ainda assim atualiza payment_status/history/raw. Só valida quando
          // conhecemos o status atual (caminho por external_reference).
          const { canTransition } = await import('@/lib/order-state');
          const currentStatus = existing?.status ? String(existing.status) : null;
          const nextStatus =
            currentStatus && !canTransition(currentStatus, mapped.orderStatus)
              ? currentStatus
              : mapped.orderStatus;
          // 3) update por external_reference (preferencial) OU por payment_id (fallback).
          const updatePayload: any = {
            payment_id: paymentId,
            status: nextStatus,
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
