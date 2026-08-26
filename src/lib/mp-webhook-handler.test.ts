import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMpWebhookRequest, type WebhookOrder } from "./mp-webhook-handler";

const NOW = "2026-07-17T00:00:00.000Z";

function makeRequest(body: unknown) {
  return new Request("https://loja/api/public/mp-webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const completeSnapshot = {
  shipping_address: {
    street: "Rua A",
    number: "10",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    cep: "01310100",
  },
  customer_phone: "(11) 99999-9999",
  customer_cpf: "390.533.447-05",
};

function makeDeps(order: WebhookOrder | null, payment: Record<string, unknown>) {
  const updates: Array<{ orderId: string; patch: any }> = [];
  // Ids dos pedidos para os quais o "Pedido Confirmado" foi disparado.
  const emails: string[] = [];
  // Ids dos pedidos para os quais o cupom foi incrementado.
  const couponIncrements: string[] = [];
  // Ids dos pedidos para os quais o dispatchNotification foi chamado.
  const notifications: Array<{ event: string; orderId: string }> = [];
  const deps = {
    webhookSecret: undefined,
    isDevelopment: true,
    now: () => NOW,
    log: { log: console.log, error: console.error },
    fetchPayment: async () => payment,
    findOrderById: async (id: string) => (order && order.id === id ? { ...order } : null),
    findOrderByPaymentId: async () => (order ? { ...order } : null),
    updateOrder: async (orderId: string, patch: any) => {
      updates.push({ orderId, patch });
      if (order) {
        Object.assign(order, patch);
      }
    },
    sendPaymentConfirmedEmail: async (orderId: string) => {
      emails.push(orderId);
    },
    incrementCouponUsage: async (orderId: string) => {
      couponIncrements.push(orderId);
    },
    dispatchNotification: async (event: 'order.approved' | 'order.shipped' | 'order.created', payload: { orderId: string }) => {
      notifications.push({ event, orderId: payload.orderId });
    },
  };
  return { deps, updates, emails, couponIncrements, notifications };
}

test("aprovado com snapshot completo vira paid", async () => {
  const order: WebhookOrder = {
    id: "order-1",
    status: "pending",
    payment_status: "pending",
    payment_id: null,
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, updates } = makeDeps(order, {
    id: 555,
    status: "approved",
    external_reference: "order-1",
  });

  const res = await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 555 } }), deps);
  const json = await res.json();

  assert.equal(res.status, 200);
  assert.equal(json.pendingSnapshot, false);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].patch.status, "paid");
  assert.equal(updates[0].patch.payment_status, "approved");
  assert.equal(updates[0].patch.payment_id, "555");
});

test("aprovado com snapshot incompleto grava pagamento mas NÃO vira paid", async () => {
  const order: WebhookOrder = {
    id: "order-2",
    status: "pending",
    payment_status: "pending",
    payment_id: null,
    status_history: [],
    ...completeSnapshot,
    customer_phone: null, // falta telefone
  };
  const { deps, updates } = makeDeps(order, {
    id: 777,
    status: "approved",
    external_reference: "order-2",
  });

  const res = await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 777 } }), deps);
  const json = await res.json();

  assert.equal(json.pendingSnapshot, true);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].patch.status, "pending"); // não avança
  assert.equal(updates[0].patch.payment_status, "approved"); // pagamento registrado
  assert.equal(updates[0].patch.payment_id, "777");
  const last = updates[0].patch.status_history.at(-1);
  assert.equal(last.status, "approved_pending_snapshot");
  assert.match(last.detail, /customer_phone/);
});

test("evento duplicado não reprocessa", async () => {
  const order: WebhookOrder = {
    id: "order-3",
    status: "paid",
    payment_status: "approved",
    payment_id: "999",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, updates } = makeDeps(order, {
    id: 999,
    status: "approved",
    external_reference: "order-3",
  });

  const res = await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 999 } }), deps);
  const json = await res.json();

  assert.equal(json.deduplicated, true);
  assert.equal(updates.length, 0);
});

test("PIX aprovado dispara e-mail de confirmação", async () => {
  const order: WebhookOrder = {
    id: "order-pix",
    status: "pending",
    payment_status: "pending",
    payment_id: "111",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, updates, emails, couponIncrements } = makeDeps(order, {
    id: 111,
    status: "approved",
    payment_method_id: "pix",
    external_reference: "order-pix",
  });

  await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 111 } }), deps);

  assert.equal(updates[0].patch.status, "paid");
  assert.deepEqual(emails, ["order-pix"]);
  // Mesma guarda do e-mail: aprovação incrementa o cupom uma vez.
  assert.deepEqual(couponIncrements, ["order-pix"]);
});

test("reentrega sobre pedido já aprovado NÃO incrementa cupom de novo", async () => {
  // Segundo evento com status_detail diferente sobre pedido já pago: escapa da
  // dedup do topo, mas a guarda payment_status !== approved impede o duplo
  // incremento. Sem UNIQUE que proteja usage_count, essa guarda é a rede.
  const order: WebhookOrder = {
    id: "order-recount",
    status: "paid",
    payment_status: "approved",
    payment_id: "222",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, couponIncrements } = makeDeps(order, {
    id: 222,
    status: "approved",
    status_detail: "accredited_late",
    external_reference: "order-recount",
  });

  await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 222 } }), deps);

  assert.deepEqual(couponIncrements, []);
});

