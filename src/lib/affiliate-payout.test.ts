import { describe, it } from "node:test";
import assert from "node:assert";
import {
  bucketOf,
  buildPayoutOverview,
  releaseDate,
  summarizeCommissions,
  sumAmounts,
  availabilityCutoff,
  meetsMinimum,
  AFFILIATE_PAYOUT_SETTINGS_FALLBACK,
  type CommissionRow,
} from "./affiliate-payout";

// Referencia fixa para todos os testes: 2026-08-01T12:00:00Z
const NOW = new Date("2026-08-01T12:00:00.000Z");

function sale(over: Partial<CommissionRow> = {}): CommissionRow {
  return {
    id: "s1",
    status: "confirmed",
    confirmed_at: "2026-07-01T12:00:00.000Z",
    commission_amount: 10,
    payout_id: null,
    ...over,
  };
}

describe("releaseDate", () => {
  it("soma dias corridos, nao uteis", () => {
    // 2026-07-30 (quinta) + 15 = 2026-08-14, atravessando dois fins de semana
    const at = releaseDate("2026-07-30T00:00:00.000Z", 15);
    assert.strictEqual(at.toISOString().slice(0, 10), "2026-08-14");
  });

  it("prazo 0 libera na propria data", () => {
    const at = releaseDate("2026-07-30T10:00:00.000Z", 0);
    assert.strictEqual(at.toISOString(), "2026-07-30T10:00:00.000Z");
  });

  it("atravessa virada de mes", () => {
    const at = releaseDate("2026-08-25T00:00:00.000Z", 15);
    assert.strictEqual(at.toISOString().slice(0, 10), "2026-09-09");
  });
});

describe("bucketOf", () => {
  it("confirmed com prazo cumprido fica available", () => {
    // 01/07 + 15 = 16/07, antes de 01/08
    assert.strictEqual(bucketOf(sale(), 15, NOW), "available");
  });

  it("confirmed dentro do prazo fica pending", () => {
    // 30/07 + 15 = 14/08, depois de 01/08
    assert.strictEqual(
      bucketOf(sale({ confirmed_at: "2026-07-30T12:00:00.000Z" }), 15, NOW),
      "pending",
    );
  });

  it("libera exatamente no limite do prazo", () => {
    // 17/07 + 15 = 01/08 12:00 == NOW -> <= conta como disponivel
    assert.strictEqual(
      bucketOf(sale({ confirmed_at: "2026-07-17T12:00:00.000Z" }), 15, NOW),
      "available",
    );
  });

  it("um segundo antes do limite ainda e pending", () => {
    assert.strictEqual(
      bucketOf(sale({ confirmed_at: "2026-07-17T12:00:01.000Z" }), 15, NOW),
      "pending",
    );
  });

  it("cancelled sai das contas", () => {
    assert.strictEqual(bucketOf(sale({ status: "cancelled" }), 15, NOW), "excluded");
  });

  it("refunded sai das contas", () => {
    assert.strictEqual(bucketOf(sale({ status: "refunded" }), 15, NOW), "excluded");
  });

  it("paid conta como paga", () => {
    assert.strictEqual(bucketOf(sale({ status: "paid" }), 15, NOW), "paid");
  });

  it("confirmed com payout_id nao volta a ser oferecida", () => {
    // Defesa contra fechamento parcial: ligada a um lote, nao entra em outro
    assert.strictEqual(bucketOf(sale({ payout_id: "p1" }), 15, NOW), "paid");
  });

  it("confirmed sem confirmed_at fica preso em pending, nunca available", () => {
    assert.strictEqual(bucketOf(sale({ confirmed_at: null }), 15, NOW), "pending");
    assert.strictEqual(bucketOf(sale({ confirmed_at: null }), 0, NOW), "pending");
  });

  it("legado 'pending' nao vira available so por ser antigo", () => {
    assert.strictEqual(
      bucketOf(sale({ status: "pending", confirmed_at: "2020-01-01T00:00:00.000Z" }), 15, NOW),
      "pending",
    );
  });

  it("status null e tratado como pending", () => {
    assert.strictEqual(bucketOf(sale({ status: null }), 15, NOW), "pending");
  });

  it("prazo editado muda o resultado da mesma linha (config nao hardcoded)", () => {
    const s = sale({ confirmed_at: "2026-07-25T12:00:00.000Z" });
    assert.strictEqual(bucketOf(s, 15, NOW), "pending"); // libera 09/08
    assert.strictEqual(bucketOf(s, 5, NOW), "available"); // libera 30/07
  });
});

