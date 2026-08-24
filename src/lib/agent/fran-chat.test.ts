import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminPhone } from "./fran-chat.functions";

test("Modo admin por número: número autorizado tem acesso (isAdminPhone = true)", () => {
  const originalEnv = process.env.WHATSAPP_ADMIN_PHONES;
  process.env.WHATSAPP_ADMIN_PHONES = "+5511999998888,+5516997150373";

  assert.equal(isAdminPhone("+5511999998888"), true);
  assert.equal(isAdminPhone("11999998888"), true);
  assert.equal(isAdminPhone("+5516997150373"), true);

  process.env.WHATSAPP_ADMIN_PHONES = originalEnv;
});

test("Modo admin por número: número comum NÃO tem acesso (isAdminPhone = false)", () => {
  const originalEnv = process.env.WHATSAPP_ADMIN_PHONES;
  process.env.WHATSAPP_ADMIN_PHONES = "+5511999998888";

  assert.equal(isAdminPhone("+5511911112222"), false);
  assert.equal(isAdminPhone(null), false);
  assert.equal(isAdminPhone(undefined), false);

  process.env.WHATSAPP_ADMIN_PHONES = originalEnv;
});
