// Normalização de texto para busca de produto. Fonte única das três buscas do
// site: a listagem (`routes/produtos.tsx`), o autocomplete do navbar
// (`components/shop/SearchAutocomplete.tsx`) e a do agente
// (`lib/agent/product-search.ts`).
//
// Módulo SEM imports de propósito: `product-search.ts` é carregado por
// tsx/node nos testes, sem contexto HTTP nem bundler, e precisa continuar
// assim.
//
// Por que existe: até 2026-07-31 as duas buscas da storefront comparavam com
// `.toLowerCase().includes()` cru. Quem digitava "loreal" achava 71 produtos
// só porque o dado ainda estava errado — o título trazia "Loreal" sem acento,
// que é justamente o que o usuário digita. Corrigir a grafia no banco sem isto
// aqui derrubaria a busca para 17 resultados (e a zero, corrigindo também
// `brand`), sem ninguém reclamar. Ver docs/backlog.md, item C2/C10.

/**
 * Reduz o texto à forma comparável: sem acento, sem apóstrofo, minúsculo.
 *
 * Aplicar nos DOIS lados da comparação — no termo digitado e no campo do
 * produto. Normalizar só um lado não resolve nada.
 *
 * O apóstrofo sai porque o NFD decompõe acento mas não mexe em pontuação:
 * sem removê-lo, `l'oreal` e `loreal` nunca se encontram. Trata o reto (') e
 * o curvo (’) — o dado em prod só tem o reto (medido 2026-07-31: 192 em
 * `brand`, 82 em `name`), mas teclado de celular insere o curvo sozinho.
 *
 * Hífen NÃO é removido: 1146 dos 1234 nomes ativos usam hífen como separador
 * real ("Inoa 60ml - 7.3 loiro dourado"), e colapsá-lo juntaria palavras que
 * o usuário digita separadas.
 */
export function normalizeSearchText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas de acento decompostas pelo NFD
    .replace(/['’]/g, "") // apóstrofo reto e curvo
    .toLowerCase()
    .trim();
}

/**
 * Quebra o termo digitado em tokens normalizados. Vazio => array vazio, que o
 * chamador trata como "sem busca" (navegar o catálogo, não filtrar tudo fora).
 */
export function tokenizeSearchQuery(query: string | null | undefined): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

/**
 * True se TODOS os tokens aparecem em pelo menos um dos campos.
 *
 * Cada token pode casar num campo diferente: "loreal inoa" acha o produto cuja
 * marca é L'Oréal e o nome tem Inoa. Exigir todos os tokens no mesmo campo
 * deixaria essa busca — a mais natural — sem resultado.
 */
export function matchesAllTokens(
  tokens: string[],
  fields: Array<string | null | undefined>,
): boolean {
  if (tokens.length === 0) return true;
  const normalizados = fields.map(normalizeSearchText);
  return tokens.every((token) => normalizados.some((campo) => campo.includes(token)));
}
