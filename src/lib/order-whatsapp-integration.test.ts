import { test } from "node:test";
import assert from "node:assert/strict";
import { sendPedidoEnviadoWhatsApp } from "./order-whatsapp.functions";
import { normalizePhoneToE164 } from "./zernio-whatsapp.functions";
import { __setSupabaseAdminMockForTest } from "@/integrations/supabase/client.server";

// ─── Dublê de Banco com Semântica Atômica (.is(field, null)) ────────
class MockSupabaseDb {
  rows: Map<string, any>;

  constructor(initialRows: Record<string, any>[]) {
    this.rows = new Map();
    for (const r of initialRows) {
      this.rows.set(r.id, { ...r });
    }
  }

  from(table: string) {
    let targetId: string | null = null;
    let updatePatch: Record<string, any> | null = null;
    let isFieldCheck: { field: string; value: any } | null = null;

    const builder: any = {
      update: (patch: Record<string, any>) => {
        updatePatch = patch;
        return builder;
      },
      eq: (col: string, val: any) => {
        if (col === "id") targetId = val;
        return builder;
      },
      is: (col: string, val: any) => {
        isFieldCheck = { field: col, value: val };
        return builder;
      },
      select: () => builder,
      maybeSingle: async () => {
        if (!targetId || !this.rows.has(targetId)) {
          return { data: null, error: null };
        }
        const row = this.rows.get(targetId);

        // Simula a trava atômica .is(field, null)
        if (isFieldCheck && updatePatch) {
          const { field, value } = isFieldCheck;
          if (row[field] !== value) {
            return { data: null, error: null }; // Já reivindicado
          }
          for (const [k, v] of Object.entries(updatePatch)) {
            row[k] = v;
          }
        } else if (updatePatch) {
          for (const [k, v] of Object.entries(updatePatch)) {
            row[k] = v;
          }
        }

        return { data: { ...row }, error: null };
      },
    };
    return builder;
  }
}

