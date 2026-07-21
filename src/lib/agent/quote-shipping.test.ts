import { test } from "node:test";
import assert from "node:assert/strict";
import { produtoParaMelhorEnvio, buscarProdutosParaCotacao } from "./quote-shipping";

// ─── produtoParaMelhorEnvio ────────────────────────────────────────

test("produtoParaMelhorEnvio converte gramas para kg", () => {
  const result = produtoParaMelhorEnvio(
    { weight_grams: 250, price: 89.9, width_cm: 10, height_cm: 5, length_cm: 15 },
    2,
  );
  assert.equal(result.weight, 0.25);
  assert.equal(result.insurance_value, 89.9);
  assert.equal(result.quantity, 2);
  assert.equal(result.width, 10);
  assert.equal(result.height, 5);
  assert.equal(result.length, 15);
});

test("produtoParaMelhorEnvio 1000g vira 1kg", () => {
  const result = produtoParaMelhorEnvio(
    { weight_grams: 1000, price: 50, width_cm: 10, height_cm: 5, length_cm: 15 },
    1,
  );
  assert.equal(result.weight, 1);
});

test("produtoParaMelhorEnvio 0g vira 0kg", () => {
  const result = produtoParaMelhorEnvio(
    { weight_grams: 0, price: 10, width_cm: 5, height_cm: 5, length_cm: 5 },
    1,
  );
  assert.equal(result.weight, 0);
});

// ─── buscarProdutosParaCotacao ──────────────────────────────────────

function makeChain(data: unknown, error: unknown) {
  const then = (resolve: (v: unknown) => void) => resolve({ data, error });
  const chain = { then, select: () => chain, in: () => chain, eq: () => chain };
  return chain;
}

function fakeProductDb(data: Array<Record<string, unknown>> | null, error: unknown = null) {
  return { from: () => makeChain(data, error) };
}

test("buscarProdutosParaCotacao retorna array vazio se lista vazia", async () => {
  const result = await buscarProdutosParaCotacao(fakeProductDb([]), []);
  assert.deepEqual(result, []);
});

test("buscarProdutosParaCotacao retorna array vazio se db der erro", async () => {
  const result = await buscarProdutosParaCotacao(fakeProductDb(null, new Error("db down")), [
    { id: "p1", quantity: 1 },
  ]);
  assert.deepEqual(result, []);
});

test("buscarProdutosParaCotacao retorna produtos encontrados", async () => {
  const result = await buscarProdutosParaCotacao(
    fakeProductDb([
      { id: "p1", weight_grams: 250, price: 89.9, width_cm: 10, height_cm: 5, length_cm: 15 },
      { id: "p2", weight_grams: 500, price: 45, width_cm: 8, height_cm: 4, length_cm: 12 },
    ]),
    [
      { id: "p1", quantity: 2 },
      { id: "p2", quantity: 1 },
    ],
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].weight, 0.25);
  assert.equal(result[0].quantity, 2);
  assert.equal(result[1].weight, 0.5);
  assert.equal(result[1].quantity, 1);
});

test("buscarProdutosParaCotacao filtra produtos que não existem no banco", async () => {
  const result = await buscarProdutosParaCotacao(
    fakeProductDb([
      { id: "p1", weight_grams: 250, price: 89.9, width_cm: 10, height_cm: 5, length_cm: 15 },
    ]),
    [
      { id: "p1", quantity: 1 },
      { id: "p2", quantity: 1 },
    ],
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "produto-consulta");
});
