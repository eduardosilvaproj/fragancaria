import { test } from "node:test";
import assert from "node:assert/strict";
import { distributeDiscount } from "./nfe.functions";

test("distribui desconto de R$ 10,00 em 3 itens iguais de R$ 33,33 (resíduo no último)", () => {
  const items = [
    { valorTotal: 33.33 },
    { valorTotal: 33.33 },
    { valorTotal: 33.33 },
  ];
  const distributed = distributeDiscount(items, 10.00);
  const sumDiscount = distributed.reduce((s, i) => s + (i.desconto || 0), 0);
  assert.equal(Number(sumDiscount.toFixed(2)), 10.00);
  assert.equal(distributed[0].desconto, 3.33);
  assert.equal(distributed[1].desconto, 3.33);
  assert.equal(distributed[2].desconto, 3.34);
});

test("distribui desconto em itens com valores diferentes (R$ 15,50 em R$ 20 e R$ 80)", () => {
  const items = [
    { valorTotal: 20.00 },
    { valorTotal: 80.00 },
  ];
  const distributed = distributeDiscount(items, 15.50);
  const sumDiscount = distributed.reduce((s, i) => s + (i.desconto || 0), 0);
  assert.equal(Number(sumDiscount.toFixed(2)), 15.50);
  assert.equal(distributed[0].desconto, 3.10);
  assert.equal(distributed[1].desconto, 12.40);
});

test("sem desconto ou itens vazios não altera os itens", () => {
  const items = [{ valorTotal: 50.00 }];
  const distributedZero = distributeDiscount(items, 0);
  assert.deepEqual(distributedZero, items);

  const distributedEmpty = distributeDiscount([], 10.00);
  assert.deepEqual(distributedEmpty, []);
});
