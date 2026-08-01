import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDiscount,
  calculateDiscountFromPercent,
  calculateOrderTotal,
  calculateShipping,
  couponDiscountAmount,
  applyCouponToShipping,
  getShippingPrice,
  qualifiesForFreeShipping,
  type ResolvedCoupon,
} from "./commerce-config";

const pct = (v: number): ResolvedCoupon => ({ code: "P", type: "percentage", value: v });
const fixed = (v: number): ResolvedCoupon => ({ code: "F", type: "fixed_amount", value: v });
const freeShip: ResolvedCoupon = { code: "S", type: "free_shipping", value: 0 };

test("paga frete abaixo de 199 e zera em 199", () => {
  assert.equal(qualifiesForFreeShipping(198.99), false);
  assert.equal(qualifiesForFreeShipping(199), true);
  assert.equal(calculateShipping(198.99, "pac"), 18.9);
  assert.equal(calculateShipping(199, "pac"), 0);
});

test("cupom percentual sobre o subtotal", () => {
  assert.equal(couponDiscountAmount(100, pct(10)), 10);
  assert.equal(couponDiscountAmount(250, pct(20)), 50);
});

test("cupom percentual respeita o teto de 30%", () => {
  assert.equal(couponDiscountAmount(100, pct(60)), 30);
});

test("cupom fixo desconta o valor em reais", () => {
  assert.equal(couponDiscountAmount(100, fixed(20)), 20);
});

test("cupom fixo nunca passa do subtotal (não gera total negativo)", () => {
  // Cupom de R$50 num pedido de R$40: desconto = 40, não 50. Mas o teto de
  // 30% morde antes (12), então é 12. O importante: nunca > subtotal.
  assert.equal(couponDiscountAmount(40, fixed(50)), 12);
  // Sem o teto morder: R$50 num pedido de R$1000 = 50 (abaixo dos 30% = 300).
  assert.equal(couponDiscountAmount(1000, fixed(50)), 50);
});

test("cupom fixo respeita o teto de 30% do subtotal", () => {
  // R$50 num pedido de R$60: 30% = 18, então corta em 18, não 50.
  assert.equal(couponDiscountAmount(60, fixed(50)), 18);
});

test("free_shipping não desconta nada do subtotal", () => {
  assert.equal(couponDiscountAmount(100, freeShip), 0);
});

test("free_shipping zera o frete; outros tipos não mexem", () => {
  assert.equal(applyCouponToShipping(18.9, freeShip), 0);
  assert.equal(applyCouponToShipping(18.9, pct(10)), 18.9);
  assert.equal(applyCouponToShipping(18.9, fixed(20)), 18.9);
  assert.equal(applyCouponToShipping(18.9, null), 18.9);
});

test("cupom + PIX somam, com teto de 30%", () => {
  // 10% cupom + 5% PIX = 15% de 100 = 15.
  assert.equal(calculateDiscount(100, { coupon: pct(10), paymentMethod: "pix" }), 15);
  // 28% cupom + 5% PIX = 33%, cortado em 30.
  assert.equal(calculateDiscount(100, { coupon: pct(28), paymentMethod: "pix" }), 30);
});

test("fixo + PIX: soma respeita subtotal e teto", () => {
  // R$20 fixo + 5% PIX (5) = 25 num pedido de 100 = 25 (abaixo dos 30).
  assert.equal(calculateDiscount(100, { coupon: fixed(20), paymentMethod: "pix" }), 25);
});

test("sem cupom, só PIX", () => {
  assert.equal(calculateDiscount(100, { coupon: null, paymentMethod: "pix" }), 5);
  assert.equal(calculateDiscount(100, { paymentMethod: "credit_card" }), 0);
});

test("ignora cupom nulo", () => {
  assert.equal(couponDiscountAmount(100, null), 0);
  assert.equal(calculateDiscount(100, { coupon: null }), 0);
});

test("retorna null para método de frete inválido", () => {
  assert.equal(getShippingPrice("invalido"), null);
  assert.equal(calculateShipping(100, "invalido"), null);
});

test("calcula total final", () => {
  assert.equal(calculateOrderTotal({ subtotal: 100, shipping: 18.9, discount: 15 }), 103.9);
  // free_shipping: frete zerado entra como 0.
  assert.equal(calculateOrderTotal({ subtotal: 100, shipping: 0, discount: 0 }), 100);
});

test("calculateDiscountFromPercent segue com o teto de 30%", () => {
  assert.equal(calculateDiscountFromPercent(100, 10), 10);
  assert.equal(calculateDiscountFromPercent(100, 60), 30);
});
