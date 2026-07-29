// Merge de PDFs de etiqueta + politica de falha parcial.
//
// POR QUE MESCLAR DO NOSSO LADO:
// A API do Melhor Envio nao entrega um PDF unico de varias etiquetas. Confirmado
// por chamada real em 2026-07-28:
//   - POST /me/shipment/print aceita array em `orders`, mas devolve
//     {"url": "https://melhorenvio.com.br/imprimir/<hash>"} — pagina HTML do
//     site deles, com CSP frame-ancestors (nao embutivel) e sem link de PDF.
//   - GET /me/imprimir/pdf/{id} devolve ["<url pre-assinada do S3>"], UMA
//     etiqueta por chamada (o id vai no path; o arquivo no S3 e
//     "<id>-1.pdf", numerado por envio). O hash do lote da 404 nessa rota.
// Logo, N pedidos = N PDFs de 1 pagina. Sem merge, sao N dialogos de impressao.
//
// Este modulo nao faz rede nem toca banco: recebe bytes ja baixados e devolve o
// PDF mesclado MAIS a lista do que ficou de fora. Quem chama e obrigado a
// carregar as duas coisas — ver MergeLabelsResult.

/** Identificacao de uma etiqueta, do jeito que o admin a reconhece na tela. */
export type LabelPdfSource = {
  /** id da linha em shipping_quotes. */
  shipmentId: string;
  /** shipment_id_external — o id do envio no Melhor Envio. */
  externalId: string | null;
  /** Rotulo humano para a mensagem de erro: "#1234" ou prefixo do pedido. */
  label: string;
};

export type LabelFetchResult =
  | { ok: true; source: LabelPdfSource; pdf: Uint8Array }
  | { ok: false; source: LabelPdfSource; erro: string };

export type LabelFailure = { source: LabelPdfSource; erro: string };

export type MergeLabelsResult = {
  /** PDF mesclado. null quando NENHUMA etiqueta pode ser incluida. */
  pdf: Uint8Array | null;
  pageCount: number;
  /** Etiquetas que entraram no PDF, na ordem em que aparecem. */
  included: LabelPdfSource[];
  /**
   * Etiquetas que NAO entraram. Nunca vazio por acidente: se uma etiqueta
   * falhou, ela esta aqui. Quem chama tem de mostrar isso — um PDF com 7 de 10
   * etiquetas, entregue em silencio, faz o operador despachar 10 pedidos
   * achando que imprimiu todos.
   */
  failed: LabelFailure[];
};

/** Assinatura de arquivo PDF: os bytes comecam com "%PDF". */
export function isPdfBytes(bytes: Uint8Array | null | undefined): boolean {
  if (!bytes || bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

/**
 * Mescla os PDFs que vieram OK e reporta os que falharam.
 *
 * Um PDF corrompido nao derruba o lote: ele cai em `failed` com o motivo, e as
 * outras etiquetas seguem. A ordem de `included` acompanha a ordem de entrada,
 * para o operador conferir a pilha impressa contra a lista da tela.
 */
export async function mergeLabelPdfs(
  results: LabelFetchResult[],
): Promise<MergeLabelsResult> {
  const included: LabelPdfSource[] = [];
  const failed: LabelFailure[] = [];

  for (const result of results) {
    if (!result.ok) {
      failed.push({ source: result.source, erro: result.erro });
    } else if (!isPdfBytes(result.pdf)) {
      failed.push({ source: result.source, erro: "Arquivo recebido não é um PDF válido." });
    }
  }

  const usable = results.filter(
    (result): result is Extract<LabelFetchResult, { ok: true }> =>
      result.ok && isPdfBytes(result.pdf),
  );

  if (usable.length === 0) {
    return { pdf: null, pageCount: 0, included: [], failed };
  }

  // Dinamico: pdf-lib pesa e so e necessario quando alguem imprime.
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();

  for (const result of usable) {
    try {
      const source = await PDFDocument.load(result.pdf);
      const pages = await merged.copyPages(source, source.getPageIndices());
      for (const page of pages) merged.addPage(page);
      included.push(result.source);
    } catch (e) {
      // PDF ilegivel pelo pdf-lib: reporta e segue com os demais.
      failed.push({
        source: result.source,
        erro: `Falha ao ler o PDF da etiqueta: ${e instanceof Error ? e.message : "erro desconhecido"}`,
      });
    }
  }

  if (included.length === 0) {
    return { pdf: null, pageCount: 0, included: [], failed };
  }

  const bytes = await merged.save();
  return {
    pdf: bytes,
    pageCount: merged.getPageCount(),
    included,
    failed,
  };
}

/**
 * Frase unica de aviso para a tela. Fica aqui, e nao no componente, para o
 * texto ser testavel e igual em todo lugar que imprime.
 */
export function describePartialFailure(result: {
  included: LabelPdfSource[];
  failed: LabelFailure[];
}): string | null {
  if (result.failed.length === 0) return null;

  const total = result.included.length + result.failed.length;
  const nomes = result.failed.map((f) => f.source.label).join(", ");

  if (result.included.length === 0) {
    return `Nenhuma etiqueta pôde ser impressa (${result.failed.length} de ${total} falharam): ${nomes}`;
  }

  return (
    `ATENÇÃO: o PDF tem ${result.included.length} de ${total} etiquetas. ` +
    `NÃO despache estes ${result.failed.length} pedido(s), a etiqueta não saiu: ${nomes}`
  );
}
