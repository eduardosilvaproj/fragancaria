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

// `options` do POST /me/cart — "informacoes complementares do envio".
//
// insurance_value e campo do ENVIO (nivel do pedido) e NAO existe por produto:
// a API espera o total declarado do conteudo. Ausente, ela responde 422 "O
// valor segurado deve ser o mesmo da nota fiscal (se houver) e superior ou
// igual a R$ 1,00" (confirmado em producao no pedido 876F3D56, 2026-07-28).
//
// `invoice` (chave + XML da NF-e) fica FORA de proposito: nao emitimos NF-e
// neste fluxo — nenhum pedido tem nfe_key — e a doc manda omitir o campo em
// envio nao comercial. Adicionar sem nota real trocaria um 422 por outro.
export type MelhorEnvioCompraOptions = {
  /** Total segurado do envio, em REAIS. Minimo R$ 1,00. */
  insurance_value: number;
  receipt?: boolean;
  own_hand?: boolean;
  reverse?: boolean;
  platform?: string;
  reminder?: string;
};

// `options` e obrigatorio de proposito: era opcional (`options?:
// Record<string, unknown>`), e por isso a compra mandava `{}` desde que o
// modulo nasceu (2026-07-18) sem o compilador reclamar. Exigir o campo faz
// qualquer chamador novo ter de decidir o insurance_value.
export type MelhorEnvioCompraInput = {
  serviceId: number;
  agencyId?: number | null;
  from: MelhorEnvioContato;
  to: MelhorEnvioContato;
  products: MelhorEnvioCartProduct[];
  volumes: MelhorEnvioVolume[];
  options: MelhorEnvioCompraOptions;
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

export type BuscarPdfEtiquetaResult =
  | { ok: true; pdf: Uint8Array }
  | { ok: false; erro: string };

export type BuscarZplEtiquetaResult =
  | { ok: true; zpl: string }
  | { ok: false; erro: string };

export type ImprimirEtiquetasResult =
  | { ok: true; url: string }
  | { ok: false; erro: string };

// Fallback para produtos sem peso/dimensão cadastrados. 774 de 1000 produtos
// ativos estão nessa situação (2026-07-31). Enviar 0 para a API do Melhor
// Envio faz a cotação usar mínimos internos por item, o que num carrinho de
// vários itens subcota o frete em 20-45% em relação ao peso real somado.
// Deliberadamente acima da média para errar para cima: melhor cobrar um frete
// um pouco maior do que pagar a diferença do próprio bolso em cada venda.
export const MELHOR_ENVIO_FALLBACK_DIMENSIONS = {
  weightGrams: 250,
  widthCm: 20,
  heightCm: 15,
  lengthCm: 10,
};

// Converte produto do formato do banco para o formato da Melhor Envio.
// weight_grams → kg, dimensões em cm, insurance_value em reais.
// Produtos sem peso/dimensão cadastrados recebem fallback acima da média para
// evitar subcotar o frete (ver MELHOR_ENVIO_FALLBACK_DIMENSIONS).
// Loga no console.warn quando o fallback é usado, para permitir medir quantas
// cotações estão sendo estimadas.
export function produtoParaMelhorEnvio(
  p: {
    id?: string;
    weight_grams: number | null;
    price: number;
    width_cm: number | null;
    height_cm: number | null;
    length_cm: number | null;
  },
  quantity: number,
): MelhorEnvioProduto {
  const productId = p.id ?? "produto-consulta";
  function resolve(campo: string, valor: number | null | undefined, fallback: number): number {
    const num = Number(valor ?? 0);
    if (!num) {
      // eslint-disable-next-line no-console
      console.warn(`[cotacao-frete] fallback usado: produto=${productId} campo=${campo} valor=${valor}`);
      return fallback;
    }
    return num;
  }
  return {
    id: productId,
    weight:
      resolve("weight_grams", p.weight_grams, MELHOR_ENVIO_FALLBACK_DIMENSIONS.weightGrams) / 1000,
    width: resolve("width_cm", p.width_cm, MELHOR_ENVIO_FALLBACK_DIMENSIONS.widthCm),
    height: resolve("height_cm", p.height_cm, MELHOR_ENVIO_FALLBACK_DIMENSIONS.heightCm),
    length: resolve("length_cm", p.length_cm, MELHOR_ENVIO_FALLBACK_DIMENSIONS.lengthCm),
    insurance_value: Number(p.price),
    quantity,
  };
}

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

type MelhorEnvioPerOrderFailure = { status?: boolean; message?: string };
type MelhorEnvioGenerateResponse =
  | Record<string, MelhorEnvioPerOrderFailure>
  | MelhorEnvioPerOrderFailure;

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
  if (!response || Array.isArray(response)) return null;

  const perOrder = (response as Record<string, unknown>)[shipmentIdExternal];
  if (perOrder && typeof perOrder === "object" && "status" in perOrder) {
    const typed = perOrder as MelhorEnvioPerOrderFailure;
    if (typed.status === false) {
      return typed.message || "Melhor Envio sandbox falhou ao gerar etiqueta.";
    }
    return null;
  }

  if ("status" in response && response.status === false) {
    const msg = (response as { message?: unknown }).message;
    return typeof msg === "string"
      ? msg
      : "Melhor Envio sandbox falhou ao gerar etiqueta.";
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
        options: input.options,
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

/**
 * Devolve a URL da pagina de impressao do Melhor Envio para uma ou mais
 * etiquetas ja compradas. Nao compra, nao gera: e leitura, nao debita saldo.
 *
 * POR QUE ESTE CAMINHO E NAO buscarPdfEtiqueta():
 * medido em 2026-07-28, a MESMA etiqueta sai em dois formatos diferentes
 * dependendo do endpoint:
 *   - POST /me/shipment/print -> {"url": ".../imprimir/<token>"}, e essa pagina
 *     RESPEITA as preferencias da conta. Com "Tamanho cartao postal" + so
 *     "Imprimir etiquetas" marcados, sai 10x15 sem comprovante e sem
 *     declaracao de conteudo — pronto para Ctrl+P na Zebra.
 *   - GET /me/imprimir/pdf/{id} -> SEMPRE A4 (203.7x286.8mm), ignora as
 *     preferencias da conta e todo parametro de query.
 * Nao e cache: com as preferencias salvas, o /imprimir/pdf continuou devolvendo
 * arquivo byte-identico enquanto a pagina do token ja saia em cartao postal.
 *
 * O formato vem da CONTA, nao do corpo da requisicao: `mode` e campo validado
 * com enum, mas "postcard" responde 422 (so "private" foi aceito). Por isso o
 * corpo manda apenas `orders`.
 *
 * A URL retornada e publica por token — quem tiver o link imprime a etiqueta
 * sem login. Ela vai para o navegador do admin porque nao ha alternativa: a
 * pagina renderiza via JS e manda `frame-ancestors` no CSP, entao nao da para
 * embutir em iframe nem servir por proxy. Por isso esta funcao exige admin em
 * quem chama e a URL nunca e persistida.
 *
 * Nao lanca — devolve resultado estruturado, igual ao resto do modulo.
 */
export async function imprimirEtiquetas(
  shipmentIdsExternal: string[],
): Promise<ImprimirEtiquetasResult> {
  const ids = shipmentIdsExternal.filter((id) => typeof id === "string" && id.trim().length > 0);
  if (ids.length === 0) {
    return { ok: false, erro: "Nenhum envio com etiqueta comprada no Melhor Envio." };
  }

  try {
    const resposta = await melhorEnvioRequest<unknown>("/api/v2/me/shipment/print", {
      method: "POST",
      body: JSON.stringify({ orders: ids }),
    });

    const url =
      typeof (resposta as { url?: unknown })?.url === "string"
        ? (resposta as { url: string }).url
        : null;

    if (!url) {
      return { ok: false, erro: "Melhor Envio nao retornou a URL de impressao." };
    }

    return { ok: true, url };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro desconhecido ao abrir impressao das etiquetas.",
    };
  }
}

/**
 * Baixa o PDF de UMA etiqueta ja comprada. Nao compra, nao gera: e leitura, nao
 * debita saldo.
 *
 * Este e o caminho A4: serve para juntar varias etiquetas num PDF unico e
 * imprimir lote em papel comum. Para 10x15 na Zebra, use imprimirEtiquetas().
 *
 * Sao dois passos, confirmados por chamada real em 2026-07-28:
 *   1. GET /api/v2/me/imprimir/pdf/{id} -> ["<url pre-assinada do S3>"]
 *      (array de uma posicao, NAO um objeto com .url; o {id} e o
 *      shipment_id_external que gravamos em shipping_quotes)
 *   2. GET nessa url -> application/pdf, ~80 KB, 1 pagina
 *
 * A url do S3 vem assinada e expira em 1800s, e quem tiver o link baixa a
 * etiqueta sem autenticacao nenhuma. Por isso ela NUNCA vai para o navegador:
 * o download acontece aqui e o admin recebe so os bytes, pelo nosso dominio.
 *
 * Nao lanca — devolve resultado estruturado, igual ao resto do modulo.
 */
export async function buscarPdfEtiqueta(
  shipmentIdExternal: string,
): Promise<BuscarPdfEtiquetaResult> {
  if (!shipmentIdExternal) {
    return { ok: false, erro: "Envio sem id externo do Melhor Envio." };
  }

  try {
    const urls = await melhorEnvioRequest<unknown>(
      `/api/v2/me/imprimir/pdf/${encodeURIComponent(shipmentIdExternal)}`,
      { method: "GET" },
    );

    // A rota devolve array de urls. Aceita objeto com .url tambem, por
    // seguranca: se a API mudar de forma, isso degrada em erro claro em vez
    // de TypeError.
    const url = Array.isArray(urls)
      ? urls.find((item): item is string => typeof item === "string" && item.length > 0)
      : typeof (urls as { url?: unknown })?.url === "string"
        ? ((urls as { url: string }).url)
        : undefined;

    if (!url) {
      return { ok: false, erro: "Melhor Envio nao retornou URL do PDF da etiqueta." };
    }

    // Sem Authorization de proposito: a url ja e pre-assinada, e mandar o
    // Bearer para o S3 pode fazer a AWS recusar a assinatura.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        return {
          ok: false,
          erro: `Download do PDF da etiqueta respondeu ${response.status}.`,
        };
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length === 0) {
        return { ok: false, erro: "PDF da etiqueta veio vazio." };
      }
      return { ok: true, pdf: bytes };
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro desconhecido ao buscar PDF da etiqueta.",
    };
  }
}

