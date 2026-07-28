import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildInsuranceValue,
  prepareGenerateOrderLabelPurchase,
  type GenerateOrderLabelOrder,
  type ProductRow,
  type SenderInfo,
} from "./generate-order-label-core";

// =====================================================
// buildInsuranceValue — options.insurance_value do POST /me/cart
// =====================================================

test("soma unitary_value * quantity de todos os produtos", () => {
  assert.equal(
    buildInsuranceValue([
      { id: "a", name: "A", quantity: 2, unitary_value: 89.9 },
      { id: "b", name: "B", quantity: 1, unitary_value: 45.5 },
    ]),
    225.3,
  );
});

test("aplica piso de R$ 1,00 (API rejeita abaixo disso)", () => {
  // Caso real do pedido 876F3D56: produto de R$ 1,00 -> fica em 1,00
  assert.equal(buildInsuranceValue([{ id: "a", name: "A", quantity: 1, unitary_value: 1 }]), 1);
  // Abaixo do piso sobe para 1,00
  assert.equal(buildInsuranceValue([{ id: "a", name: "A", quantity: 1, unitary_value: 0.5 }]), 1);
  // Lista vazia nao manda 0 (422 garantido)
  assert.equal(buildInsuranceValue([]), 1);
});

test("nao acumula drift de float ao somar centavos", () => {
  assert.equal(
    buildInsuranceValue([
      { id: "a", name: "A", quantity: 1, unitary_value: 0.1 },
      { id: "b", name: "B", quantity: 1, unitary_value: 0.2 },
      { id: "c", name: "C", quantity: 1, unitary_value: 10 },
    ]),
    10.3,
  );
});

test("quantity multiplica em centavos, nao em reais", () => {
  // 0.07 * 10 em float daria 0.7000000000000001
  assert.equal(buildInsuranceValue([{ id: "a", name: "A", quantity: 10, unitary_value: 0.07 }]), 1);
  assert.equal(buildInsuranceValue([{ id: "a", name: "A", quantity: 30, unitary_value: 0.07 }]), 2.1);
});

test("ignora valores nao numericos em vez de virar NaN", () => {
  assert.equal(
    buildInsuranceValue([
      { id: "a", name: "A", quantity: 1, unitary_value: 50 },
      { id: "b", name: "B", quantity: Number.NaN, unitary_value: 10 },
      { id: "c", name: "C", quantity: 1, unitary_value: Number.NaN },
    ]),
    50,
  );
});

// =====================================================
// prepareGenerateOrderLabelPurchase — payload montado
// =====================================================

const PRODUCT: ProductRow = {
  id: "PROD-1",
  name: "Perfume Teste",
  price: 120,
  weight_grams: 250,
  height_cm: 5,
  width_cm: 10,
  length_cm: 15,
  is_active: true,
};

const ORDER: GenerateOrderLabelOrder = {
  id: "order-1",
  customer_name: "Cliente Teste",
  customer_email: "cliente@teste.com",
  customer_phone: "11999999999",
  customer_cpf: "52998224725", // CPF valido pelo checksum
  shipping_address: {
    street: "Avenida Paulista",
    number: "1000",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310100",
  },
  items: [{ id: "PROD-1", title: "Perfume Teste", quantity: 2, price: 120 }],
  total: 249.31,
  tracking_code: null,
  shipping_service_id: 33,
  shipping_service_name: "JeT • Standard",
  shipping_quoted_cents: 931,
  shipping_charged_cents: 931,
};

const SENDER_PJ: SenderInfo = {
  name: "Fragranciaria",
  document: "11222333000181", // 14 digitos -> PJ
  phone: "1699999999",
  email: "contato@fragranciaria.com",
  address: {
    street: "Alameda Paulista",
    number: "206",
    neighborhood: "Jardim Silvana",
    city: "Araraquara",
    state: "SP",
    postal_code: "14811060",
  },
};

function prepare(sender: SenderInfo = SENDER_PJ) {
  return prepareGenerateOrderLabelPurchase({
    order: ORDER,
    existingShipments: [],
    senderInfo: sender,
    products: [PRODUCT],
  });
}

test("payload inclui options.insurance_value com a soma dos produtos", () => {
  const prepared = prepare();
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  // 2 x 120 = 240 — NAO 249.31 (total, que inclui frete de 9.31)
  assert.equal(prepared.melhorEnvioInput.options.insurance_value, 240);
  assert.notEqual(prepared.melhorEnvioInput.options.insurance_value, ORDER.total);
});

test("insurance_value bate com os produtos que vao no payload", () => {
  const prepared = prepare();
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  const somaDoPayload = prepared.melhorEnvioInput.products.reduce(
    (total, p) => total + p.unitary_value * p.quantity,
    0,
  );
  assert.equal(prepared.melhorEnvioInput.options.insurance_value, somaDoPayload);
});

test("options NAO inclui invoice (nao emitimos NF-e neste fluxo)", () => {
  const prepared = prepare();
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  assert.equal("invoice" in prepared.melhorEnvioInput.options, false);
});

test("remetente PJ manda state_register ISENTO", () => {
  const prepared = prepare();
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  assert.equal(prepared.melhorEnvioInput.from.company_document, "11222333000181");
  assert.equal(prepared.melhorEnvioInput.from.document, undefined);
  assert.equal(prepared.melhorEnvioInput.from.state_register, "ISENTO");
});

test("remetente PF nao manda state_register", () => {
  const prepared = prepare({ ...SENDER_PJ, document: "52998224725" }); // 11 digitos
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  assert.equal(prepared.melhorEnvioInput.from.document, "52998224725");
  assert.equal(prepared.melhorEnvioInput.from.company_document, undefined);
  assert.equal(prepared.melhorEnvioInput.from.state_register, undefined);
});

test("idempotencia: pedido com tracking_code nao chega a montar payload", () => {
  const prepared = prepareGenerateOrderLabelPurchase({
    order: { ...ORDER, tracking_code: "ME123BR" },
    existingShipments: [],
    senderInfo: SENDER_PJ,
    products: [PRODUCT],
  });
  assert.equal(prepared.ok, false);
  if (prepared.ok) return;
  assert.match(prepared.error, /já possui etiqueta/);
});

test("idempotencia: shipment gravado tambem bloqueia", () => {
  const prepared = prepareGenerateOrderLabelPurchase({
    order: ORDER,
    existingShipments: [{ shipment_id_external: "ship-1", label_url: null, tracking_code: null }],
    senderInfo: SENDER_PJ,
    products: [PRODUCT],
  });
  assert.equal(prepared.ok, false);
});
