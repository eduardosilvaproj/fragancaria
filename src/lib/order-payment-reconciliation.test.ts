import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reconcileApprovedOrderSnapshot,
  type ReconciliationOrder,
} from "./order-payment-reconciliation";

const NOW = "2026-07-17T00:00:00.000Z";

const validAddress = {
  street: "Rua A",
  number: "10",
  neighborhood: "Centro",
  city: "São Paulo",
  state: "SP",
  cep: "01310100",
};

const baseOrder: ReconciliationOrder = {
  status: "pending",
  payment_status: "approved",
  payment_id: "555",
  status_history: [],
  shipping_address: null,
  customer_phone: null,
  customer_cpf: null,
};

test("completedFields reflete só o que faltava antes do patch", () => {
  // Pedido só sem CPF: telefone e endereço já válidos.
  const order: ReconciliationOrder = {
    ...baseOrder,
    customer_phone: "(11) 98888-7777",
    shipping_address: validAddress,
  };
  const result = reconcileApprovedOrderSnapshot(
    order,
    {
      customerPhone: "(11) 98888-7777",
      customerCpf: "390.533.447-05",
      shippingAddress: validAddress,
    },
    NOW,
  );

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.patch.status, "paid");
  assert.deepEqual(result.completedFields, ["customer_cpf"]);
  const last = result.patch.status_history.at(-1);
  assert.equal(last.status, "snapshot_completed");
  assert.match(last.detail, /customer_cpf/);
  assert.doesNotMatch(last.detail, /customer_phone/);
});

test("CPF inválido é bloqueado", () => {
  const result = reconcileApprovedOrderSnapshot(
    baseOrder,
    {
      customerPhone: "(11) 99999-9999",
      customerCpf: "111.111.111-11", // dígitos iguais: reprovado no checksum
      shippingAddress: validAddress,
    },
    NOW,
  );

  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.missingFields.includes("customer_cpf"));
});

test("sem completar todos os campos, transição é bloqueada", () => {
  const result = reconcileApprovedOrderSnapshot(
    baseOrder,
    { customerPhone: "(11) 99999-9999" }, // falta CPF e endereço
    NOW,
  );

  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.missingFields.includes("customer_cpf"));
  assert.ok(result.missingFields.includes("shipping_address"));
});

test("pedido que não é pending+approved é rejeitado", () => {
  const result = reconcileApprovedOrderSnapshot(
    { ...baseOrder, status: "paid" },
    { customerPhone: "(11) 99999-9999" },
    NOW,
  );

  assert.equal(result.success, false);
});
