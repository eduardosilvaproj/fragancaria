#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { comprarEtiqueta } from "../src/lib/melhor-envio-client.server.ts";

const ORIGEM = {
  name: "Fragranciaria",
  phone: "16999999999",
  email: "contato@fragranciaria.com",
  document: "52998224725",
  address: "Alameda Paulista",
  number: "10",
  district: "Jardim Silvânia (Vila Xavier)",
  city: "Araraquara",
  state_abbr: "SP",
  postal_code: "14811060",
};

const DESTINO = {
  name: "Cliente Teste",
  phone: "11999999999",
  email: "cliente@teste.com",
  document: "12345678909",
  address: "Avenida Paulista",
  number: "1000",
  district: "Bela Vista",
  city: "São Paulo",
  state_abbr: "SP",
  postal_code: "01310100",
};

// Par de CEP validado contra o sandbox do Melhor Envio em 2026-07-18:
// origem 14811-060 (Araraquara/SP) -> destino 01310-100 (São Paulo/SP).
// Cotação sandbox respondeu 4 opções válidas (PAC, SEDEX, Jadlog .Package/.Com).
// O CEP 14000000 (Ribeirão Preto), usado antes, não tem cobertura sandbox no trecho.
// CPFs precisam ser válidos pelo checksum da API; este par de CPFs de teste passa.

const PRODUTOS_COTACAO = [
  {
    id: "produto-smoke-1",
    width: 10,
    height: 5,
    length: 15,
    weight: 0.25,
    insurance_value: 99.9,
    quantity: 1,
  },
];

const PRODUTOS_CARRINHO = [
  {
    id: "produto-smoke-1",
    name: "Produto Smoke",
    quantity: 1,
    unitary_value: 99.9,
  },
];

const VOLUMES = [{ height: 5, width: 10, length: 15, weight: 0.25 }];

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--serviceId" && argv[index + 1]) {
      parsed.serviceId = Number(argv[index + 1]);
      index += 1;
      continue;
    }

    if (current.startsWith("--serviceId=")) {
      parsed.serviceId = Number(current.slice("--serviceId=".length));
    }
  }

  return parsed;
}

function tryParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function sandboxRequest(path, options = {}) {
  const baseUrl = process.env.MELHOR_ENVIO_SANDBOX_URL;
  const token = process.env.MELHOR_ENVIO_SANDBOX_TOKEN;
  const userAgent = process.env.MELHOR_ENVIO_USER_AGENT;

  if (!baseUrl || !token || !userAgent) {
    throw new Error(
      "Defina MELHOR_ENVIO_SANDBOX_URL, MELHOR_ENVIO_SANDBOX_TOKEN e MELHOR_ENVIO_USER_AGENT no ambiente.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent,
        ...options.headers,
      },
    });

    const text = await response.text();
    const json = tryParseJson(text);

    if (!response.ok) {
      throw new Error(`Sandbox ${response.status} em ${path}: ${text}`.trim());
    }

    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolverServiceId(serviceIdArg) {
  if (Number.isFinite(serviceIdArg) && serviceIdArg > 0) {
    console.log(`[serviceId] usando override manual: ${serviceIdArg}`);
    return serviceIdArg;
  }

  console.log("[serviceId] cotando no sandbox para descobrir id válido...");
  const quote = await sandboxRequest("/api/v2/me/shipment/calculate", {
    method: "POST",
    body: JSON.stringify({
      from: { postal_code: ORIGEM.postal_code },
      to: { postal_code: DESTINO.postal_code },
      products: PRODUTOS_COTACAO,
    }),
  });

  if (!Array.isArray(quote) || quote.length === 0) {
    throw new Error("Sandbox não retornou opções na cotação.");
  }

  const opcoes = quote.filter((item) => !item?.error && item?.id != null);
  if (opcoes.length === 0) {
    throw new Error(`Sandbox retornou cotação sem serviceId válido: ${JSON.stringify(quote)}`);
  }

  console.log("[serviceId] opções encontradas:");
  for (const item of opcoes) {
    console.log(
      `  - id=${item.id} transportadora=${item.company?.name ?? ""} servico=${item.name ?? ""} preco=${item.price ?? ""} prazo=${item.delivery_time ?? ""}`,
    );
  }

  console.log(`[serviceId] escolhido automaticamente: ${opcoes[0].id}`);
  return Number(opcoes[0].id);
}

