import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSearchText, tokenizeSearchQuery, matchesAllTokens } from "./search-normalize";

// O caso que motivou o módulo: "loreal", "l'oreal" e "l'oréal" tinham que
// convergir. Medido contra prod em 2026-07-31 — os 4 termos passaram de
// 71/47/191/118 resultados para 209 nos dois filtros da storefront.
test("as variações de L'Oréal normalizam para a mesma string", () => {
  const esperado = "loreal";
  for (const variante of ["Loreal", "loreal", "L'Oreal", "l'oreal", "L'Oréal", "l'oréal", "LORÉAL"]) {
    assert.equal(normalizeSearchText(variante), esperado, `falhou em "${variante}"`);
  }
});

test("remove o apóstrofo reto e o curvo", () => {
  // O NFD decompõe acento mas não mexe em pontuação: sem remover o apóstrofo,
  // `l'oreal` e `loreal` nunca se encontram. O curvo entra porque teclado de
  // celular insere sozinho, mesmo sem existir no dado de prod.
  assert.equal(normalizeSearchText("L'Oréal"), "loreal");
  assert.equal(normalizeSearchText("L’Oréal"), "loreal");
});

test("preserva o hífen", () => {
  // 1146 dos 1234 nomes ativos usam hífen como separador real. Colapsá-lo
  // juntaria palavras que o usuário digita separadas.
  assert.equal(normalizeSearchText("Inoa 60ml - 7.3 Loiro"), "inoa 60ml - 7.3 loiro");
});

test("normalizeSearchText tolera null e undefined", () => {
  assert.equal(normalizeSearchText(null), "");
  assert.equal(normalizeSearchText(undefined), "");
  assert.equal(normalizeSearchText("  Máscara  "), "mascara");
});

test("tokenizeSearchQuery quebra em tokens e ignora espaço extra", () => {
  assert.deepEqual(tokenizeSearchQuery("  L'Oréal   Inoa "), ["loreal", "inoa"]);
  assert.deepEqual(tokenizeSearchQuery(""), []);
  assert.deepEqual(tokenizeSearchQuery("   "), []);
  assert.deepEqual(tokenizeSearchQuery(null), []);
});

test("matchesAllTokens casa tokens em campos DIFERENTES", () => {
  // "loreal inoa": a marca é L'Oréal e o nome tem Inoa. Exigir os dois tokens
  // no mesmo campo deixaria a busca mais natural sem resultado.
  const tokens = tokenizeSearchQuery("loreal inoa");
  assert.equal(matchesAllTokens(tokens, ["Coloração Inoa 60ml", "L'Oréal", "Coloração"]), true);
});

test("matchesAllTokens exige TODOS os tokens", () => {
  const tokens = tokenizeSearchQuery("loreal kerastase");
  assert.equal(matchesAllTokens(tokens, ["Coloração Inoa", "L'Oréal", "Coloração"]), false);
});

test("matchesAllTokens acha produto de nome sem acento buscando com acento", () => {
  // É a direção que quebraria ao corrigir o dado: hoje o título traz "Loreal"
  // cru. Depois do SQL vira "L'Oréal" — e as duas buscas têm que funcionar
  // nos dois estados do dado.
  const comAcento = tokenizeSearchQuery("l'oréal");
  assert.equal(matchesAllTokens(comAcento, ["Tinta Inoa Loreal 60ml", "L'Oréal"]), true);
  assert.equal(matchesAllTokens(comAcento, ["Tinta Inoa L'Oréal 60ml", "L'Oréal"]), true);

  const semAcento = tokenizeSearchQuery("loreal");
  assert.equal(matchesAllTokens(semAcento, ["Tinta Inoa Loreal 60ml", "L'Oréal"]), true);
  assert.equal(matchesAllTokens(semAcento, ["Tinta Inoa L'Oréal 60ml", "L'Oréal"]), true);
});

test("termo vazio não filtra nada fora", () => {
  // A listagem chama matchesAllTokens só quando há searchTerm, mas deixar o
  // vazio devolvendo true evita que um espaço em branco esvazie o catálogo.
  assert.equal(matchesAllTokens([], ["qualquer coisa"]), true);
});

test("campos null/undefined não quebram a comparação", () => {
  const tokens = tokenizeSearchQuery("loreal");
  assert.equal(matchesAllTokens(tokens, [null, "L'Oréal", undefined]), true);
  assert.equal(matchesAllTokens(tokens, [null, undefined]), false);
});
