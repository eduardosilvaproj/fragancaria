import type { Product } from "@/data/products";

// =====================================================
// SUGESTÃO DE COMPLEMENTO NO CARRINHO ("leve junto")
// =====================================================
// Determinístico: sem IA, sem chamada externa, sem await. Roda em memória
// sobre o catálogo que a página já carregou, então a sugestão aparece junto
// com o carrinho.
//
// PONTO CENTRAL DO DESENHO — por que existe "tipo" e não só "category":
// as regras de negócio falam em oxigenada, descolorante e matizador, e NENHUM
// dos três é uma categoria. Medido em prod 2026-07-30, `products.category` tem
// 11 valores (Coloração, Kits, Máscara, Shampoo, Finalizador, Condicionador,
// Variedades, Óleo, Tratamentos, Leave-in, Maquiagem) e os três moram dentro
// de "Coloração":
//
//   oxigenada avulsa  38 vendáveis   (Wella 10, L'Oréal 10, Schwarzkopf 8,
//                                     Alfaparf 5, Itallian 5)
//   descolorante      10 vendáveis
//   matizador         10 vendáveis
//
// Então o pareamento usa um TIPO derivado: padrão no nome primeiro, categoria
// como fallback. Ajustar as regras = mexer em REGRAS_PAREAMENTO e nos padrões
// abaixo, nada além disso.
//
// ARMADILHA que o levantamento pegou: 116 dos 154 produtos cujo nome casa com
// "ox" são combos ("Kit Coloração Tintura 60g + Ox 20 Vol"), que JÁ trazem a
// oxigenada. Sugerir oxigenada para quem comprou um desses é vender uma
// segunda tinta. Daí a distinção entre classificarTipo (só oxigenada avulsa
// vira tipo "oxigenada") e mencionaTipo (combo menciona ox, então não recebe
// a sugestão).

export type TipoComplemento =
  | "coloracao"
  | "descolorante"
  | "oxigenada"
  | "matizador"
  | "shampoo"
  | "condicionador"
  | "mascara"
  | "leave-in";

// =====================================================
// AS REGRAS. É AQUI QUE SE MEXE.
// =====================================================
// Ordem importa: a primeira regra que casa com um item do carrinho é atendida
// primeiro, então o topo da lista é o que mais importa vender junto.
export const REGRAS_PAREAMENTO: Array<{
  quando: TipoComplemento;
  sugere: TipoComplemento[];
  motivo: string;
}> = [
  // A mais importante: coloração não revela sem oxigenada.
  // Cobertura medida: 601 das 771 colorações vendáveis têm oxigenada da mesma
  // marca. As 170 restantes (Kamaleão 83, Keune 40, Cadiveu 39, Loreal 4,
  // Bigen 2, sem marca 2) caem no fallback de outra marca.
  { quando: "coloracao", sugere: ["oxigenada"], motivo: "Necessária para ativar a coloração" },
  { quando: "descolorante", sugere: ["oxigenada", "matizador"], motivo: "Vai junto no descolorimento" },
  { quando: "shampoo", sugere: ["condicionador"], motivo: "Completa a lavagem" },
  { quando: "condicionador", sugere: ["mascara"], motivo: "Tratamento mais profundo" },
  { quando: "mascara", sugere: ["leave-in"], motivo: "Finaliza o tratamento" },
];

// Rótulo do bloco por tipo sugerido.
const LABEL_TIPO: Record<TipoComplemento, string> = {
  coloracao: "coloração",
  descolorante: "descolorante",
  oxigenada: "oxigenada",
  matizador: "matizador",
  shampoo: "shampoo",
  condicionador: "condicionador",
  mascara: "máscara",
  "leave-in": "leave-in",
};

// =====================================================
// PADRÕES DE NOME
// =====================================================
// Validados contra os 1161 produtos vendáveis de prod em 2026-07-30.

