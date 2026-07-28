// Cliente para a API do Melhor Envio.
// - Cotação do checkout e compra/geração de etiqueta usam AMBAS as
//   credenciais/URL de PRODUÇÃO (MELHOR_ENVIO_BASE_URL/TOKEN).
// - A compra apontava para sandbox por segurança enquanto a conta de produção
//   não tinha saldo. Passou para produção em 2026-07-27, quando passou a ter.
//   Consequência: comprarEtiqueta() DEBITA SALDO REAL a cada chamada.
// - Manter cotação e compra no MESMO ambiente é requisito, não detalhe: o
//   servicoId vem da cotação, e id de um ambiente não existe no outro (sandbox
//   só tem 1-4), o que quebrava a compra com 422.
// Nenhuma exception pode vazar de cotar() ou comprarEtiqueta() — quem chama recebe
// um resultado estruturado e decide o que fazer.

export type MelhorEnvioProduto = {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number; // KG — quem chama ja converteu de gramas
  insurance_value: number;
  quantity: number;
};

export type MelhorEnvioOpcao = {
  servicoId: number;
  transportadora: string;
  servico: string;
  precoCentavos: number;
  prazoDias: number;
};

export type CotarResult =
  | { ok: true; opcoes: MelhorEnvioOpcao[] }
  | { ok: false; erro: "cep_invalido" | "sem_cobertura" | "api_indisponivel" };

export type MelhorEnvioContato = {
  name: string;
  phone: string;
  email: string;
  document?: string;
  company_document?: string;
  state_register?: string;
  address: string;
  complement?: string;
  number: string;
  district: string;
  city: string;
  state_abbr: string;
  postal_code: string;
  country_id?: string;
  note?: string;
};

export type MelhorEnvioCartProduct = {
  id: string;
  name: string;
  quantity: number;
  unitary_value: number;
};

export type MelhorEnvioVolume = {
  height: number;
  width: number;
  length: number;
  weight: number;
};

export type MelhorEnvioCompraInput = {
  serviceId: number;
  agencyId?: number | null;
  from: MelhorEnvioContato;
  to: MelhorEnvioContato;
  products: MelhorEnvioCartProduct[];
  volumes: MelhorEnvioVolume[];
  options?: Record<string, unknown>;
};

export type MelhorEnvioCompraResult =
  | {
      ok: true;
      shipmentIdExternal: string;
      labelUrl: string;
      trackingCode: string | null;
    }
  | { ok: false; erro: string };

export type ResolverPrecoCotacaoResult =
  | { ok: true; precoReais: number }
  | { ok: false; erro: "nao_encontrada" | "expirada" | "opcao_invalida" };

// Le uma linha ja gravada de shipping_rate_quotes.options (jsonb) e resolve o
// preco em REAIS da opcao escolhida. options grava precoExibidoCentavos (o
// preco JA com a regra de frete gratis aplicada), por isso divide por 100 aqui
// — o resto do fluxo de pagamento trabalha em reais.
export function resolverPrecoCotacao(
  quote: { expires_at: string; options: unknown } | null | undefined,
  servicoId: number,
  agora: number = Date.now(),
): ResolverPrecoCotacaoResult {
  if (!quote) return { ok: false, erro: "nao_encontrada" };
  if (new Date(quote.expires_at).getTime() <= agora) return { ok: false, erro: "expirada" };
  const opcoes = (quote.options ?? []) as Array<{ servicoId: number; precoExibidoCentavos: number }>;
  const opcao = opcoes.find((o) => o.servicoId === servicoId);
  if (!opcao) return { ok: false, erro: "opcao_invalida" };
  return { ok: true, precoReais: opcao.precoExibidoCentavos / 100 };
}

