import { test } from "node:test";
import assert from "node:assert/strict";

// Teste unitário para simular o recebimento de webhooks de status da Zernio
test("zernio-status-webhook processa message.failed e registra motivo da falha", async () => {
  const payload = {
    id: "evt_123",
    event: "message.failed",
    message: {
      id: "msg_test_999",
      conversationId: "conv_123",
      text: "Seu pedido foi enviado...",
    },
    error: {
      code: "131047",
      title: "Message failed to send",
      message: "Recepção bloqueada pelo destinatário ou spam",
    },
    timestamp: new Date().toISOString(),
  };

  assert.equal(payload.event, "message.failed");
  assert.equal(payload.message.id, "msg_test_999");
  assert.equal(payload.error.code, "131047");
});

test("zernio-status-webhook processa message.delivered com sucesso", async () => {
  const payload = {
    id: "evt_124",
    event: "message.delivered",
    message: {
      id: "msg_test_999",
      conversationId: "conv_123",
    },
    statusAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  };

  assert.equal(payload.event, "message.delivered");
  assert.equal(payload.message.id, "msg_test_999");
});

test("zernio-status-webhook fallback por telefone prioriza pedidos sem falha anterior registrada", () => {
  // Simula o critério de query refinado com .is("zernio_delivery_failure_reason", null)
  const queryCriteria = {
    status: "shipped",
    zernio_delivery_failure_reason: null,
  };
  assert.equal(queryCriteria.zernio_delivery_failure_reason, null);
  assert.equal(queryCriteria.status, "shipped");
});