// Casa com qualquer menção a oxigenada, inclusive dentro de combo.
const RE_OX =
  /(agua oxigenada|oxigenada|oxigenado|emulsao oxidante|oxidante|revelador|locao ativadora|ativadora|\box\b)/;

// Marcadores de combo: o produto traz tintura/coloração junto, logo a
// oxigenada dele é parte do kit e ele NÃO é uma oxigenada avulsa.
const RE_COMBO = /(kit|tintura|tinta\b|coloracao|colorac|creme colorante|\+)/;

// Matizador de verdade (violeta/desamarelador). "Tonalizante" fica de fora de
// propósito: são 41 produtos que são coloração, não matizador.
const RE_MATIZADOR = /(matizador|matizante|desamarelador|\btoner\b|silver shampoo|blond shampoo)/;

const RE_DESCOLORANTE = /(descolorante|po descolorante|blond me|vario blond|blanch)/;
// Clareador de pelos não é descolorante de cabelo e não pareia com matizador.
const RE_DESCOLORANTE_NAO = /(pelos|banho de lua|buco|axila|virilha)/;

// Menção do tipo no nome, para detectar produto que EMBUTE outro. Usado nas
// duas direções em `sugerirComplementos`. Mesmo defeito do combo de oxigenada,
// mas nas regras simples: o catálogo tem "Kit Shampoo 80ml Condicionador 80ml"
// na categoria Condicionador, e sugerir isso a quem já tem shampoo no carrinho
// vende um segundo shampoo. Medido em 2026-07-30: filtrar deixa 23 dos 26
// condicionadores, 36 das 37 máscaras e 4 dos 4 leave-ins — todas as marcas
// seguem com par da mesma marca, então nenhuma regra morre.
const RE_MENCAO: Partial<Record<TipoComplemento, RegExp>> = {
  oxigenada: RE_OX,
  matizador: RE_MATIZADOR,
  descolorante: RE_DESCOLORANTE,
  coloracao: /(coloracao|colorac|tintura|tinta\b)/,
  shampoo: /\bshampoo/,
  condicionador: /\bcondicionador/,
  mascara: /\b(mascara|masc\.)/,
  "leave-in": /(leave.?in|leavein)/,
};

/** O nome do produto menciona este tipo? (produto que embute outro) */
function mencionaTipo(p: Product, tipo: TipoComplemento): boolean {
  const re = RE_MENCAO[tipo];
  return re ? re.test(semAcento(p.name)) : false;
}

// Fallback por categoria, quando nenhum padrão de nome casa.
const TIPO_POR_CATEGORIA: Record<string, TipoComplemento> = {
  "Coloração": "coloracao",
  Shampoo: "shampoo",
  Condicionador: "condicionador",
  "Máscara": "mascara",
  "Leave-in": "leave-in",
  // Kits, Variedades, Finalizador, Óleo, Tratamentos e Maquiagem ficam sem
  // tipo de propósito: não têm regra, então não geram nem recebem sugestão.
};

const semAcento = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// "L'Oréal", "Loreal" e "L'Oreal" são a mesma marca no catálogo (as três
// grafias existem). Sem isso, a preferência por mesma marca erraria.
const normalizarMarca = (s: string | null | undefined) =>
  semAcento(s || "").replace(/[^a-z0-9]/g, "");

/** Tipo do produto para fins de pareamento. null = fora das regras. */
export function classificarTipo(p: Product): TipoComplemento | null {
  const nome = semAcento(p.name);

  // Oxigenada AVULSA: menciona ox e não é combo com tintura.
  if (RE_OX.test(nome) && !RE_COMBO.test(nome)) return "oxigenada";
  if (RE_DESCOLORANTE.test(nome) && !RE_DESCOLORANTE_NAO.test(nome)) return "descolorante";
  if (RE_MATIZADOR.test(nome)) return "matizador";

  return TIPO_POR_CATEGORIA[p.category] ?? null;
}

