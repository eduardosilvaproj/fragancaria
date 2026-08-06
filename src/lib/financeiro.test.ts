import { describe, it } from "node:test";
import assert from "node:assert";
import { agregarFinanceiro } from "./financeiro.functions";

describe("agregarFinanceiro", () => {
  it("pedido com custo conhecido: receita, CPV e margem corretas", () => {
    const orders = [
      {
        id: "order-1",
        created_at: "2026-08-05T10:00:00Z",
        items: [
          {
            id: "prod-1",
            title: "Produto com custo",
            quantity: 2,
            price: 120,
            cost: 50,
          },
        ],
      },
    ];

    const result = agregarFinanceiro(orders, { dataInicio: "2026-08-05" });

    assert.strictEqual(result.receita, 240);
    assert.strictEqual(result.custo, 100);
    assert.strictEqual(result.margemBruta, 140);
    assert.strictEqual(result.margemPercentual, 58.333333333333336);
    assert.strictEqual(result.itensComCusto, 2);
    assert.strictEqual(result.itensSemCusto, 0);
    assert.strictEqual(result.totalItensVendidos, 2);
    assert.strictEqual(result.totalPedidos, 1);
  });

  it("item sem custo aparece no contador sem custo e nao entra na margem", () => {
    const orders = [
      {
        id: "order-2",
        created_at: "2026-08-05T10:00:00Z",
        items: [
          {
            id: "prod-1",
            title: "Produto com custo",
            quantity: 2,
            price: 120,
            cost: 50,
          },
          {
            id: "prod-2",
            title: "Produto sem custo",
            quantity: 1,
            price: 200,
            cost: null,
          },
        ],
      },
    ];

    const result = agregarFinanceiro(orders, { dataInicio: "2026-08-05" });

    // Receita: 240 + 200 = 440
    assert.strictEqual(result.receita, 440);
    // Custo: 100 (o segundo item nao entra como 0)
    assert.strictEqual(result.custo, 100);
    // Margem: 340
    assert.strictEqual(result.margemBruta, 340);
    // Percentual: 340 / 440 = 77.27% (apenas sobre os itens com custo)
    assert.strictEqual(result.margemPercentual, 77.27272727272727);
    // Contadores de cobertura
    assert.strictEqual(result.itensComCusto, 2);
    assert.strictEqual(result.itensSemCusto, 1);
    assert.strictEqual(result.totalItensVendidos, 3);
  });

  it("lista vazia retorna zeros e nao quebra", () => {
    const result = agregarFinanceiro([], { dataInicio: "2026-08-05" });
    assert.strictEqual(result.receita, 0);
    assert.strictEqual(result.custo, 0);
    assert.strictEqual(result.margemBruta, 0);
    assert.strictEqual(result.margemPercentual, null);
    assert.strictEqual(result.itensComCusto, 0);
    assert.strictEqual(result.itensSemCusto, 0);
    assert.strictEqual(result.totalItensVendidos, 0);
  });
});
