// Concatenação de ZPLs de etiqueta + política de falha parcial.
//
// ZPL é sequencial: blocos ^XA...^XZ em sequência são impressos como etiquetas separadas.
// Este módulo não faz rede nem toca banco: recebe os textos ZPL já baixados e
// devolve o ZPL concatenado MAIS a lista do que ficou de fora.

export type LabelZplSource = {
  /** id da linha em shipping_quotes. */
  shipmentId: string;
  /** shipment_id_external — o id do envio no Melhor Envio. */
  externalId: string | null;
  /** Rótulo humano para a mensagem de erro: "#1234" ou prefixo do pedido. */
  label: string;
};

export type LabelZplFetchResult =
  | { ok: true; source: LabelZplSource; zpl: string }
  | { ok: false; source: LabelZplSource; erro: string };

export type LabelZplFailure = { source: LabelZplSource; erro: string };

export type MergeZplLabelsResult = {
  /** ZPL concatenado. null quando NENHUMA etiqueta pôde ser incluída. */
  zpl: string | null;
  /** Quantidade de etiquetas que entraram. */
  count: number;
  /** Etiquetas que entraram no ZPL, na ordem em que aparecem. */
  included: LabelZplSource[];
  /** Etiquetas que NÃO entraram. */
  failed: LabelZplFailure[];
};

export function isZplContent(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return trimmed.includes("^XA") && trimmed.includes("^XZ");
}

export function mergeLabelZpls(
  results: LabelZplFetchResult[],
): MergeZplLabelsResult {
  const included: LabelZplSource[] = [];
  const failed: LabelZplFailure[] = [];
  const zplBlocks: string[] = [];

  for (const result of results) {
    if (!result.ok) {
      failed.push({ source: result.source, erro: result.erro });
    } else if (!isZplContent(result.zpl)) {
      failed.push({ source: result.source, erro: "Conteúdo recebido não é um ZPL válido." });
    } else {
      included.push(result.source);
      zplBlocks.push(result.zpl.trim());
    }
  }

  if (included.length === 0) {
    return { zpl: null, count: 0, included: [], failed };
  }

  // Concatenação simples com quebra de linha entre os blocos ^XA...^XZ
  const combinedZpl = zplBlocks.join("\n\n") + "\n";

  return {
    zpl: combinedZpl,
    count: included.length,
    included,
    failed,
  };
}