/** Filtros obrigatórios: sem foto ou sem estoque não pode ser sugerido. */
export function podeSerSugerido(p: Product): boolean {
  return (
    Array.isArray(p.images) &&
    p.images.length > 0 &&
    !!p.images[0] &&
    p.inStock === true &&
    (p.quantity ?? 0) > 0
  );
}

export type SugestaoCarrinho = {
  product: Product;
  tipo: TipoComplemento;
  motivo: string;
  mesmaMarca: boolean;
  /** Nome do item do carrinho que originou a sugestão. */
  origemNome: string;
};

/**
 * Complementos para o que está no carrinho, por regra determinística.
 *
 * Preferência de mesma marca: candidatos da marca do item de origem primeiro;
 * cai para outra marca só se não houver. Empate resolvido pelo mais barato e,
 * em último caso, pelo id — a sugestão precisa ser estável entre renders.
 */
export function sugerirComplementos({
  idsNoCarrinho,
  catalogo,
  max = 3,
}: {
  idsNoCarrinho: string[];
  catalogo: Product[];
  max?: number;
}): SugestaoCarrinho[] {
  if (idsNoCarrinho.length === 0 || catalogo.length === 0) return [];

  const noCarrinho = new Set(idsNoCarrinho);
  const itens = catalogo.filter((p) => noCarrinho.has(p.id));
  if (itens.length === 0) return [];

  // Índice por tipo, só com o que passa nos filtros obrigatórios.
  const porTipo = new Map<TipoComplemento, Product[]>();
  for (const p of catalogo) {
    if (!podeSerSugerido(p)) continue;
    const tipo = classificarTipo(p);
    if (!tipo) continue;
    const lista = porTipo.get(tipo);
    if (lista) lista.push(p);
    else porTipo.set(tipo, [p]);
  }

  const sugestoes: SugestaoCarrinho[] = [];
  const jaSugerido = new Set<string>();

  // Percorre as regras na ordem declarada, não a ordem do carrinho: a regra do
  // topo (coloração → oxigenada) é a que mais importa e deve ganhar as vagas.
  for (const regra of REGRAS_PAREAMENTO) {
    for (const item of itens) {
      if (sugestoes.length >= max) return sugestoes;
      if (classificarTipo(item) !== regra.quando) continue;

      for (const tipoDesejado of regra.sugere) {
        if (sugestoes.length >= max) return sugestoes;
        // Item que já embute o complemento não recebe a sugestão: um "Kit
        // Tintura + Ox 20 Vol" já vem com oxigenada.
        if (mencionaTipo(item, tipoDesejado)) continue;

        const candidatos = (porTipo.get(tipoDesejado) ?? []).filter(
          (c) =>
            !noCarrinho.has(c.id) &&
            !jaSugerido.has(c.id) &&
            c.id !== item.id &&
            // ...e o complemento não pode embutir a origem: sugerir "Kit
            // Shampoo + Condicionador" a quem já tem shampoo vende um
            // segundo shampoo.
            !mencionaTipo(c, regra.quando),
        );
        if (candidatos.length === 0) continue;

        const marcaItem = normalizarMarca(item.brand);
        const escolhido = [...candidatos].sort((a, b) => {
          const aMesma = marcaItem !== "" && normalizarMarca(a.brand) === marcaItem;
          const bMesma = marcaItem !== "" && normalizarMarca(b.brand) === marcaItem;
          if (aMesma !== bMesma) return aMesma ? -1 : 1;
          if (a.price !== b.price) return a.price - b.price;
          return a.id.localeCompare(b.id);
        })[0];

        jaSugerido.add(escolhido.id);
        sugestoes.push({
          product: escolhido,
          tipo: tipoDesejado,
          motivo: regra.motivo,
          mesmaMarca:
            marcaItem !== "" && normalizarMarca(escolhido.brand) === marcaItem,
          origemNome: item.name,
        });
      }
    }
  }

  return sugestoes;
}

export function labelTipo(tipo: TipoComplemento): string {
  return LABEL_TIPO[tipo];
}
