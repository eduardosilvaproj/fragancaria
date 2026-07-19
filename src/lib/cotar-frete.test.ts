import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  comprarEtiqueta,
  resolverPrecoCotacao,
  type MelhorEnvioCompraInput,
  type MelhorEnvioProduto,
} from "./melhor-envio-client.server";

function produtoFromDb(
  p: {
    weight_grams: number;
    price: number;
    width_cm: number;
    height_cm: number;
    length_cm: number;
  },
  quantity: number,
): MelhorEnvioProduto {
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
  const produto = produtoFromDb(
    { weight_grams: 250, price: 89.9, width_cm: 10, height_cm: 5, length_cm: 15 },
    2,
  );
  assert.equal(produto.weight, 0.25);
});

test("weight_grams igual a 1000 vira 1kg exato", () => {
  const produto = produtoFromDb(
    { weight_grams: 1000, price: 50, width_cm: 10, height_cm: 5, length_cm: 15 },
    1,
  );
  assert.equal(produto.weight, 1);
});

test("weight_grams zero vira 0kg (sem NaN/Infinity)", () => {
  const produto = produtoFromDb(
    { weight_grams: 0, price: 10, width_cm: 5, height_cm: 5, length_cm: 5 },
    1,
  );
  assert.equal(produto.weight, 0);
});

const AGORA = 1_800_000_000_000;
const FUTURO = new Date(AGORA + 60 * 60 * 1000).toISOString();
const PASSADO = new Date(AGORA - 60 * 1000).toISOString();
const OPCOES_EXEMPLO = [
  {
    servicoId: 1,
    transportadora: "Correios",
    servico: "PAC",
    precoCentavos: 2500,
    prazoDias: 7,
    precoExibidoCentavos: 2500,
  },
  {
    servicoId: 2,
    transportadora: "Correios",
    servico: "SEDEX",
    precoCentavos: 4200,
    prazoDias: 3,
    precoExibidoCentavos: 0,
  },
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

const COMPRA_INPUT: MelhorEnvioCompraInput = {
  serviceId: 17,
  from: {
    name: "Fragranciaria",
    phone: "16999999999",
    email: "contato@fragranciaria.com",
    document: "12345678901",
    address: "Rua Origem",
    number: "10",
    district: "Centro",
    city: "Ribeirão Preto",
    state_abbr: "SP",
    postal_code: "14000000",
  },
  to: {
    name: "Cliente Teste",
    phone: "11999999999",
    email: "cliente@teste.com",
    document: "12345678901",
    address: "Rua Destino",
    number: "100",
    district: "Bairro",
    city: "São Paulo",
    state_abbr: "SP",
    postal_code: "01310100",
  },
  products: [
    { id: "produto-1", name: "Produto", quantity: 1, unitary_value: 99.9 },
  ],
  volumes: [{ height: 5, width: 10, length: 15, weight: 0.25 }],
};

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  process.env.MELHOR_ENVIO_SANDBOX_URL = "https://sandbox.melhorenvio.com.br";
  process.env.MELHOR_ENVIO_SANDBOX_TOKEN = "sandbox-token";
  process.env.MELHOR_ENVIO_USER_AGENT = "Fragranciaria <contato@fragranciaria.com>";
  globalThis.fetch = ORIGINAL_FETCH;
});