async function melhorEnvioRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.MELHOR_ENVIO_BASE_URL;
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const userAgent = process.env.MELHOR_ENVIO_USER_AGENT;

  if (!baseUrl || !token || !userAgent) {
    throw new Error("Melhor Envio nao configurado (MELHOR_ENVIO_BASE_URL/TOKEN/USER_AGENT)");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        // Accept explicito: sem ele a API pode responder erro em HTML e o
        // response.json() abaixo estoura com SyntaxError em vez do status
        // real. O caminho de compra sempre mandou este header (vinha da
        // funcao de sandbox removida em 2026-07-27); mantido para nao
        // regredir agora que a compra roda aqui.
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": userAgent,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const error = new Error(`API Melhor Envio respondeu ${response.status}: ${errorBody}`.trim());
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

type MelhorEnvioCalculateResponseItem = {
  id?: number;
  name?: string;
  price?: string | number;
  delivery_time?: number;
  company?: { name?: string };
  error?: string;
};

type MelhorEnvioCartResponse = {
  id?: string | number;
};

type MelhorEnvioCheckoutResponse = {
  purchase?: {
    status?: string;
  };
};

type MelhorEnvioGenerateResponse =
  | Record<string, { status?: boolean; message?: string }>
  | { status?: boolean; message?: string };

type MelhorEnvioPreviewResponse = {
  url?: string | null;
};

type MelhorEnvioOrderResponse = {
  tracking?: string | null;
};

function extractGenerateFailure(
  response: MelhorEnvioGenerateResponse,
  shipmentIdExternal: string,
): string | null {
  if (response && !Array.isArray(response) && shipmentIdExternal in response) {
    const perOrder = response[shipmentIdExternal];
    if (perOrder && perOrder.status === false) {
      return perOrder.message || "Melhor Envio sandbox falhou ao gerar etiqueta.";
    }
    return null;
  }

  if (response && !Array.isArray(response) && "status" in response && response.status === false) {
    return response.message || "Melhor Envio sandbox falhou ao gerar etiqueta.";
  }

  return null;
}

export async function cotar(
  toCep: string,
  produtos: MelhorEnvioProduto[],
): Promise<CotarResult> {
  const fromCep = process.env.MELHOR_ENVIO_FROM_CEP;
  if (!fromCep) {
    return { ok: false, erro: "api_indisponivel" };
  }

  try {
    const body = {
      from: { postal_code: fromCep },
      to: { postal_code: toCep },
      products: produtos,
    };

    const result = await melhorEnvioRequest<MelhorEnvioCalculateResponseItem[]>(
      "/api/v2/me/shipment/calculate",
      { method: "POST", body: JSON.stringify(body) },
    );

    if (!Array.isArray(result) || result.length === 0) {
      return { ok: false, erro: "sem_cobertura" };
    }

    const opcoes: MelhorEnvioOpcao[] = result
      .filter((item) => !item.error && item.id != null && item.price != null)
      .map((item) => ({
        servicoId: item.id!,
        transportadora: item.company?.name ?? "",
        servico: item.name ?? "",
        precoCentavos: Math.round(Number(item.price) * 100),
        prazoDias: item.delivery_time ?? 0,
      }));

    if (opcoes.length === 0) {
      return { ok: false, erro: "sem_cobertura" };
    }

    return { ok: true, opcoes };
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 400 || status === 422) {
      return { ok: false, erro: "cep_invalido" };
    }
    return { ok: false, erro: "api_indisponivel" };
  }
}

export async function comprarEtiqueta(
  input: MelhorEnvioCompraInput,
): Promise<MelhorEnvioCompraResult> {
  try {
    const cart = await melhorEnvioRequest<MelhorEnvioCartResponse>("/api/v2/me/cart", {
      method: "POST",
      body: JSON.stringify({
        service: input.serviceId,
        ...(input.agencyId ? { agency: input.agencyId } : {}),
        from: input.from,
        to: input.to,
        products: input.products,
        volumes: input.volumes,
        options: input.options ?? {},
      }),
    });

    const shipmentIdExternal = cart.id != null ? String(cart.id) : "";
    if (!shipmentIdExternal) {
      return { ok: false, erro: "Melhor Envio nao retornou id da etiqueta." };
    }

    // Primeiro passo que DEBITA SALDO REAL. A idempotencia que impede a
    // segunda compra do mesmo pedido roda antes daqui, em
    // prepareGenerateOrderLabelPurchase (generate-order-label-core.ts).
    const checkout = await melhorEnvioRequest<MelhorEnvioCheckoutResponse>(
      "/api/v2/me/shipment/checkout",
      {
        method: "POST",
        body: JSON.stringify({ orders: [shipmentIdExternal] }),
      },
    );
    if (checkout.purchase?.status && checkout.purchase.status !== "paid") {
      return { ok: false, erro: `Checkout nao confirmou pagamento (${checkout.purchase.status}).` };
    }

    const generated = await melhorEnvioRequest<MelhorEnvioGenerateResponse>(
      "/api/v2/me/shipment/generate",
      {
        method: "POST",
        body: JSON.stringify({ orders: [shipmentIdExternal] }),
      },
    );
    const generateFailure = extractGenerateFailure(generated, shipmentIdExternal);
    if (generateFailure) {
      return { ok: false, erro: generateFailure };
    }

    const preview = await melhorEnvioRequest<MelhorEnvioPreviewResponse>(
      "/api/v2/me/shipment/preview",
      {
        method: "POST",
        body: JSON.stringify({ orders: [shipmentIdExternal] }),
      },
    );
    const labelUrl = typeof preview.url === "string" && preview.url ? preview.url : null;
    if (!labelUrl) {
      return { ok: false, erro: "Melhor Envio nao retornou URL da etiqueta." };
    }

    let trackingCode: string | null = null;

    try {
      const order = await melhorEnvioRequest<MelhorEnvioOrderResponse>(
        `/api/v2/me/orders/${shipmentIdExternal}`,
        { method: "GET" },
      );

      trackingCode =
        typeof order.tracking === "string" && order.tracking.trim() ? order.tracking : null;
    } catch {
      trackingCode = null;
    }

    return {
      ok: true,
      shipmentIdExternal,
      labelUrl,
      trackingCode,
    };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido no Melhor Envio." };
  }
}
