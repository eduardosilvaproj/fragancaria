import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMelhorEnvioVolumeFromProducts,
  hasExistingPurchasedLabel,
  prepareGenerateOrderLabelPurchase,
  runGenerateOrderLabelCore,
} from "./generate-order-label-core";

const ORDER = {
  id: "order-1",
  customer_name: "Cliente Teste",
  customer_email: "cliente@teste.com",
  customer_phone: "11999999999",
  customer_cpf: "12345678909",
  shipping_address: {
    street: "Avenida Paulista",
    number: "1000",
    complement: "",
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310100",
  },
  items: [{ id: "produto-1::50ml", title: "Perfume", quantity: 2, price: 99.9 }],
  total: 199.8,
  tracking_code: null,
  shipping_service_id: 1,
  shipping_service_name: "Correios • PAC",
  shipping_quoted_cents: 2500,
  shipping_charged_cents: 0,
};

const SENDER = {
  name: "Fragranciaria",
  document: "12345678000195",
  phone: "16999999999",
  email: "contato@fragranciaria.com",
  address: {
    street: "Alameda Paulista",
    number: "10",
    complement: "",
    neighborhood: "Jardim Silvânia",
    city: "Araraquara",
    state: "SP",
    postal_code: "14811060",
  },
};

const PRODUCTS = [
  {
    id: "produto-1",
    name: "Perfume",
    price: 99.9,
    weight_grams: 250,
    height_cm: 5,
    width_cm: 10,
    length_cm: 15,
    is_active: true,
  },
];

test("idempotência bloqueia shipmentIdExternal, labelUrl e trackingCode", () => {
  assert.equal(hasExistingPurchasedLabel(null, { shipment_id_external: "ship-1" }), true);
  assert.equal(hasExistingPurchasedLabel(null, { label_url: "https://label" }), true);
  assert.equal(hasExistingPurchasedLabel(null, { tracking_code: "AB123BR" }), true);
  assert.equal(hasExistingPurchasedLabel("AB123BR", null), true);
  assert.equal(hasExistingPurchasedLabel(null, null), false);
});

test("volume usa produtos canônicos da cotação", () => {
  const volume = buildMelhorEnvioVolumeFromProducts(
    [
      { id: "a", name: "A", price: 10, weight_grams: 250, height_cm: 5, width_cm: 10, length_cm: 15, is_active: true },
      { id: "b", name: "B", price: 20, weight_grams: 500, height_cm: 3, width_cm: 12, length_cm: 20, is_active: true },
    ],
    [
      { id: "a", quantity: 2 },
      { id: "b", quantity: 1 },
    ],
  );

  assert.deepEqual(volume, { weight: 1, height: 13, width: 12, length: 20 });
});

test("pedido sem shipping_service_id aborta antes da compra", () => {
  const result = prepareGenerateOrderLabelPurchase({
    order: { ...ORDER, shipping_service_id: null },
    existingShipments: [],
    senderInfo: SENDER,
    products: PRODUCTS,
  });

  assert.deepEqual(result, {
    ok: false,
    error: "Pedido sem serviço de frete vinculado — não é possível gerar etiqueta automática.",
  });
});

test("pedido com CPF inválido aborta antes da compra", () => {
  const result = prepareGenerateOrderLabelPurchase({
    order: { ...ORDER, customer_cpf: "11111111111" },
    existingShipments: [],
    senderInfo: SENDER,
    products: PRODUCTS,
  });

  assert.deepEqual(result, {
    ok: false,
    error: "Pedido sem CPF válido — não é possível gerar etiqueta automática.",
  });
});

test("prepara compra usando serviço e volume dos dados canônicos", () => {
  const result = prepareGenerateOrderLabelPurchase({
    order: ORDER,
    existingShipments: [],
    senderInfo: SENDER,
    products: PRODUCTS,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.melhorEnvioInput, {
    serviceId: 1,
    from: {
      name: "Fragranciaria",
      phone: "16999999999",
      email: "contato@fragranciaria.com",
      document: undefined,
      company_document: "12345678000195",
      address: "Alameda Paulista",
      number: "10",
      complement: undefined,
      district: "Jardim Silvânia",
      city: "Araraquara",
      state_abbr: "SP",
      postal_code: "14811060",
    },
    to: {
      name: "Cliente Teste",
      phone: "11999999999",
      email: "cliente@teste.com",
      document: "12345678909",
      address: "Avenida Paulista",
      number: "1000",
      complement: undefined,
      district: "Bela Vista",
      city: "São Paulo",
      state_abbr: "SP",
      postal_code: "01310100",
    },
    products: [{ id: "produto-1", name: "Perfume", quantity: 2, unitary_value: 99.9 }],
    volumes: [{ weight: 0.5, height: 10, width: 10, length: 15 }],
  });
  assert.equal(result.quotedPrice, 25);
  assert.equal(result.chargedPrice, 0);
});

// Fake db mínimo que suporta o encadeamento que runGenerateOrderLabelCore usa.
// Mantém as shipping_quotes inseridas em memória para que a 2ª rodada veja a
// etiqueta da 1ª — provando a idempotência sem tocar em rede ou banco real.
function createFakeDb() {
  const shippingQuotes: Array<Record<string, unknown>> = [];
  return {
    shippingQuotes,
    from(table: string) {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { ...ORDER }, error: null }),
            }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "shipping_quotes") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: [...shippingQuotes], error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                const inserted = { id: `quote-${shippingQuotes.length + 1}`, ...row };
                shippingQuotes.push(inserted);
                return { data: inserted, error: null };
              },
            }),
          }),
        };
      }
      if (table === "shipping_settings") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { value: SENDER }, error: null }) }),
          }),
        };
      }
      if (table === "products") {
        return {
          select: () => ({ in: async () => ({ data: PRODUCTS, error: null }) }),
        };
      }
      throw new Error(`Tabela inesperada: ${table}`);
    },
  };
}

test("núcleo: 1ª chamada compra, 2ª aborta na idempotência sem debitar", async () => {
  const db = createFakeDb();
  let debits = 0;
  const comprar = async () => {
    debits += 1;
    return {
      ok: true as const,
      shipmentIdExternal: "ship-ext-1",
      labelUrl: "https://sandbox.melhorenvio.com.br/imprimir/abc",
      trackingCode: null,
    };
  };

  const r1 = await runGenerateOrderLabelCore(db, ORDER.id, comprar);
  assert.equal(r1.success, true);
  assert.equal(debits, 1);

  const r2 = await runGenerateOrderLabelCore(db, ORDER.id, comprar);
  assert.equal(r2.success, false);
  if (r2.success) return;
  assert.equal(r2.error, "Este pedido já possui etiqueta de frete comprada.");
  assert.equal(debits, 1); // 2ª chamada NÃO debitou
});

test("núcleo: falha da compra não grava shipping_quote nem debita duas vezes", async () => {
  const db = createFakeDb();
  const comprar = async () => ({ ok: false as const, erro: "checkout sandbox 422" });

  const result = await runGenerateOrderLabelCore(db, ORDER.id, comprar);
  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.error, "checkout sandbox 422");
  assert.equal(db.shippingQuotes.length, 0); // nada gravado
});
