import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPdfBytes,
  mergeLabelPdfs,
  describePartialFailure,
  type LabelFetchResult,
  type LabelPdfSource,
} from "./shipping-label-pdf";
import { formatAvisoFalhas } from "./print-shipping-labels";

function source(n: number): LabelPdfSource {
  return { shipmentId: `ship-${n}`, externalId: `ext-${n}`, label: `#100${n}` };
}

/** PDF mínimo válido, montado à mão — evita depender de arquivo em disco. */
async function pdfDeUmaPagina(): Promise<Uint8Array> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.addPage([283, 425]);
  return doc.save();
}

// =====================================================
// isPdfBytes
// =====================================================

test("isPdfBytes reconhece a assinatura %PDF-", async () => {
  assert.equal(isPdfBytes(await pdfDeUmaPagina()), true);
});

test("isPdfBytes rejeita HTML, vazio e null", () => {
  assert.equal(isPdfBytes(new TextEncoder().encode("<!DOCTYPE html><html>")), false);
  assert.equal(isPdfBytes(new Uint8Array(0)), false);
  assert.equal(isPdfBytes(null), false);
  assert.equal(isPdfBytes(undefined), false);
  // Curto demais para ter assinatura
  assert.equal(isPdfBytes(new Uint8Array([0x25, 0x50])), false);
});

// =====================================================
// mergeLabelPdfs — caminho feliz
// =====================================================

test("mescla N PDFs em um só, somando as páginas", async () => {
  const pdf = await pdfDeUmaPagina();
  const results: LabelFetchResult[] = [
    { ok: true, source: source(1), pdf },
    { ok: true, source: source(2), pdf },
    { ok: true, source: source(3), pdf },
  ];

  const merged = await mergeLabelPdfs(results);

  assert.notEqual(merged.pdf, null);
  assert.equal(merged.pageCount, 3);
  assert.equal(merged.included.length, 3);
  assert.deepEqual(merged.failed, []);
  assert.equal(isPdfBytes(merged.pdf!), true);
});

test("preserva a ordem de entrada em included", async () => {
  const pdf = await pdfDeUmaPagina();
  const merged = await mergeLabelPdfs([
    { ok: true, source: source(3), pdf },
    { ok: true, source: source(1), pdf },
    { ok: true, source: source(2), pdf },
  ]);
  assert.deepEqual(
    merged.included.map((s) => s.label),
    ["#1003", "#1001", "#1002"],
  );
});

test("uma etiqueta é o caso N=1 do mesmo caminho", async () => {
  const merged = await mergeLabelPdfs([
    { ok: true, source: source(1), pdf: await pdfDeUmaPagina() },
  ]);
  assert.equal(merged.pageCount, 1);
  assert.equal(merged.included.length, 1);
  assert.deepEqual(merged.failed, []);
});

// =====================================================
// mergeLabelPdfs — falha parcial (o cuidado nº 1)
// =====================================================

test("falha parcial: PDF sai com as que deram certo E reporta as que faltaram", async () => {
  const pdf = await pdfDeUmaPagina();
  const merged = await mergeLabelPdfs([
    { ok: true, source: source(1), pdf },
    { ok: false, source: source(2), erro: "Download respondeu 404." },
    { ok: true, source: source(3), pdf },
  ]);

  assert.equal(merged.pageCount, 2);
  assert.deepEqual(
    merged.included.map((s) => s.label),
    ["#1001", "#1003"],
  );
  // NUNCA silencioso: a que falhou está em failed com o motivo.
  assert.equal(merged.failed.length, 1);
  assert.equal(merged.failed[0]!.source.label, "#1002");
  assert.match(merged.failed[0]!.erro, /404/);
});

test("bytes que não são PDF caem em failed em vez de corromper o lote", async () => {
  const merged = await mergeLabelPdfs([
    { ok: true, source: source(1), pdf: await pdfDeUmaPagina() },
    { ok: true, source: source(2), pdf: new TextEncoder().encode("<html>erro</html>") },
  ]);

  assert.equal(merged.pageCount, 1);
  assert.equal(merged.included.length, 1);
  assert.equal(merged.failed.length, 1);
  assert.match(merged.failed[0]!.erro, /não é um PDF válido/);
});

test("todas falharam: pdf é null, nunca um PDF vazio", async () => {
  const merged = await mergeLabelPdfs([
    { ok: false, source: source(1), erro: "sem etiqueta" },
    { ok: false, source: source(2), erro: "404" },
  ]);

  assert.equal(merged.pdf, null);
  assert.equal(merged.pageCount, 0);
  assert.deepEqual(merged.included, []);
  assert.equal(merged.failed.length, 2);
});

test("lista vazia não produz PDF", async () => {
  const merged = await mergeLabelPdfs([]);
  assert.equal(merged.pdf, null);
  assert.deepEqual(merged.failed, []);
});

// =====================================================
// describePartialFailure — o aviso que o operador lê
// =====================================================

test("sem falhas, não há aviso", () => {
  assert.equal(
    describePartialFailure({ included: [source(1), source(2)], failed: [] }),
    null,
  );
});

test("aviso de falha parcial diz quantas saíram, quantas não, e para NÃO despachar", () => {
  const aviso = describePartialFailure({
    included: [source(1), source(2), source(3)],
    failed: [{ source: source(4), erro: "404" }],
  });

  assert.ok(aviso);
  assert.match(aviso!, /3 de 4/);
  assert.match(aviso!, /NÃO despache/);
  assert.match(aviso!, /#1004/);
});

test("aviso quando nada foi impresso", () => {
  const aviso = describePartialFailure({
    included: [],
    failed: [
      { source: source(1), erro: "404" },
      { source: source(2), erro: "500" },
    ],
  });
  assert.ok(aviso);
  assert.match(aviso!, /Nenhuma etiqueta/);
  assert.match(aviso!, /2 de 2/);
});

// =====================================================
// O texto do cliente tem de bater com o do servidor
// =====================================================

test("formatAvisoFalhas (cliente) produz o MESMO texto de describePartialFailure (servidor)", () => {
  const included = [source(1), source(2), source(3)];
  const failed = [
    { source: source(4), erro: "404" },
    { source: source(5), erro: "timeout" },
  ];

  const doServidor = describePartialFailure({ included, failed });
  const doCliente = formatAvisoFalhas(
    included.length,
    included.length + failed.length,
    failed.map((f) => ({ label: f.source.label, erro: f.erro })),
  );

  assert.equal(doCliente, doServidor);
});

test("os dois lados concordam também quando nada foi impresso", () => {
  const failed = [{ source: source(1), erro: "404" }];
  assert.equal(
    formatAvisoFalhas(0, 1, failed.map((f) => ({ label: f.source.label, erro: f.erro }))),
    describePartialFailure({ included: [], failed }),
  );
});

test("os dois lados concordam no caso sem falhas (ambos null)", () => {
  assert.equal(formatAvisoFalhas(2, 2, []), null);
  assert.equal(describePartialFailure({ included: [source(1), source(2)], failed: [] }), null);
});