test("pagamento rejeitado NÃO incrementa cupom", async () => {
  const order: WebhookOrder = {
    id: "order-rej-coupon",
    status: "pending",
    payment_status: "pending",
    payment_id: "333",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, couponIncrements } = makeDeps(order, {
    id: 333,
    status: "rejected",
    external_reference: "order-rej-coupon",
  });

  await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 333 } }), deps);

  assert.deepEqual(couponIncrements, []);
});

test("pedido já aprovado NÃO reenvia e-mail (status_detail novo)", async () => {
  // Reentrega com status_detail diferente escapa da dedup do topo (que compara
  // só payment_id + status), então sem a guarda de payment_status o e-mail
  // sairia duas vezes para o mesmo pagamento.
  const order: WebhookOrder = {
    id: "order-pago",
    status: "paid",
    payment_status: "approved",
    payment_id: "222",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, emails } = makeDeps(order, {
    id: 222,
    status: "approved",
    status_detail: "accredited_late",
    external_reference: "order-pago",
  });

  await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 222 } }), deps);

  assert.deepEqual(emails, []);
});

test("aprovado sem snapshot NÃO envia e-mail", async () => {
  // Pagamento aprovado mas pedido incompleto: não virou paid, então prometer
  // "Pedido Confirmado" seria mentira — o pedido ainda não pode ser separado.
  const order: WebhookOrder = {
    id: "order-sem-snap",
    status: "pending",
    payment_status: "pending",
    payment_id: "333",
    status_history: [],
    ...completeSnapshot,
    customer_cpf: null,
  };
  const { deps, emails } = makeDeps(order, {
    id: 333,
    status: "approved",
    external_reference: "order-sem-snap",
  });

  const res = await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 333 } }), deps);
  const json = await res.json();

  assert.equal(json.pendingSnapshot, true);
  assert.deepEqual(emails, []);
});

test("pagamento rejeitado NÃO envia e-mail de confirmação", async () => {
  const order: WebhookOrder = {
    id: "order-rej",
    status: "pending",
    payment_status: "pending",
    payment_id: "444",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, emails } = makeDeps(order, {
    id: 444,
    status: "rejected",
    external_reference: "order-rej",
  });

  await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 444 } }), deps);

  assert.deepEqual(emails, []);
});

test("notificação de venda aprovada é disparada exatamente uma vez (idempotência)", async () => {
  const order: WebhookOrder = {
    id: "order-notif",
    status: "pending",
    payment_status: "pending",
    payment_id: "777",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, notifications } = makeDeps(order, {
    id: 777,
    status: "approved",
    external_reference: "order-notif",
  });

  // Primeira vez: aprova
  await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 777 } }), deps);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].event, 'order.approved');
  assert.equal(notifications[0].orderId, 'order-notif');

  // Segunda vez (reentrega): nada acontece (webhook-handler.ts já faz dedup)
  await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 777 } }), deps);
  assert.equal(notifications.length, 1);
});

test("webhook funciona sem sendPaymentConfirmedEmail configurado", async () => {
  const order: WebhookOrder = {
    id: "order-noemail",
    status: "pending",
    payment_status: "pending",
    payment_id: "555",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, updates } = makeDeps(order, {
    id: 555,
    status: "approved",
    external_reference: "order-noemail",
  });
  // @ts-expect-error remove a dep opcional de propósito
  delete deps.sendPaymentConfirmedEmail;

  const res = await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 555 } }), deps);

  assert.equal(res.status, 200);
  assert.equal(updates[0].patch.status, "paid");
});

test("evento não-payment é logado e responde 200", async () => {
  const { deps, updates } = makeDeps(null, {});
  const logs: Array<[string, unknown]> = [];
  deps.log = {
    log: (message: string, context?: unknown): void => { logs.push([message, context]); },
    error: (): void => {},
  };

  const res = await handleMpWebhookRequest(
    makeRequest({ type: "merchant_order", data: { id: 123 } }),
    deps,
  );
  const json = await res.json();

  assert.equal(res.status, 200);
  assert.equal(json.ignored, true);
  assert.equal(updates.length, 0);
  assert.deepEqual(logs, [["[mp-webhook] evento não tratado", { type: "merchant_order", id: 123 }]]);
});

test("pedido com payment_status: approved mas status: pending vira paid com webhook approved", async () => {
  const order: WebhookOrder = {
    id: "order-pending-approved",
    status: "pending",
    payment_status: "approved",
    payment_id: "777",
    status_history: [],
    ...completeSnapshot,
  };
  const { deps, updates } = makeDeps(order, {
    id: 777,
    status: "approved",
    external_reference: "order-pending-approved",
  });

  const res = await handleMpWebhookRequest(makeRequest({ type: "payment", data: { id: 777 } }), deps);
  const json = await res.json();

  assert.equal(res.status, 200);
  assert.equal(json.pendingSnapshot, false);
  assert.equal(json.deduplicated, undefined); // Não deve ser deduplicado!
  assert.equal(updates.length, 1);
  assert.equal(updates[0].patch.status, "paid");
});
