import { describe, it } from "node:test";
import assert from "node:assert";
import { canTransition, isOrderStatus, allowedNextStatuses } from "./order-state";

describe("canTransition", () => {
  it("permite paid -> processing", () => {
    assert.strictEqual(canTransition("paid", "processing"), true);
  });

  it("permite processing -> shipped", () => {
    assert.strictEqual(canTransition("processing", "shipped"), true);
  });

  it("permite processing -> cancelled", () => {
    assert.strictEqual(canTransition("processing", "cancelled"), true);
  });

  it("permite processing -> refunded", () => {
    assert.strictEqual(canTransition("processing", "refunded"), true);
  });

  it("rejeita processing -> paid (regressão)", () => {
    assert.strictEqual(canTransition("processing", "paid"), false);
  });

  it("rejeita out_for_delivery como origem", () => {
    assert.strictEqual(canTransition("out_for_delivery", "delivered"), false);
  });

  it("rejeita out_for_delivery como destino", () => {
    assert.strictEqual(canTransition("shipped", "out_for_delivery"), false);
  });

  it("permite paid -> shipped (expedição sem separação formal)", () => {
    assert.strictEqual(canTransition("paid", "shipped"), true);
  });

  it("permite shipped -> delivered", () => {
    assert.strictEqual(canTransition("shipped", "delivered"), true);
  });

  it("permite delivered -> refunded", () => {
    assert.strictEqual(canTransition("delivered", "refunded"), true);
  });

  it("permite pending -> paid", () => {
    assert.strictEqual(canTransition("pending", "paid"), true);
  });

  it("permite pending -> cancelled", () => {
    assert.strictEqual(canTransition("pending", "cancelled"), true);
  });

  it("permite paid -> cancelled", () => {
    assert.strictEqual(canTransition("paid", "cancelled"), true);
  });

  it("permite paid -> refunded", () => {
    assert.strictEqual(canTransition("paid", "refunded"), true);
  });

  it("rejeita pending -> shipped (pula paid)", () => {
    assert.strictEqual(canTransition("pending", "shipped"), false);
  });

  it("rejeita shipped -> paid (regressão)", () => {
    assert.strictEqual(canTransition("shipped", "paid"), false);
  });

  it("rejeita status inexistente", () => {
    assert.strictEqual(canTransition("paid", "invalid_status"), false);
  });

  it("aceita approved como alias de paid (origem)", () => {
    assert.strictEqual(canTransition("approved", "shipped"), true);
  });

  it("aceita approved como alias de paid (destino)", () => {
    assert.strictEqual(canTransition("pending", "approved"), true);
  });

  it("permite mesmo status (idempotência)", () => {
    assert.strictEqual(canTransition("paid", "paid"), true);
  });
});

describe("isOrderStatus", () => {
  it("aceita processing", () => {
    assert.strictEqual(isOrderStatus("processing"), true);
  });

  it("rejeita out_for_delivery", () => {
    assert.strictEqual(isOrderStatus("out_for_delivery"), false);
  });

  it("aceita paid", () => {
    assert.strictEqual(isOrderStatus("paid"), true);
  });

  it("aceita shipped", () => {
    assert.strictEqual(isOrderStatus("shipped"), true);
  });
});

describe("allowedNextStatuses", () => {
  it("paid permite processing, shipped, cancelled, refunded", () => {
    const next = allowedNextStatuses("paid");
    assert.deepStrictEqual(next, ["processing", "shipped", "cancelled", "refunded"]);
  });

  it("processing permite shipped, cancelled, refunded", () => {
    const next = allowedNextStatuses("processing");
    assert.deepStrictEqual(next, ["shipped", "cancelled", "refunded"]);
  });

  it("rejeita out_for_delivery como entrada", () => {
    const next = allowedNextStatuses("out_for_delivery");
    assert.deepStrictEqual(next, []);
  });
});
