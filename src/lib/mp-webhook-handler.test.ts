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
  const deps = {
    webhookSecret: undefined,
    isDevelopment: true,
    now: () => NOW,
    log: { log: () => {}, error: () => {} },
    fetchPayment: async () => payment,
    findOrderById: async (id: string) => (order && order.id === id ? order : null),
    findOrderByPaymentId: async () => order,
    updateOrder: async (orderId: string, patch: any) => {
      updates.push({ orderId, patch });
    },
  };
  return { deps, updates };
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

test("evento não-payment é logado e responde 200", async () => {
  const { deps, updates } = makeDeps(null, {});
  const logs: Array<[string, unknown]> = [];
  deps.log = {
    log: (message: string, context: unknown) => logs.push([message, context]),
    error: () => {},
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
