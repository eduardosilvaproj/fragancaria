// Proxy do PDF da etiqueta, servido pelo NOSSO dominio.
//
// POR QUE UMA ROTA DE API E NAO UMA SERVER FN:
// server fn devolve JSON serializado; aqui o corpo precisa ser
// `application/pdf` com os bytes crus, para o navegador abrir/imprimir direto.
//
// POR QUE PROXY E NAO REDIRECT:
// GET /me/imprimir/pdf/{id} devolve uma url pre-assinada do S3 que expira em
// 1800s e baixa a etiqueta SEM autenticacao nenhuma. Se ela chegasse ao
// navegador, seria link aberto para a etiqueta. O token e a url do S3 ficam no
// servidor; o admin recebe so os bytes.
//
// FALHA PARCIAL — a regra que importa:
// 10 ids com 3 falhas NAO devolve um PDF de 7 etiquetas em silencio. O corpo vem
// com as que deram certo, e a lista das que faltaram vai no header
// `X-Etiquetas-Falhas` (JSON em base64, porque header HTTP e ASCII). O admin le
// esse header e exibe o aviso. Se TODAS falharem, a resposta e 502 com JSON —
// nao existe PDF vazio.
import { createFileRoute } from "@tanstack/react-router";
import {
  mergeLabelPdfs,
  type LabelFetchResult,
  type LabelPdfSource,
} from "@/lib/shipping-label-pdf";

/** JSON -> base64, para caber num header HTTP (que e ASCII). */
function encodeHeader(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/admin/etiqueta")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { requireAdmin } = await import("@/lib/admin-auth");
          await requireAdmin();

          const url = new URL(request.url);
          // ids = shipping_quotes.id, separados por virgula. Um id e o caso
          // N=1: o lote e o caminho unico, sem codigo separado.
          const ids = (url.searchParams.get("ids") ?? "")
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

          if (ids.length === 0) {
            return json({ error: "Informe ao menos um id de envio (?ids=...)." }, 400);
          }
          if (ids.length > 50) {
            return json(
              { error: `Limite de 50 etiquetas por impressão (recebidos ${ids.length}).` },
              400,
            );
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const db = supabaseAdmin as any;

          const { data: rows, error } = await db
            .from("shipping_quotes")
            .select("id, order_number, order_id, shipment_id_external")
            .in("id", ids);

          if (error) return json({ error: error.message }, 500);

          const byId = new Map<string, Record<string, unknown>>(
            (rows ?? []).map((row: Record<string, unknown>) => [String(row.id), row]),
          );

          // Preserva a ordem pedida pelo admin: a pilha impressa sai na mesma
          // sequencia da lista da tela.
          const sources: LabelPdfSource[] = ids.map((id) => {
            const row = byId.get(id);
            const orderNumber = row?.order_number;
            const orderId = row?.order_id;
            const label = orderNumber
              ? `#${orderNumber}`
              : orderId
                ? `#${String(orderId).slice(0, 8).toUpperCase()}`
                : `envio ${id.slice(0, 8)}`;
            return {
              shipmentId: id,
              externalId: row ? ((row.shipment_id_external as string | null) ?? null) : null,
              label,
            };
          });

          const { buscarPdfEtiqueta } = await import("@/lib/melhor-envio-client.server");

          // Em paralelo: o gargalo e o download do S3 (~800ms cada), que
          // paraleliza bem. Uma etiqueta mediu ~1,5s no total.
          const results: LabelFetchResult[] = await Promise.all(
            sources.map(async (source): Promise<LabelFetchResult> => {
              if (!byId.has(source.shipmentId)) {
                return { ok: false, source, erro: "Envio não encontrado." };
              }
              if (!source.externalId) {
                return {
                  ok: false,
                  source,
                  erro: "Envio sem etiqueta comprada no Melhor Envio.",
                };
              }
              const fetched = await buscarPdfEtiqueta(source.externalId);
              return fetched.ok
                ? { ok: true, source, pdf: fetched.pdf }
                : { ok: false, source, erro: fetched.erro };
            }),
          );

          const merged = await mergeLabelPdfs(results);

          if (!merged.pdf) {
            return json(
              {
                error: "Nenhuma etiqueta pôde ser impressa.",
                failed: merged.failed.map((f) => ({ label: f.source.label, erro: f.erro })),
              },
              502,
            );
          }

          // Marca impressao apenas do que REALMENTE entrou no PDF.
          const printedIds = merged.included.map((source) => source.shipmentId);
          if (printedIds.length > 0) {
            await db
              .from("shipping_quotes")
              .update({ label_printed_at: new Date().toISOString() })
              .in("id", printedIds)
              .is("label_printed_at", null);
          }

          const headers: Record<string, string> = {
            "content-type": "application/pdf",
            "content-disposition": `inline; filename="etiquetas-${printedIds.length}.pdf"`,
            "cache-control": "no-store",
            "X-Etiquetas-Incluidas": String(merged.included.length),
            "X-Etiquetas-Total": String(sources.length),
            "X-Etiquetas-Paginas": String(merged.pageCount),
          };
          if (merged.failed.length > 0) {
            headers["X-Etiquetas-Falhas"] = encodeHeader(
              merged.failed.map((f) => ({ label: f.source.label, erro: f.erro })),
            );
          }

          return new Response(new Uint8Array(merged.pdf), { status: 200, headers });
        } catch (e: unknown) {
          const err = e as { message?: string };
          if (err?.message === "NAO_AUTORIZADO") {
            return json({ error: "Não autorizado" }, 401);
          }
          return json({ error: err?.message || "Erro desconhecido" }, 500);
        }
      },
    },
  },
});
