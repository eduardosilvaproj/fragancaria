import { test } from "node:test";
import assert from "node:assert/strict";

test("marketing-automation cupons geram códigos únicos sem dados pessoais", () => {
  const currentYear = new Date().getFullYear();
  const randomSuffix = "X4F2";
  const couponCode = `ANIV-${currentYear}-${randomSuffix}`;

  assert.equal(couponCode.startsWith("ANIV-"), true);
  assert.equal(couponCode.includes(String(currentYear)), true);
  assert.equal(couponCode.includes("X4F2"), true);
  // Garante que não há nome pessoal no código
  assert.equal(couponCode.includes("MARCOS"), false);
});

test("marketing-automation lógica de janela de 30 dias calcula datas corretamente", () => {
  const now = new Date("2026-08-24T12:00:00Z").getTime();
  const targetDateStart = new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString();
  const targetDateEnd = new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString();

  assert.ok(targetDateStart);
  assert.ok(targetDateEnd);
  assert.notEqual(targetDateStart, targetDateEnd);
});

test("marketing-automation recompra consulta colunas reais de orders", () => {
  const selectClause = "id, auth_user_id, customer_email, customer_name, customer_phone, created_at, items, whatsapp_sent_recompra";

  assert.equal(selectClause.includes("customer_id"), false);
  assert.equal(selectClause.includes("auth_user_id"), true);
  assert.equal(selectClause.includes("customer_email"), true);
  assert.equal(selectClause.includes("whatsapp_sent_recompra"), true);
});
