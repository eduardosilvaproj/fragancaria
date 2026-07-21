// Ferramenta de catálogo para a consultora/agente headless. Funções puras: o
// client Supabase (service role) é injetado — sem requireAdmin, sem contexto
// HTTP — no mesmo padrão de runGenerateOrderLabelCore. Não importa
// @tanstack/react-start de propósito, pra ser carregável por tsx/node em teste.
// A consultora usa searchProducts pra indicar produtos reais e getProduct pra
// detalhar um item antes de recomendar.

export type AgentProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  inStock: boolean;
  quantity: number;
  description: string;
  category: string;
  tags: string[];
};

type ProductRow = {
  id: string;
  name: string | null;
  brand: string | null;
  price: number | string | null;
  description: string | null;
  category: string | null;
  in_stock: boolean | null;
  quantity: number | null;
  tags: string[] | null;
};

const AGENT_PRODUCT_COLUMNS =
  "id, name, brand, price, description, category, in_stock, quantity, tags";

// Campos pesquisáveis e peso relativo (name domina, description é o mais fraco).
// Ordem decrescente de peso importa: scoreProduct conta cada token no primeiro
// campo que casar, então o de maior peso vence.
const SEARCH_FIELDS: Array<{ weight: number; get: (p: AgentProduct) => string }> = [
  { weight: 5, get: (p) => p.name },
  { weight: 3, get: (p) => p.brand },
  { weight: 3, get: (p) => p.tags.join(" ") },
  { weight: 2, get: (p) => p.category },
  { weight: 1, get: (p) => p.description },
];

function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function rowToAgentProduct(r: ProductRow): AgentProduct {
  return {
    id: r.id,
    name: r.name ?? "",
    brand: r.brand ?? "",
    price: Number(r.price ?? 0),
    inStock: Boolean(r.in_stock),
    quantity: Number(r.quantity ?? 0),
    description: r.description ?? "",
    category: r.category ?? "",
    tags: Array.isArray(r.tags) ? r.tags : [],
  };
}

function scoreProduct(product: AgentProduct, tokens: string[]): number {
  const fields = SEARCH_FIELDS.map((f) => ({ weight: f.weight, text: normalize(f.get(product)) }));
  let score = 0;
  for (const token of tokens) {
    for (const field of fields) {
      if (field.text.includes(token)) {
        score += field.weight;
        break; // token conta só no campo de maior peso
      }
    }
  }
  return score;
}

// Busca no catálogo ativo por termo livre. Ranqueia name > marca/tags > categoria
// > descrição. Retorna in E out of stock (o estoque é campo pro agente decidir,
// não filtro). Termo vazio => navega o catálogo (primeiros N por nome).
export async function searchProducts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: { query: string; limit?: number },
): Promise<AgentProduct[]> {
  const limit = params.limit && params.limit > 0 ? params.limit : 5;

  const { data, error } = await db
    .from("products")
    .select(AGENT_PRODUCT_COLUMNS)
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const products = ((data ?? []) as ProductRow[]).map(rowToAgentProduct);
  const tokens = normalize(params.query).split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return [...products].sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
  }

  return products
    .map((product) => ({ product, score: scoreProduct(product, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit)
    .map((entry) => entry.product);
}

// Detalhe de um produto ativo por id. null se não existir ou estiver inativo.
export async function getProduct(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  id: string,
): Promise<AgentProduct | null> {
  const { data, error } = await db
    .from("products")
    .select(AGENT_PRODUCT_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToAgentProduct(data as ProductRow) : null;
}