function installStepLogger(shipmentIdRef) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = new URL(url).pathname;
    const method = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");

    if (path.includes("/api/v2/me/")) {
      console.log(`\n[request] ${method} ${path}`);
      if (init?.body) {
        const bodyText = String(init.body);
        const bodyJson = tryParseJson(bodyText);
        console.log(`[request body] ${bodyJson ? JSON.stringify(bodyJson) : bodyText}`);
      }
    }

    const response = await originalFetch(input, init);

    if (path.includes("/api/v2/me/")) {
      const responseText = await response.clone().text();
      const responseJson = tryParseJson(responseText);
      console.log(`[response status] ${response.status}`);

      if (path.endsWith("/api/v2/me/cart")) {
        console.log(`[cart id] ${responseJson?.id ?? null}`);
      } else if (path.endsWith("/api/v2/me/shipment/checkout")) {
        console.log(`[checkout] ${JSON.stringify(responseJson)}`);
      } else if (path.endsWith("/api/v2/me/shipment/generate")) {
        console.log(`[generate] ${JSON.stringify(responseJson)}`);
      } else if (path.endsWith("/api/v2/me/shipment/preview")) {
        console.log(`[preview labelUrl] ${responseJson?.url ?? null}`);
      } else {
        const matchedId = path.match(/\/api\/v2\/me\/(?:cart|orders|shipment)\/([^/]+)$/);
        if (matchedId && shipmentIdRef?.id === matchedId[1]) {
          console.log(
            `[detail] ${JSON.stringify({
              id: responseJson?.id ?? null,
              tracking: responseJson?.tracking ?? null,
              status: responseJson?.status ?? null,
              generated_at: responseJson?.generated_at ?? null,
            })}`,
          );
        }
      }

      if (!response.ok) {
        console.log(`[response body] ${responseText}`);
      }
    }

    return response;
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}

async function sondarEndpointsTracking(shipmentIdExternal) {
  const endpoints = [
    `/api/v2/me/cart/${shipmentIdExternal}`,
    `/api/v2/me/orders/${shipmentIdExternal}`,
  ];

  console.log("\n[sondagem tracking] consultando endpoints candidatos:");
  for (const path of endpoints) {
    try {
      const json = await sandboxRequest(path, { method: "GET" });
      console.log(
        `  ${path} -> ${JSON.stringify({
          status: json?.status ?? null,
          tracking: json?.tracking ?? null,
          generated_at: json?.generated_at ?? null,
        })}`,
      );
    } catch (error) {
      console.log(`  ${path} -> erro: ${error instanceof Error ? error.message : error}`);
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  const { serviceId: serviceIdArg } = parseArgs(argv);

  if (!process.env.MELHOR_ENVIO_SANDBOX_URL || !process.env.MELHOR_ENVIO_SANDBOX_TOKEN) {
    throw new Error("Sandbox não configurado. Rode com .env carregado.");
  }

  const serviceId = await resolverServiceId(serviceIdArg);
  const shipmentIdRef = { id: null };
  const restoreFetch = installStepLogger(shipmentIdRef);

  console.log("\n[compra] iniciando comprarEtiqueta()...");
  console.log(`[compra] serviceId=${serviceId}`);

  try {
    // Captura shipmentIdExternal em tempo real via interceptor de fetch para sondar depois.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const path = new URL(url).pathname;
      if (path.endsWith("/api/v2/me/cart")) {
        const cloned = response.clone();
        const data = tryParseJson(await cloned.text());
        if (data?.id) shipmentIdRef.id = String(data.id);
      }
      return response;
    };

    const result = await comprarEtiqueta({
      serviceId,
      from: ORIGEM,
      to: DESTINO,
      products: PRODUTOS_CARRINHO,
      volumes: VOLUMES,
    });

    console.log("\n[resultado final]");
    console.log(JSON.stringify(result, null, 2));

    if (shipmentIdRef.id) {
      await sondarEndpointsTracking(shipmentIdRef.id);
    }

    if (!result.ok) {
      process.exitCode = 1;
    }
  } finally {
    restoreFetch();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("\n[erro]");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
