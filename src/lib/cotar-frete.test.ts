import { test } from "node:test";
import assert from "node:assert/strict";
import { resolverPrecoCotacao, type MelhorEnvioProduto } from "./melhor-envio-client.server";

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

const AGORA = 1_800_000_000_000;
const FUTURO = new Date(AGORA + 60 * 60 * 1000).toISOString();
const PASSADO = new Date(AGORA - 60 * 1000).toISOString();
const OPCOES_EXEMPLO = [
  { servicoId: 1, transportadora: "Correios", servico: "PAC", precoCentavos: 2500, prazoDias: 7, precoExibidoCentavos: 2500 },
  { servicoId: 2, transportadora: "Correios", servico: "SEDEX", precoCentavos: 4200, prazoDias: 3, precoExibidoCentavos: 0 },
];

test("cotação válida usa o preço gravado (em reais, convertido de centavos)", () => {
  const resultado = resolverPrecoCotacao({ expires_at: FUTURO, options: OPCOES_EXEMPLO }, 1, AGORA);
  assert.deepEqual(resultado, { ok: true, precoReais: 25 });
});

test("cotação válida com frete grátis aplicado retorna 0", () => {
  const resultado = resolverPrecoCotacao({ expires_at: FUTURO, options: OPCOES_EXEMPLO }, 2, AGORA);
  assert.deepEqual(resultado, { ok: true, precoReais: 0 });
});

test("cotação expirada é rejeitada", () => {
  const resultado = resolverPrecoCotacao({ expires_at: PASSADO, options: OPCOES_EXEMPLO }, 1, AGORA);
  assert.deepEqual(resultado, { ok: false, erro: "expirada" });
});

test("servicoId fora das opções gravadas é rejeitado", () => {
  const resultado = resolverPrecoCotacao({ expires_at: FUTURO, options: OPCOES_EXEMPLO }, 999, AGORA);
  assert.deepEqual(resultado, { ok: false, erro: "opcao_invalida" });
});

test("cotação inexistente (quote null) é rejeitada", () => {
  const resultado = resolverPrecoCotacao(null, 1, AGORA);
  assert.deepEqual(resultado, { ok: false, erro: "nao_encontrada" });
});
