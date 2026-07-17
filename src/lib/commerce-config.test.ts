import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COUPONS,
  calculateDiscount,
  calculateDiscountFromPercent,
  calculateOrderTotal,
  calculateShipping,
  getCoupon,
  getShippingPrice,
  qualifiesForFreeShipping,
} from "./commerce-config";

test("paga frete abaixo de 199 e zera em 199", () => {
  assert.equal(qualifiesForFreeShipping(198.99), false);
  assert.equal(qualifiesForFreeShipping(199), true);
  assert.equal(calculateShipping(198.99, "pac"), 18.9);
  assert.equal(calculateShipping(199, "pac"), 0);
});

test("aplica cupom + PIX com teto de 30%", () => {
  const subtotal = 100;
  const discount = calculateDiscount(subtotal, { couponCode: "BEMVINDO10", paymentMethod: "pix" });
  assert.equal(discount, 15);
  assert.equal(calculateDiscountFromPercent(subtotal, 60), 30);
});

test("ignora cupom inexistente", () => {
  assert.equal(getCoupon("naoexiste"), null);
  assert.equal(calculateDiscount(100, { couponCode: "naoexiste" }), 0);
});

test("retorna null para método de frete inválido", () => {
  assert.equal(getShippingPrice("invalido"), null);
  assert.equal(calculateShipping(100, "invalido"), null);
});

test("calcula total final", () => {
  assert.equal(calculateOrderTotal({ subtotal: 100, shipping: 18.9, discount: 15 }), 103.9);
  assert.equal(COUPONS.BEMVINDO10?.code, "BEMVINDO10");
});
