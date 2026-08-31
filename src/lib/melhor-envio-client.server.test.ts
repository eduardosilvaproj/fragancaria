import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { consultarRastreioEmLote } from "./melhor-envio-client.server";

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  process.env.MELHOR_ENVIO_BASE_URL = "https://melhorenvio.com.br";
  process.env.MELHOR_ENVIO_TOKEN = "prod-token";
  process.env.MELHOR_ENVIO_USER_AGENT = "Fragranciaria <contato@fragranciaria.com>";
  globalThis.fetch = ORIGINAL_FETCH;
});

test("consultarRastreioEmLote: lista vazia retorna erro", async () => {
  const resultado = await consultarRastreioEmLote([]);
  assert.equal(resultado.ok, false);
  assert.match(resultado.erro, /Nenhum id/);
});

test("consultarRastreioEmLote: ids inválidos são filtrados", async () => {
  const resultado = await consultarRastreioEmLote(["", "  ", null as unknown as string, undefined as unknown as string]);
  assert.equal(resultado.ok, false);
  assert.match(resultado.erro, /Nenhum id/);
});

test("consultarRastreioEmLote: sucesso com status delivered", async () => {
  const chamadas: string[] = [];
  globalThis.fetch = (async (input) => {
    const url = String(input);
    chamadas.push(url);

    if (url.endsWith("/api/v2/me/shipment/tracking")) {
      return new Response(
        JSON.stringify({
          "ship-1": {
            id: "ship-1",
            protocol: "ORD-123",
            status: "delivered",
            tracking: "123456789",
            melhorenvio_tracking: "ME123BR",
            created_at: "2026-01-01 10:00:00",
            paid_at: "2026-01-01 10:01:00",
            generated_at: "2026-01-01 10:02:00",
            posted_at: "2026-01-01 12:00:00",
            delivered_at: "2026-01-02 14:00:00",
            canceled_at: null,
            expired_at: null,
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await consultarRastreioEmLote(["ship-1"]);

  assert.equal(resultado.ok, true);
  assert.equal(Object.keys(resultado.rastreios).length, 1);
  assert.equal(resultado.rastreios["ship-1"].status, "delivered");
  assert.equal(resultado.rastreios["ship-1"].tracking, "123456789");
  assert.equal(resultado.rastreios["ship-1"].delivered_at, "2026-01-02 14:00:00");
  assert.deepEqual(chamadas, ["https://melhorenvio.com.br/api/v2/me/shipment/tracking"]);
});

test("consultarRastreioEmLote: sucesso com status canceled", async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.endsWith("/api/v2/me/shipment/tracking")) {
      return new Response(
        JSON.stringify({
          "ship-2": {
            id: "ship-2",
            protocol: "ORD-456",
            status: "canceled",
            tracking: null,
            melhorenvio_tracking: null,
            created_at: "2026-01-01 10:00:00",
            paid_at: "2026-01-01 10:01:00",
            generated_at: "2026-01-01 10:02:00",
            posted_at: null,
            delivered_at: null,
            canceled_at: "2026-01-02 14:00:00",
            expired_at: null,
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await consultarRastreioEmLote(["ship-2"]);

  assert.equal(resultado.ok, true);
  assert.equal(resultado.rastreios["ship-2"].status, "canceled");
  assert.equal(resultado.rastreios["ship-2"].canceled_at, "2026-01-02 14:00:00");
});

test("consultarRastreioEmLote: múltiplos ids em um lote", async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.endsWith("/api/v2/me/shipment/tracking")) {
      return new Response(
        JSON.stringify({
          "ship-1": {
            id: "ship-1",
            protocol: "ORD-123",
            status: "delivered",
            tracking: "123456789",
            melhorenvio_tracking: "ME123BR",
            created_at: "2026-01-01 10:00:00",
            paid_at: "2026-01-01 10:01:00",
            generated_at: "2026-01-01 10:02:00",
            posted_at: "2026-01-01 12:00:00",
            delivered_at: "2026-01-02 14:00:00",
            canceled_at: null,
            expired_at: null,
          },
          "ship-2": {
            id: "ship-2",
            protocol: "ORD-456",
            status: "posted",
            tracking: "987654321",
            melhorenvio_tracking: "ME456BR",
            created_at: "2026-01-03 10:00:00",
            paid_at: "2026-01-03 10:01:00",
            generated_at: "2026-01-03 10:02:00",
            posted_at: "2026-01-03 12:00:00",
            delivered_at: null,
            canceled_at: null,
            expired_at: null,
          },
        }),
        { status: 200 },
      );
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await consultarRastreioEmLote(["ship-1", "ship-2"]);

  assert.equal(resultado.ok, true);
  assert.equal(Object.keys(resultado.rastreios).length, 2);
  assert.equal(resultado.rastreios["ship-1"].status, "delivered");
  assert.equal(resultado.rastreios["ship-2"].status, "posted");
});

test("consultarRastreioEmLote: API retorna objeto vazio", async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.endsWith("/api/v2/me/shipment/tracking")) {
      return new Response(JSON.stringify({}), { status: 200 });
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await consultarRastreioEmLote(["ship-1"]);

  assert.equal(resultado.ok, true);
  assert.equal(Object.keys(resultado.rastreios).length, 0);
});

test("consultarRastreioEmLote: API retorna 401", async () => {
  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.endsWith("/api/v2/me/shipment/tracking")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    throw new Error(`URL inesperada: ${url}`);
  }) as typeof fetch;

  const resultado = await consultarRastreioEmLote(["ship-1"]);

  assert.equal(resultado.ok, false);
  assert.match(resultado.erro, /401|Unauthorized/);
});

test("consultarRastreioEmLote: API lança exceção", async () => {
  globalThis.fetch = (async () => {
    throw new Error("Network error");
  }) as typeof fetch;

  const resultado = await consultarRastreioEmLote(["ship-1"]);

  assert.equal(resultado.ok, false);
  assert.match(resultado.erro, /Network error/);
});