describe("sumAmounts", () => {
  it("nao acumula drift de float", () => {
    assert.strictEqual(sumAmounts([0.1, 0.2]), 0.3);
    assert.strictEqual(sumAmounts(Array(10).fill(0.07)), 0.7);
  });

  it("aceita numeric vindo como string do Postgres", () => {
    assert.strictEqual(sumAmounts(["1.05", "2.10"]), 3.15);
  });

  it("ignora null e valores nao numericos", () => {
    assert.strictEqual(sumAmounts([1.5, null, "abc" as unknown as string]), 1.5);
  });
});

describe("summarizeCommissions", () => {
  const rows: CommissionRow[] = [
    sale({ id: "a", confirmed_at: "2026-07-01T12:00:00.000Z", commission_amount: 10 }), // available
    sale({ id: "b", confirmed_at: "2026-07-10T12:00:00.000Z", commission_amount: 5 }), // available
    sale({ id: "c", confirmed_at: "2026-07-30T12:00:00.000Z", commission_amount: 7 }), // pending
    sale({ id: "d", confirmed_at: "2026-07-28T12:00:00.000Z", commission_amount: 3 }), // pending
    sale({ id: "e", status: "paid", commission_amount: 20 }), // paid
    sale({ id: "f", status: "cancelled", commission_amount: 99 }), // excluded
    sale({ id: "g", status: "refunded", commission_amount: 99 }), // excluded
  ];

  const s = summarizeCommissions(rows, 15, NOW);

  it("separa os tres numeros", () => {
    assert.strictEqual(s.availableTotal, 15);
    assert.strictEqual(s.availableCount, 2);
    assert.strictEqual(s.pendingTotal, 10);
    assert.strictEqual(s.pendingCount, 2);
    assert.strictEqual(s.paidTotal, 20);
    assert.strictEqual(s.paidCount, 1);
  });

  it("cancelled e refunded ficam fora de todos os totais", () => {
    assert.strictEqual(s.availableTotal + s.pendingTotal + s.paidTotal, 45);
  });

  it("availableIds lista exatamente o que o fechamento deve consumir", () => {
    assert.deepStrictEqual(s.availableIds.sort(), ["a", "b"]);
  });

  it("nextReleaseAt e a proxima liberacao entre as pendentes", () => {
    // d confirmou em 28/07 -> libera 12/08, antes de c (14/08)
    assert.strictEqual(s.nextReleaseAt, "2026-08-12T12:00:00.000Z");
  });

  it("sem pendentes, nextReleaseAt e null", () => {
    const only = summarizeCommissions([rows[0]], 15, NOW);
    assert.strictEqual(only.nextReleaseAt, null);
  });

  it("lista vazia zera tudo", () => {
    const z = summarizeCommissions([], 15, NOW);
    assert.strictEqual(z.availableTotal, 0);
    assert.strictEqual(z.pendingTotal, 0);
    assert.strictEqual(z.paidTotal, 0);
    assert.deepStrictEqual(z.availableIds, []);
    assert.strictEqual(z.nextReleaseAt, null);
  });
});

describe("availabilityCutoff", () => {
  it("volta o prazo no tempo para filtrar no banco", () => {
    assert.strictEqual(availabilityCutoff(15, NOW), "2026-07-17T12:00:00.000Z");
  });

  it("bate com bucketOf: quem confirmou no cutoff esta disponivel", () => {
    const cutoff = availabilityCutoff(15, NOW);
    assert.strictEqual(bucketOf(sale({ confirmed_at: cutoff }), 15, NOW), "available");
  });
});

