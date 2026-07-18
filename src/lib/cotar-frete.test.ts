import { test } from "node:test";
import assert from "node:assert/strict";
import type { MelhorEnvioProduto } from "./melhor-envio-client.server";

function produtoFromDb(p: { weight_grams: number; price: number; width_cm: number; height_cm: number; length_cm: number }, quantity: number): MelhorEnvioProduto {
  return {
    id: "produto-1",
    weight: Number(p.weight_grams) / 1000,
    width: Number(p.width_cm),
    height: Number(p.height_cm),
    length: Number(p.length_cm),
    insurance_value: Number(p.price),
    quantity,
  };
}

test("converte weight_grams do banco para kg no payload da Melhor Envio", () => {
  const produto = produtoFromDb({ weight_grams: 250, price: 89.9, width_cm: 10, height_cm: 5, length_cm: 15 }, 2);
  assert.equal(produto.weight, 0.25);
});

test("weight_grams igual a 1000 vira 1kg exato", () => {
  const produto = produtoFromDb({ weight_grams: 1000, price: 50, width_cm: 10, height_cm: 5, length_cm: 15 }, 1);
  assert.equal(produto.weight, 1);
});

test("weight_grams zero vira 0kg (sem NaN/Infinity)", () => {
  const produto = produtoFromDb({ weight_grams: 0, price: 10, width_cm: 5, height_cm: 5, length_cm: 5 }, 1);
  assert.equal(produto.weight, 0);
});
