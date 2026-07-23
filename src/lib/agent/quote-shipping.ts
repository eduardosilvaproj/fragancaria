// Ferramenta de cotação de frete para a consultora Fran.
// Usa o cliente Melhor Envio (produção) para consultar opções de frete.
// NÃO persiste nada — é só consulta. O checkout recota.
// Mesmo padrão de product-search.ts: sem dependência de @tanstack/react-start.

import type { MelhorEnvioProduto, CotarResult } from "../melhor-envio-client.server";

export type AgentShippingQuote = {
  servicoId: number;
  transportadora: string;
  servico: string;
  precoReais: number;
  prazoDias: number;
};

export type AgentShippingResult =
  | { ok: true; opcoes: AgentShippingQuote[] }
  | { ok: false; erro: string };

// Converte produto do formato do banco para o formato da Melhor Envio.
// weight_grams → kg, dimensões em cm, insurance_value em reais.
export function produtoParaMelhorEnvio(
  p: { weight_grams: number; price: number; width_cm: number; height_cm: number; length_cm: number },
  quantity: number,
): MelhorEnvioProduto {
  return {
    id: "produto-consulta",
    weight: Number(p.weight_grams) / 1000,
    width: Number(p.width_cm),
    height: Number(p.height_cm),
    length: Number(p.length_cm),
    insurance_value: Number(p.price),
    quantity,
  };
}

// Busca produtos do catálogo pelo Supabase para montar o payload de cotação.
// Retorna array vazio se nenhum produto for encontrado.
export async function buscarProdutosParaCotacao(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  productIds: Array<{ id: string; quantity: number }>,
): Promise<MelhorEnvioProduto[]> {
  if (productIds.length === 0) return [];

  const cleanIds = [...new Set(productIds.map((p) => p.id.split("::")[0]))];
  const { data, error } = await db
    .from("products")
    .select("id, weight_grams, price, width_cm, height_cm, length_cm")
    .in("id", cleanIds)
    .eq("is_active", true);

  if (error || !Array.isArray(data)) return [];

  const map = new Map(data.map((r: Record<string, unknown>) => [r.id, r]));
  return productIds
    .map((p) => {
      const row = map.get(p.id);
      if (!row) return null;
      return produtoParaMelhorEnvio(
        row as { weight_grams: number; price: number; width_cm: number; height_cm: number; length_cm: number },
        p.quantity,
      );
    })
    .filter((p): p is MelhorEnvioProduto => p !== null);
}

// Cotação de frete: CEP de destino + lista de {id, quantity}.
// Usa o cliente Melhor Envio (produção). NÃO persiste.
// Retorna erro amigável se o CEP for inválido ou sem cobertura.
export async function quoteShipping(
  toCep: string,
  produtos: MelhorEnvioProduto[],
): Promise<AgentShippingResult> {
  // Sanitiza CEP: remove tudo que não for dígito (LLM pode mandar com máscara)
  const cepLimpo = toCep.replace(/\D/g, "");

  if (produtos.length === 0) {
    return { ok: false, erro: "Nenhum produto encontrado no catálogo para cotar frete." };
  }

  // Import dinâmico para evitar dependência server-only no bundle do cliente.
  const { cotar } = await import("../melhor-envio-client.server");
  const result: CotarResult = await cotar(cepLimpo, produtos);

  if (!result.ok) {
    const erros: Record<string, string> = {
      cep_invalido: "CEP inválido. Verifique o CEP de destino.",
      sem_cobertura: "Não há opções de frete para este CEP.",
      api_indisponivel: "Sistema de frete temporariamente indisponível. Tente novamente.",
    };
    return { ok: false, erro: erros[result.erro] ?? "Erro ao consultar frete." };
  }

  return {
    ok: true,
    opcoes: result.opcoes.map((o) => ({
      servicoId: o.servicoId,
      transportadora: o.transportadora,
      servico: o.servico,
      precoReais: o.precoCentavos / 100,
      prazoDias: o.prazoDias,
    })),
  };
}
