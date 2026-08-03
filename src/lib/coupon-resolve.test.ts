import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateCoupon } from "./coupon-resolve.functions";
import { couponDiscountAmount, type ResolvedCoupon } from "./commerce-config";

const NOW = new Date("2026-08-01T12:00:00Z");

// Row mínima válida; cada teste sobrescreve o que precisa.
function row(over: Record<string, unknown> = {}) {
  return {
    code: "TESTE",
    discount_type: "percentage",
    discount_value: 10,
    minimum_order_value: null,
    usage_limit: null,
    usage_count: 0,
    is_active: true,
    starts_at: null,
    expires_at: null,
    ...over,
  } as any;
}

test("cupom válido resolve tipo e valor da tabela", () => {
  const r = evaluateCoupon(row(), { subtotal: 100, alreadyFreeShipping: false }, NOW);
  assert.equal(r.valid, true);
  if (r.valid) {
    assert.equal(r.coupon.type, "percentage");
    assert.equal(r.coupon.value, 10);
    assert.equal(r.label, "10% de desconto");
  }
});

test("not_found quando a row é null", () => {
  const r = evaluateCoupon(null, { subtotal: 100, alreadyFreeShipping: false }, NOW);
  assert.deepEqual(r, { valid: false, reason: "not_found" });
});

test("inactive quando is_active = false", () => {
  const r = evaluateCoupon(row({ is_active: false }), { subtotal: 100, alreadyFreeShipping: false }, NOW);
  assert.equal(r.valid === false && r.reason, "inactive");
});

test("expired quando expires_at já passou", () => {
  const r = evaluateCoupon(
    row({ expires_at: "2026-07-31T00:00:00Z" }),
    { subtotal: 100, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid === false && r.reason, "expired");
});

test("expired quando starts_at ainda não chegou", () => {
  const r = evaluateCoupon(
    row({ starts_at: "2026-08-02T00:00:00Z" }),
    { subtotal: 100, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid === false && r.reason, "expired");
});

test("below_minimum quando o subtotal não atinge o mínimo", () => {
  const r = evaluateCoupon(
    row({ minimum_order_value: 150 }),
    { subtotal: 100, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid === false && r.reason, "below_minimum");
});

test("aceita quando o subtotal atinge exatamente o mínimo", () => {
  const r = evaluateCoupon(
    row({ minimum_order_value: 100 }),
    { subtotal: 100, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid, true);
});

test("usage_exceeded quando usage_count atingiu o limite", () => {
  const r = evaluateCoupon(
    row({ usage_limit: 5, usage_count: 5 }),
    { subtotal: 100, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid === false && r.reason, "usage_exceeded");
});

test("above_ceiling: percentual acima do teto é RECUSADO, não cortado", () => {
  // O incidente do smoke: cupom de 50% batia 30% silenciosamente. Agora recusa.
  const r = evaluateCoupon(
    row({ discount_type: "percentage", discount_value: 50 }),
    { subtotal: 250, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid === false && r.reason, "above_ceiling");
});

test("percentual no teto exato (30%) é aceito", () => {
  const r = evaluateCoupon(
    row({ discount_type: "percentage", discount_value: 30 }),
    { subtotal: 250, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid, true);
});

test("fixed_amount alto NÃO cai em above_ceiling (teto é só de percentual)", () => {
  // R$100 fixo num pedido de R$250 é válido; o cap de 30% morde no CÁLCULO
  // (couponDiscountAmount), não na validação. Aqui só confirma que resolve.
  const r = evaluateCoupon(
    row({ discount_type: "fixed_amount", discount_value: 100 }),
    { subtotal: 250, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid, true);
});

test("free_shipping_redundant quando o pedido já tem frete grátis", () => {
  const r = evaluateCoupon(
    row({ discount_type: "free_shipping", discount_value: 0 }),
    { subtotal: 250, alreadyFreeShipping: true },
    NOW,
  );
  assert.equal(r.valid === false && r.reason, "free_shipping_redundant");
});

test("free_shipping é aceito quando o pedido AINDA paga frete", () => {
  const r = evaluateCoupon(
    row({ discount_type: "free_shipping", discount_value: 0 }),
    { subtotal: 120, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid, true);
  if (r.valid) assert.equal(r.coupon.type, "free_shipping");
});

test("label do cupom fixo mostra reais", () => {
  const r = evaluateCoupon(
    row({ discount_type: "fixed_amount", discount_value: 20 }),
    { subtotal: 100, alreadyFreeShipping: false },
    NOW,
  );
  assert.equal(r.valid === true && r.label, "R$ 20,00 de desconto");
});

// TESTE DE FORJA — o núcleo do item 3 do C14.
// O desconto SEMPRE deriva do cupom resolvido (tipo + valor da tabela), nunca
// de um número que o cliente informa. Aqui simulamos um cliente que "reivindica"
// 100% de desconto: o valor real aplicado ignora isso e vem do cupom.
test("forja: valor do desconto vem do cupom, não do que o cliente afirma", () => {
  // Cupom real da tabela: 10%.
  const resolved = evaluateCoupon(row({ discount_value: 10 }), { subtotal: 100, alreadyFreeShipping: false }, NOW);
  assert.equal(resolved.valid, true);
  const couponFromDb = resolved.valid ? resolved.coupon : null;

  // O que o cliente "mandaria" numa forja: um cupom de 100%.
  const forjado: ResolvedCoupon = { code: "TESTE", type: "percentage", value: 100 };

  // O servidor calcula a partir do cupom RESOLVIDO (couponFromDb), não do forjado.
  const descontoReal = couponDiscountAmount(100, couponFromDb);
  const descontoForjado = couponDiscountAmount(100, forjado);

  assert.equal(descontoReal, 10, "desconto real segue os 10% da tabela");
  // O forjado nem chega a 100: o teto de 30% morde. Prova que mesmo se o valor
  // vazasse do cliente, o teto limita — mas o ponto é que couponFromDb é a
  // fonte, e ele traz 10, não 100.
  assert.equal(descontoForjado, 30);
  assert.notEqual(descontoReal, descontoForjado);
});
