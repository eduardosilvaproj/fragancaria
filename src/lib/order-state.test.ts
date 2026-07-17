import { describe, it } from "node:test";
import assert from "node:assert";
import { canTransition, isOrderStatus, allowedNextStatuses } from "./order-state";

describe("canTransition", () => {
  it("rejeita processing como origem", () => {
    assert.strictEqual(canTransition("processing", "shipped"), false);
  });

  it("rejeita processing como destino", () => {
    assert.strictEqual(canTransition("paid", "processing"), false);
  });

  it("rejeita processing como origem e destino", () => {
    assert.strictEqual(canTransition("processing", "processing"), false);
  });

  it("permite paid -> shipped", () => {
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
  it("rejeita processing", () => {
    assert.strictEqual(isOrderStatus("processing"), false);
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
  it("paid permite shipped, cancelled, refunded", () => {
    const next = allowedNextStatuses("paid");
    assert.deepStrictEqual(next, ["shipped", "cancelled", "refunded"]);
  });

  it("rejeita processing como entrada", () => {
    const next = allowedNextStatuses("processing");
    assert.deepStrictEqual(next, []);
  });
});