/**
 * Baixa o ZPL de UMA etiqueta ja comprada. Nao compra, nao gera: e leitura, nao
 * debita saldo.
 *
 * Segue o mesmo padrao de buscarPdfEtiqueta(), mas buscando do endpoint ZPL:
 * GET /api/v2/me/imprimir/zpl/{id} -> ["<url pre-assinada do S3>"] ou `{ url: "..." }`
 */
export async function buscarZplEtiqueta(
  shipmentIdExternal: string,
): Promise<BuscarZplEtiquetaResult> {
  if (!shipmentIdExternal) {
    return { ok: false, erro: "Envio sem id externo do Melhor Envio." };
  }

  try {
    const resposta = await melhorEnvioRequest<unknown>(
      `/api/v2/me/imprimir/zpl/${encodeURIComponent(shipmentIdExternal)}`,
      { method: "GET" },
    );

    const url = Array.isArray(resposta)
      ? resposta.find((item): item is string => typeof item === "string" && item.length > 0)
      : typeof (resposta as { url?: unknown })?.url === "string"
        ? ((resposta as { url: string }).url)
        : undefined;

    if (!url) {
      return { ok: false, erro: "Melhor Envio nao retornou URL do ZPL da etiqueta." };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        return {
          ok: false,
          erro: `Download do ZPL da etiqueta respondeu ${response.status}.`,
        };
      }
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        return { ok: false, erro: "ZPL da etiqueta veio vazio." };
      }
      return { ok: true, zpl: text };
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro desconhecido ao buscar ZPL da etiqueta.",
    };
  }
}