// Helper para configurar o ambiente de mock (fetch Zernio + db)
function setupTestEnv(initialRows: any[], fetchBehavior?: { failStep?: number; throwError?: boolean }) {
  const db = new MockSupabaseDb(initialRows);
  __setSupabaseAdminMockForTest(db);

  const originalFetch = global.fetch;
  const calls: Array<{ url: string; method: string; body?: any }> = [];
  let broadcastCounter = 200;

  (global as any).fetch = async (url: string, options: any) => {
    if (url.includes("supabase.co") || url.includes("placeholder.supabase.co")) {
      return originalFetch(url, options);
    }

    calls.push({
      url,
      method: options?.method || "GET",
      body: options?.body ? JSON.parse(options.body) : undefined,
    });

    if (fetchBehavior?.throwError) {
      throw new Error("Zernio network error");
    }

    if (url.includes("/api/v1/broadcasts") && options?.method === "POST" && !url.includes("/recipients") && !url.includes("/send")) {
      if (fetchBehavior?.failStep === 1) {
        return new Response(JSON.stringify({ error: "Step 1 failed" }), { status: 400 });
      }
      return new Response(JSON.stringify({ id: `bc-${++broadcastCounter}` }), { status: 200 });
    }

    if (url.includes("/recipients")) {
      if (fetchBehavior?.failStep === 2) {
        return new Response(JSON.stringify({ error: "Step 2 failed" }), { status: 400 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    if (url.includes("/send")) {
      if (fetchBehavior?.failStep === 3) {
        return new Response(JSON.stringify({ error: "Step 3 failed" }), { status: 500 });
      }
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response(JSON.stringify({}), { status: 200 });
  };

  process.env.ZERNIO_API_KEY = "sk_test_123";
  process.env.ZERNIO_WHATSAPP_ACCOUNT_ID = "acc_test_123";
  process.env.ZERNIO_WHATSAPP_PROFILE_ID = "prof_test_123";

  return {
    db,
    calls,
    restore: () => {
      global.fetch = originalFetch;
      __setSupabaseAdminMockForTest(null);
    },
  };
}

// ─── Testes Solicitados ─────────────────────────────────────────────

test("1. Disparo único com rastreio executa exatamente os 3 passos da Zernio e preenche whatsapp_sent_shipped", async () => {
  const env = setupTestEnv([
    {
      id: "ord-111",
      customer_name: "Ana Silva",
      customer_phone: "(16) 99715-0373",
      total: 199.9,
      whatsapp_sent_approved: "2026-08-21T10:00:00Z",
      whatsapp_sent_shipped: null,
    },
  ]);

  try {
    await sendPedidoEnviadoWhatsApp("ord-111", "BR123456789BR");

    const broadcastCalls = env.calls.filter(c => c.url.includes("/api/v1/broadcasts"));
    assert.equal(broadcastCalls.length, 3, "Deve chamar exatamente os 3 passos da Zernio");
    assert.match(broadcastCalls[0].url, /\/broadcasts$/);
    assert.match(broadcastCalls[1].url, /\/recipients$/);
    assert.match(broadcastCalls[2].url, /\/send$/);

    assert.deepEqual(broadcastCalls[1].body.phones, ["+5516997150373"]);

    const updatedRow = env.db.rows.get("ord-111");
    assert.notEqual(updatedRow.whatsapp_sent_shipped, null);
  } finally {
    env.restore();
  }
});

test("2. Idempotência: dois disparos seguidos geram APENAS UMA sequência de 3 passos", async () => {
  const env = setupTestEnv([
    {
      id: "ord-222",
      customer_name: "Carlos Dias",
      customer_phone: "11999998888",
      total: 89.9,
      whatsapp_sent_approved: "2026-08-21T10:00:00Z",
      whatsapp_sent_shipped: null,
    },
  ]);

  try {
    await sendPedidoEnviadoWhatsApp("ord-222", "BR987654321BR");
    const countAfterFirst = env.calls.filter(c => c.url.includes("/api/v1/broadcasts")).length;
    assert.equal(countAfterFirst, 3);

    await sendPedidoEnviadoWhatsApp("ord-222", "BR987654321BR");
    const countAfterSecond = env.calls.filter(c => c.url.includes("/api/v1/broadcasts")).length;

    assert.equal(countAfterSecond, 3, "Segundo disparo não deve chamar a Zernio novamente");
  } finally {
    env.restore();
  }
});

test("3. Sem rastreio não envia: pedido sem tracking_code não chama Zernio e deixa trava null", async () => {
  const env = setupTestEnv([
    {
      id: "ord-333",
      customer_name: "Beatriz Lima",
      customer_phone: "11988887777",
      total: 120.0,
      whatsapp_sent_approved: null,
      whatsapp_sent_shipped: null,
    },
  ]);

  try {
    await sendPedidoEnviadoWhatsApp("ord-333", "");

    const broadcastCalls = env.calls.filter(c => c.url.includes("/api/v1/broadcasts"));
    assert.equal(broadcastCalls.length, 0, "Nenhuma chamada à Zernio deve ser feita sem rastreio");

    const row = env.db.rows.get("ord-333");
    assert.equal(row.whatsapp_sent_shipped, null, "Trava deve permanecer null para permitir envio posterior quando houver rastreio");
  } finally {
    env.restore();
  }
});

test("4. Falha de envio limpa a trava: se a API falhar, whatsapp_sent_shipped volta a null", async () => {
  const env = setupTestEnv([
    {
      id: "ord-444",
      customer_name: "Marcos Rocha",
      customer_phone: "11977776666",
      total: 250.0,
      whatsapp_sent_approved: null,
      whatsapp_sent_shipped: null,
    },
  ], { failStep: 3 });

  try {
    await sendPedidoEnviadoWhatsApp("ord-444", "BR111222333BR");

    const row = env.db.rows.get("ord-444");
    assert.equal(row.whatsapp_sent_shipped, null, "Trava deve voltar a null após falha no envio para permitir retry");
  } finally {
    env.restore();
  }
});

test("5. Normalização de telefone: formato do banco '(16) 99715-0373' vira '+5516997150373'", () => {
  const raw = "(16) 99715-0373";
  const normalized = normalizePhoneToE164(raw);
  assert.equal(normalized, "+5516997150373");
});
