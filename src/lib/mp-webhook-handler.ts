import crypto from "node:crypto";
import { canTransition } from "@/lib/order-state";
import { getMissingPaymentSnapshotFields, type PaymentSnapshotOrder } from "@/lib/order-payment-snapshot";

export const mpWebhookCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payment = {
  id?: string | number;
  status?: string;
  status_detail?: string | null;
  external_reference?: string | null;
  payment_method_id?: string | null;
  payer?: { email?: string | null } | null;
  transaction_amount?: number | null;
};

export type WebhookOrder = PaymentSnapshotOrder & {
  id: string;
  status: string;
  payment_status: string | null;
  status_history: unknown;
};

type WebhookUpdate = {
  payment_id: string;
  status: string;
  payment_status: string;
  payment_method_id: string | null;
  payer_email: string | null;
  transaction_amount: number | null;
  status_history: Array<Record<string, unknown>>;
  raw: Payment;
  updated_at: string;
};

export type MpWebhookDependencies = {
  webhookSecret?: string;
  isDevelopment?: boolean;
  fetchPayment: (paymentId: string) => Promise<Payment>;
  findOrderById: (orderId: string) => Promise<WebhookOrder | null>;
  findOrderByPaymentId: (paymentId: string) => Promise<WebhookOrder | null>;
  updateOrder: (orderId: string, patch: WebhookUpdate) => Promise<void>;
  now?: () => string;
  log?: Pick<Console, "log" | "error">;
};

function verifySignature(request: Request, dataId: string, deps: MpWebhookDependencies): boolean {
  if (!deps.webhookSecret) return deps.isDevelopment === true;

  const parts: Record<string, string> = {};
  for (const segment of (request.headers.get("x-signature") || "").split(",")) {
    const [key, value] = segment.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  }

  const timestamp = parts.ts;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const requestId = request.headers.get("x-request-id") || "";
  let manifest = `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${timestamp};`;

  const expected = crypto.createHmac("sha256", deps.webhookSecret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function mapMpStatus(payment: Payment): { orderStatus: string; paymentStatus: string } {
  switch (String(payment.status || "").toLowerCase()) {
    case "approved":
      return { orderStatus: "paid", paymentStatus: "approved" };
    case "pending":
    case "in_process":
      return { orderStatus: "pending", paymentStatus: "pending" };
    case "authorized":
      return { orderStatus: "pending", paymentStatus: "authorized" };
    case "rejected":
    case "cancelled":
      return { orderStatus: "cancelled", paymentStatus: "rejected" };
    case "refunded":
    case "charged_back":
      return { orderStatus: "refunded", paymentStatus: String(payment.status) };
    default:
      return { orderStatus: "pending", paymentStatus: String(payment.status || "unknown") };
  }
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: mpWebhookCorsHeaders });
}

export async function handleMpWebhookRequest(
  request: Request,
  deps: MpWebhookDependencies,
): Promise<Response> {
  const log = deps.log ?? console;
  let body: { type?: string; data?: { id?: string | number } };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (body.type !== "payment" || !body.data?.id) {
    log.log("[mp-webhook] evento não tratado", {
      type: body.type ?? null,
      id: body.data?.id ?? null,
    });
    return json({ received: true, ignored: true });
  }

  const paymentId = String(body.data.id);
  if (!verifySignature(request, paymentId, deps)) return json({ error: "invalid signature" }, 401);

  try {
    const payment = await deps.fetchPayment(paymentId);
    const externalReference = payment.external_reference || null;
    const existing = externalReference
      ? await deps.findOrderById(externalReference)
      : await deps.findOrderByPaymentId(paymentId);

    if (!existing) {
      log.error("[mp-webhook] pedido não encontrado para pagamento", { paymentId, externalReference });
      return json({ received: true, orderFound: false });
    }

    if (existing.payment_id === paymentId && existing.payment_status === payment.status) {
      log.log("[mp-webhook] reentrega ignorada", { paymentId, status: payment.status });
      return json({ received: true, deduplicated: true });
    }

    const mapped = mapMpStatus(payment);
    const now = (deps.now ?? (() => new Date().toISOString()))();
    const history = Array.isArray(existing.status_history) ? [...existing.status_history] : [];
    const snapshot = { ...existing, payment_id: paymentId };
    const missingFields = mapped.paymentStatus === "approved"
      ? getMissingPaymentSnapshotFields(snapshot)
      : [];
    const paymentConfirmedWithoutSnapshot = missingFields.length > 0;

    history.push(
      paymentConfirmedWithoutSnapshot
        ? {
            status: "approved_pending_snapshot",
            detail: `missing: ${missingFields.join(", ")}`,
            at: now,
          }
        : {
            status: payment.status || "unknown",
            detail: payment.status_detail || null,
            at: now,
          },
    );

    const nextStatus = paymentConfirmedWithoutSnapshot
      ? existing.status
      : canTransition(existing.status, mapped.orderStatus)
        ? mapped.orderStatus
        : existing.status;

    if (paymentConfirmedWithoutSnapshot) {
      log.error("[mp-webhook] pagamento aprovado aguardando snapshot", {
        orderId: existing.id,
        paymentId,
        missingFields,
      });
    }

    await deps.updateOrder(existing.id, {
      payment_id: paymentId,
      status: nextStatus,
      payment_status: mapped.paymentStatus,
      payment_method_id: payment.payment_method_id || null,
      payer_email: payment.payer?.email || null,
      transaction_amount: payment.transaction_amount ?? null,
      status_history: history.slice(-20),
      raw: payment,
      updated_at: now,
    });

    log.log("[mp-webhook] pagamento processado", {
      orderId: existing.id,
      paymentId,
      paymentStatus: mapped.paymentStatus,
      status: nextStatus,
      missingFields,
    });
    return json({ received: true, pendingSnapshot: paymentConfirmedWithoutSnapshot });
  } catch (error: any) {
    log.error("[mp-webhook] erro", { message: error?.message || "unknown" });
    return json({ received: true, error: error?.message || "unknown" });
  }
}
