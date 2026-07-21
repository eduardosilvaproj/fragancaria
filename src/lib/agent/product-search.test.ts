import { test } from "node:test";
import assert from "node:assert/strict";
import { searchProducts, getProduct } from "./product-search";

const ROWS = [
  {
    id: "p1",
    name: "Perfume Wella Invigo Nutri-enrich",
    brand: "Wella",
    price: "734.00",
    description: "Kit nutritivo para cabelos secos",
    category: "cabelo",
    in_stock: true,
    quantity: 12,
    tags: ["nutritivo", "kit"],
  },
  {
    id: "p2",
    name: "Máscara Truss Scalp",
    brand: "Truss",
    price: 170.99,
    description: "Máscara antifrizz para couro cabeludo",
    category: "cabelo",
    in_stock: false,
    quantity: 0,
    tags: ["antifrizz"],
  },
  {
    id: "p3",
    name: "Shampoo LOreal Nutrioil",
    brand: "LOreal",
    price: 246,
    description: "Limpeza suave",
    category: "cabelo",
    in_stock: true,
    quantity: 3,
    tags: null,
  },
];

// Fake db mínimo: replica o encadeamento .from().select().eq()[.eq().maybeSingle()]
// que product-search usa. Sem rede, sem Supabase real.
function fakeDb(rows = ROWS) {
  return {
    from() {
      const state = { eqs: [] as Array<[string, unknown]> };
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          state.eqs.push([col, val]);
          return builder;
        },
        maybeSingle: async () => {
          let filtered = rows.filter((r) => (r as any).is_active !== false);
          for (const [col, val] of state.eqs) {
            if (col === "is_active") continue;
            filtered = filtered.filter((r) => (r as any)[col] === val);
          }
          return { data: filtered[0] ?? null, error: null };
        },
        then: (resolve: (v: { data: unknown; error: null }) => void) =>
          resolve({ data: rows, error: null }),
      };
      return builder;
    },
  };
}

test("searchProducts casa por nome e retorna campos do catálogo", async () => {
  const results = await searchProducts(fakeDb(), { query: "wella invigo" });
  assert.equal(results.length, 1);
  assert.deepEqual(results[0], {
    id: "p1",
    name: "Perfume Wella Invigo Nutri-enrich",
    brand: "Wella",
    price: 734,
    inStock: true,
    quantity: 12,
    description: "Kit nutritivo para cabelos secos",
    category: "cabelo",
    tags: ["nutritivo", "kit"],
  });
});

test("searchProducts ignora acento no termo (máscara ~ mascara)", async () => {
  const results = await searchProducts(fakeDb(), { query: "mascara" });
  assert.ok(results.some((p) => p.id === "p2"));
});

test("searchProducts casa por tag e por marca", async () => {
  const porTag = await searchProducts(fakeDb(), { query: "antifrizz" });
  assert.deepEqual(porTag.map((p) => p.id), ["p2"]);

  const porMarca = await searchProducts(fakeDb(), { query: "truss" });
  assert.deepEqual(porMarca.map((p) => p.id), ["p2"]);
});

test("searchProducts retorna out-of-stock (estoque é dado, não filtro)", async () => {
  const results = await searchProducts(fakeDb(), { query: "truss" });
  assert.equal(results[0].inStock, false);
  assert.equal(results[0].quantity, 0);
});

test("searchProducts com termo vazio navega o catálogo por nome", async () => {
  const results = await searchProducts(fakeDb(), { query: "  ", limit: 2 });
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((p) => p.name), [
    "Máscara Truss Scalp",
    "Perfume Wella Invigo Nutri-enrich",
  ]);
});

test("searchProducts respeita o limit", async () => {
  const results = await searchProducts(fakeDb(), { query: "cabelo", limit: 1 });
  assert.equal(results.length, 1);
});

test("searchProducts sem match retorna vazio", async () => {
  const results = await searchProducts(fakeDb(), { query: "xyznaoexiste" });
  assert.deepEqual(results, []);
});

test("getProduct por id retorna o produto ativo", async () => {
  const product = await getProduct(fakeDb(), "p3");
  assert.equal(product?.id, "p3");
  assert.equal(product?.price, 246);
  assert.equal(product?.tags.length, 0);
});

test("getProduct com id inexistente retorna null", async () => {
  const product = await getProduct(fakeDb(), "nope");
  assert.equal(product, null);
});