describe("buildPayoutOverview", () => {
  const settings = { releaseDelayDays: 15, minPayoutAmount: 50 };

  const affiliates = [
    { id: "aff1", full_name: "Ana", email: "ana@x.com", affiliate_code: "ANA1", pix_key: "k1", pix_key_type: "cpf" },
    { id: "aff2", full_name: "Bruno", email: "bruno@x.com", affiliate_code: "BRU2", pix_key: null, pix_key_type: null },
  ];

  it("BANCO VAZIO: nenhum afiliado, nenhuma venda -> lista vazia sem erro", () => {
    const rows = buildPayoutOverview([], [], settings, NOW);
    assert.deepStrictEqual(rows, []);
  });

  it("ESTADO VAZIO: afiliado sem nenhuma venda -> tres zeros e canClose false", () => {
    const rows = buildPayoutOverview(affiliates, [], settings, NOW);
    assert.strictEqual(rows.length, 2);
    for (const row of rows) {
      assert.strictEqual(row.pendingTotal, 0);
      assert.strictEqual(row.availableTotal, 0);
      assert.strictEqual(row.paidTotal, 0);
      assert.strictEqual(row.pendingCount, 0);
      assert.strictEqual(row.availableCount, 0);
      assert.strictEqual(row.paidCount, 0);
      assert.strictEqual(row.nextReleaseAt, null);
      assert.strictEqual(row.canClose, false);
    }
  });

  it("disponivel abaixo do minimo nao habilita o fechamento", () => {
    // duas comissoes de R$0,08 liberadas, minimo R$50
    const rows = buildPayoutOverview(
      [affiliates[0]],
      [
        { ...sale({ id: "s1", commission_amount: 0.08 }), affiliate_id: "aff1" },
        { ...sale({ id: "s2", commission_amount: 0.08 }), affiliate_id: "aff1" },
      ],
      settings,
      NOW,
    );
    assert.strictEqual(rows[0].availableTotal, 0.16);
    assert.strictEqual(rows[0].canClose, false);
  });

  it("disponivel no minimo habilita o fechamento", () => {
    const rows = buildPayoutOverview(
      [affiliates[0]],
      [{ ...sale({ id: "s1", commission_amount: 50 }), affiliate_id: "aff1" }],
      settings,
      NOW,
    );
    assert.strictEqual(rows[0].canClose, true);
  });

  it("comissao dentro do prazo nao habilita fechamento mesmo acima do minimo", () => {
    const rows = buildPayoutOverview(
      [affiliates[0]],
      [
        {
          ...sale({ id: "s1", commission_amount: 500, confirmed_at: "2026-07-30T12:00:00.000Z" }),
          affiliate_id: "aff1",
        },
      ],
      settings,
      NOW,
    );
    assert.strictEqual(rows[0].pendingTotal, 500);
    assert.strictEqual(rows[0].availableTotal, 0);
    assert.strictEqual(rows[0].canClose, false);
  });

  it("venda de afiliado que nao esta na lista e ignorada", () => {
    const rows = buildPayoutOverview(
      [affiliates[0]],
      [{ ...sale({ id: "s1", commission_amount: 999 }), affiliate_id: "aff-desconhecido" }],
      settings,
      NOW,
    );
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].availableTotal, 0);
  });

  it("ordena por disponivel desc", () => {
    const rows = buildPayoutOverview(
      affiliates,
      [
        { ...sale({ id: "s1", commission_amount: 10 }), affiliate_id: "aff1" },
        { ...sale({ id: "s2", commission_amount: 80 }), affiliate_id: "aff2" },
      ],
      settings,
      NOW,
    );
    assert.strictEqual(rows[0].affiliateId, "aff2");
    assert.strictEqual(rows[1].affiliateId, "aff1");
  });

  it("nome/email nulos nao viram 'null' na tela", () => {
    const rows = buildPayoutOverview(
      [{ id: "aff3", full_name: null, email: null }],
      [],
      settings,
      NOW,
    );
    assert.strictEqual(rows[0].fullName, "");
    assert.strictEqual(rows[0].email, "");
    assert.strictEqual(rows[0].affiliateCode, null);
  });

  it("fallback de settings tem os valores documentados", () => {
    assert.strictEqual(AFFILIATE_PAYOUT_SETTINGS_FALLBACK.releaseDelayDays, 15);
    assert.strictEqual(AFFILIATE_PAYOUT_SETTINGS_FALLBACK.minPayoutAmount, 50);
  });
});

describe("meetsMinimum", () => {
  it("alcancar o minimo exato libera o fechamento", () => {
    assert.strictEqual(meetsMinimum(50, 50), true);
  });

  it("um centavo abaixo nao libera", () => {
    assert.strictEqual(meetsMinimum(49.99, 50), false);
  });

  it("nao trava por float (0.1+0.2 vs 0.3)", () => {
    assert.strictEqual(meetsMinimum(sumAmounts([0.1, 0.2]), 0.3), true);
  });

  it("as 2 comissoes de R$0,08 nao alcancam o minimo de R$50", () => {
    assert.strictEqual(meetsMinimum(sumAmounts([0.08, 0.08]), 50), false);
  });
});
