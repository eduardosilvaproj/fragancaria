// Helper de navegador: busca o PDF das etiquetas no NOSSO endpoint e abre.
//
// Roda no cliente (usa window/fetch/Blob). O token do Melhor Envio e a url
// pre-assinada do S3 nunca passam por aqui — quem fala com a API e
// /api/admin/etiqueta, no servidor.

export type PrintLabelsOutcome =
  | {
      ok: true;
      /** Quantas etiquetas entraram no PDF. */
      included: number;
      /** Quantas foram pedidas. */
      total: number;
      paginas: number;
      /** Pedidos que NAO entraram no PDF. Vazio no caminho feliz. */
      falhas: Array<{ label: string; erro: string }>;
      /** Aviso ja formatado, ou null quando nada falhou. */
      aviso: string | null;
    }
  | { ok: false; erro: string; falhas: Array<{ label: string; erro: string }> };

/** base64 -> JSON. O header vem codificado porque header HTTP e ASCII. */
function decodeFalhas(header: string | null): Array<{ label: string; erro: string }> {
  if (!header) return [];
  try {
    return JSON.parse(atob(header));
  } catch {
    return [];
  }
}

/**
 * Monta o aviso de falha parcial.
 *
 * Espelha describePartialFailure() do modulo server-side de proposito: o texto
 * precisa ser identico nos dois lados, e o cliente nao pode importar o modulo
 * do servidor (ele carrega pdf-lib).
 */
export function formatAvisoFalhas(
  included: number,
  total: number,
  falhas: Array<{ label: string; erro: string }>,
): string | null {
  if (falhas.length === 0) return null;
  const nomes = falhas.map((f) => f.label).join(", ");
  if (included === 0) {
    return `Nenhuma etiqueta pôde ser impressa (${falhas.length} de ${total} falharam): ${nomes}`;
  }
  return (
    `ATENÇÃO: o PDF tem ${included} de ${total} etiquetas. ` +
    `NÃO despache estes ${falhas.length} pedido(s), a etiqueta não saiu: ${nomes}`
  );
}

/**
 * Busca o PDF de uma ou mais etiquetas e abre numa aba propria.
 *
 * Abre a aba ANTES do fetch: navegador bloqueia window.open disparado depois de
 * await (perde o gesto do usuario). A aba fica com um "carregando" e recebe o
 * blob quando o PDF chega.
 *
 * Devolve o resultado para quem chama mostrar o aviso — nao dispara toast aqui,
 * porque o aviso de falha parcial precisa ser persistente na tela, nao um toast
 * que desaparece.
 */
export async function printShippingLabels(
  shipmentIds: string[],
): Promise<PrintLabelsOutcome> {
  if (shipmentIds.length === 0) {
    return { ok: false, erro: "Nenhum envio selecionado.", falhas: [] };
  }

  const aba = window.open("", "_blank");
  if (aba) {
    aba.document.write(
      `<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8">` +
        `<title>Etiquetas</title></head>` +
        `<body style="font-family:system-ui,sans-serif;padding:32px;color:#0F3A3E">` +
        `Gerando ${shipmentIds.length} etiqueta(s)...</body></html>`,
    );
    aba.document.close();
  }

  try {
    const url = `/api/admin/etiqueta?ids=${encodeURIComponent(shipmentIds.join(","))}`;
    const response = await fetch(url, { headers: { Accept: "application/pdf" } });

    if (!response.ok) {
      aba?.close();
      let erro = `Erro ${response.status} ao gerar etiquetas.`;
      let falhas: Array<{ label: string; erro: string }> = [];
      try {
        const body = await response.json();
        if (body?.error) erro = body.error;
        if (Array.isArray(body?.failed)) falhas = body.failed;
      } catch {
        // resposta sem JSON — mantem a mensagem por status
      }
      return { ok: false, erro, falhas };
    }

    const included = Number(response.headers.get("X-Etiquetas-Incluidas") ?? 0);
    const total = Number(response.headers.get("X-Etiquetas-Total") ?? shipmentIds.length);
    const paginas = Number(response.headers.get("X-Etiquetas-Paginas") ?? 0);
    const falhas = decodeFalhas(response.headers.get("X-Etiquetas-Falhas"));

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    if (aba) {
      // Substitui o "carregando" pelo PDF. O viewer nativo do navegador dá o
      // Ctrl+P que imprime SÓ o PDF — nunca a página do admin.
      aba.location.replace(blobUrl);
    } else {
      // Popup bloqueado: baixa o arquivo em vez de perder o PDF.
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `etiquetas-${included}.pdf`;
      link.click();
    }

    // Revoga depois de dar tempo do viewer carregar. Sem isso o blob vaza.
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);

    return {
      ok: true,
      included,
      total,
      paginas,
      falhas,
      aviso: formatAvisoFalhas(included, total, falhas),
    };
  } catch (e) {
    aba?.close();
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro desconhecido ao gerar etiquetas.",
      falhas: [],
    };
  }
}