// =====================================================
// LEITURA DE RASTREIO EM LOTE
// =====================================================

export type MelhorEnvioRastreio = {
  id: string;
  protocol: string;
  status: string;
  tracking: string | null;
  melhorenvio_tracking: string | null;
  created_at: string | null;
  paid_at: string | null;
  generated_at: string | null;
  posted_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
  expired_at: string | null;
};

export type ConsultarRastreioEmLoteResult =
  | { ok: true; rastreios: Record<string, MelhorEnvioRastreio> }
  | { ok: false; erro: string };

/**
 * Consulta rastreio em lote (leitura) para uma lista de shipment_id_external.
 * Faz uma unica chamada POST /api/v2/me/shipment/tracking; a API aceita varios
 * ids e devolve um objeto mapeando cada id ao seu status. Nunca debita saldo.
 *
 * Nunca lanca excecao: devolve { ok: false, erro } no mesmo padrao de cotar().
 */
export async function consultarRastreioEmLote(
  shipmentIdsExternal: string[],
): Promise<ConsultarRastreioEmLoteResult> {
  const ids = shipmentIdsExternal.filter(
    (id) => typeof id === "string" && id.trim().length > 0,
  );
  if (ids.length === 0) {
    return { ok: false, erro: "Nenhum id de envio informado para rastreamento." };
  }

  try {
    const resposta = await melhorEnvioRequest<Record<string, unknown>>(
      "/api/v2/me/shipment/tracking",
      {
        method: "POST",
        body: JSON.stringify({ orders: ids }),
      },
    );

    // A API devolve um objeto onde cada chave e um shipment_id_external.
    // Valores de status observados: "delivered", "canceled", "posted",
    // "in_transit", "out_for_delivery", "expired".
    const rastreios: Record<string, MelhorEnvioRastreio> = {};
    for (const [id, raw] of Object.entries(resposta || {})) {
      const r = raw as Record<string, unknown>;
      rastreios[id] = {
        id: String(r.id ?? id),
        protocol: String(r.protocol ?? ""),
        status: String(r.status ?? ""),
        tracking: typeof r.tracking === "string" ? r.tracking : null,
        melhorenvio_tracking:
          typeof r.melhorenvio_tracking === "string" ? r.melhorenvio_tracking : null,
        created_at: typeof r.created_at === "string" ? r.created_at : null,
        paid_at: typeof r.paid_at === "string" ? r.paid_at : null,
        generated_at: typeof r.generated_at === "string" ? r.generated_at : null,
        posted_at: typeof r.posted_at === "string" ? r.posted_at : null,
        delivered_at: typeof r.delivered_at === "string" ? r.delivered_at : null,
        canceled_at: typeof r.canceled_at === "string" ? r.canceled_at : null,
        expired_at: typeof r.expired_at === "string" ? r.expired_at : null,
      };
    }

    return { ok: true, rastreios };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro desconhecido ao consultar rastreamento do Melhor Envio.",
    };
  }
}
