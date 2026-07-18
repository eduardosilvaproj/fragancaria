// Cliente para a API do Melhor Envio (Calculo de frete no checkout).
// Diferenca critica em relacao a correios-client.server.ts: este cliente roda no
// caminho do checkout, nao do admin. Nenhuma exception pode vazar de cotar() —
// se a API do Melhor Envio cair ou responder algo inesperado, o checkout precisa
// seguir funcionando (com fallback do lado de quem chama), nao quebrar com 500.
//
// Compra/geracao de etiqueta NAO esta neste arquivo — apenas cotacao.

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
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
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