test("comprarEtiqueta retorna shipmentIdExternal, labelUrl e trackingCode no fluxo completo", async () => {
  const chamadas: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    chamadas.push(url);

    if (url.endsWith("/api/v2/me/cart")) {
      return new Response(JSON.stringify({ id: "ship-123" }), { status: 200 });
    }
    if (url.endsWith("/api/v2/me/shipment/checkout")) {
      return new Response(JSON.stringify({ purchase: { status: "paid" } }), { status: 200 });
    }
    if (url.endsWith("/api/v2/me/shipment/generate")) {
      return new Response(
        JSON.stringify({ "ship-123": { status: true, message: "Envio gerado com sucesso" } }),
        { status: 200 },
      );
    }
    if (url.endsWith("/api/v2/me/shipment/preview")) {
      return new Response(JSON.stringify({ url: "https://sandbox.melhorenvio.com.br/label/ship-123" }), {
        status: 200,
      });
    }
    if (url.endsWith("/api/v2/me/cart/ship-123")) {
      return new Response(JSON.stringify({ tracking: "ME123BR" }), { status: 200 });
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await comprarEtiqueta(COMPRA_INPUT);

  assert.deepEqual(resultado, {
    ok: true,
    shipmentIdExternal: "ship-123",
    labelUrl: "https://sandbox.melhorenvio.com.br/label/ship-123",
    trackingCode: "ME123BR",
  });
  assert.deepEqual(chamadas, [
    "https://sandbox.melhorenvio.com.br/api/v2/me/cart",
    "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/checkout",
    "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/generate",
    "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/preview",
    "https://sandbox.melhorenvio.com.br/api/v2/me/cart/ship-123",
  ]);
});

test("comprarEtiqueta aborta no checkout e não segue para generate/preview", async () => {
  const chamadas: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    chamadas.push(url);

    if (url.endsWith("/api/v2/me/cart")) {
      return new Response(JSON.stringify({ id: "ship-123" }), { status: 200 });
    }
    if (url.endsWith("/api/v2/me/shipment/checkout")) {
      return new Response(JSON.stringify({ message: "saldo insuficiente" }), { status: 422 });
    }

    throw new Error(`Não deveria chegar aqui: ${url}`);
  }) as typeof fetch;

  const resultado = await comprarEtiqueta(COMPRA_INPUT);

  assert.equal(resultado.ok, false);
  assert.match(resultado.erro, /422/);
  assert.deepEqual(chamadas, [
    "https://sandbox.melhorenvio.com.br/api/v2/me/cart",
    "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/checkout",
  ]);
});

test("comprarEtiqueta falha se preview não retornar labelUrl", async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.endsWith("/api/v2/me/cart")) {
      return new Response(JSON.stringify({ id: "ship-123" }), { status: 200 });
    }
    if (url.endsWith("/api/v2/me/shipment/checkout")) {
      return new Response(JSON.stringify({ purchase: { status: "paid" } }), { status: 200 });
    }
    if (url.endsWith("/api/v2/me/shipment/generate")) {
      return new Response(
        JSON.stringify({ "ship-123": { status: true, message: "Envio gerado com sucesso" } }),
        { status: 200 },
      );
    }
    if (url.endsWith("/api/v2/me/shipment/preview")) {
      return new Response(JSON.stringify({ url: null }), { status: 200 });
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await comprarEtiqueta(COMPRA_INPUT);

  assert.deepEqual(resultado, {
    ok: false,
    erro: "Melhor Envio sandbox nao retornou URL da etiqueta.",
  });
});

test("comprarEtiqueta aceita tracking null como sucesso válido", async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.endsWith("/api/v2/me/cart")) {
      return new Response(JSON.stringify({ id: "ship-123" }), { status: 200 });
    }
    if (url.endsWith("/api/v2/me/shipment/checkout")) {
      return new Response(JSON.stringify({ purchase: { status: "paid" } }), { status: 200 });
    }
    if (url.endsWith("/api/v2/me/shipment/generate")) {
      return new Response(
        JSON.stringify({ "ship-123": { status: true, message: "Envio gerado com sucesso" } }),
        { status: 200 },
      );
    }
    if (url.endsWith("/api/v2/me/shipment/preview")) {
      return new Response(JSON.stringify({ url: "https://sandbox.melhorenvio.com.br/label/ship-123" }), {
        status: 200,
      });
    }
    if (url.endsWith("/api/v2/me/cart/ship-123")) {
      return new Response(JSON.stringify({ tracking: null }), { status: 200 });
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await comprarEtiqueta(COMPRA_INPUT);

  assert.deepEqual(resultado, {
    ok: true,
    shipmentIdExternal: "ship-123",
    labelUrl: "https://sandbox.melhorenvio.com.br/label/ship-123",
    trackingCode: null,
  });
});
