import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isZplContent,
  mergeLabelZpls,
  type LabelZplFetchResult,
  type LabelZplSource,
} from "./shipping-label-zpl";

function source(n: number): LabelZplSource {
  return { shipmentId: `ship-${n}`, externalId: `ext-${n}`, label: `#100${n}` };
}

const VALID_ZPL = "^XA^FO10,10^A0N,25,25^FDTeste^FS^XZ";

test("isZplContent valida blocos ZPL corretos", () => {
  assert.equal(isZplContent("^XA^XZ"), true);
  assert.equal(isZplContent("  ^XA ... ^XZ  "), true);
  assert.equal(isZplContent("PDF content"), false);
  assert.equal(isZplContent(""), false);
  assert.equal(isZplContent(null), false);
});

test("mergeLabelZpls concatena N=1 perfeitamente", () => {
  const results: LabelZplFetchResult[] = [
    { ok: true, source: source(1), zpl: VALID_ZPL },
  ];
  const merged = mergeLabelZpls(results);
  assert.equal(merged.count, 1);
  assert.equal(merged.included.length, 1);
  assert.equal(merged.failed.length, 0);
  assert.ok(merged.zpl?.includes(VALID_ZPL));
});

test("mergeLabelZpls concatena N=3 preservando a ordem", () => {
  const results: LabelZplFetchResult[] = [
    { ok: true, source: source(1), zpl: "^XA^FD1^XZ" },
    { ok: true, source: source(2), zpl: "^XA^FD2^XZ" },
    { ok: true, source: source(3), zpl: "^XA^FD3^XZ" },
  ];
  const merged = mergeLabelZpls(results);
  assert.equal(merged.count, 3);
  assert.deepEqual(merged.included.map((s) => s.shipmentId), ["ship-1", "ship-2", "ship-3"]);
  assert.ok(merged.zpl?.indexOf("^XA^FD1^XZ")! < merged.zpl?.indexOf("^XA^FD2^XZ")!);
  assert.ok(merged.zpl?.indexOf("^XA^FD2^XZ")! < merged.zpl?.indexOf("^XA^FD3^XZ")!);
});

test("mergeLabelZpls isola falhas parciais (N=3 com 1 falha)", () => {
  const results: LabelZplFetchResult[] = [
    { ok: true, source: source(1), zpl: "^XA^FD1^XZ" },
    { ok: false, source: source(2), erro: "Erro de rede" },
    { ok: true, source: source(3), zpl: "^XA^FD3^XZ" },
  ];
  const merged = mergeLabelZpls(results);
  assert.equal(merged.count, 2);
  assert.deepEqual(merged.included.map((s) => s.shipmentId), ["ship-1", "ship-3"]);
  assert.equal(merged.failed.length, 1);
  assert.equal(merged.failed[0].source.shipmentId, "ship-2");
  assert.equal(merged.failed[0].erro, "Erro de rede");
});

test("mergeLabelZpls retorna zpl null se todas falharem", () => {
  const results: LabelZplFetchResult[] = [
    { ok: false, source: source(1), erro: "Erro 1" },
    { ok: false, source: source(2), erro: "Erro 2" },
  ];
  const merged = mergeLabelZpls(results);
  assert.equal(merged.zpl, null);
  assert.equal(merged.count, 0);
  assert.equal(merged.failed.length, 2);
});
