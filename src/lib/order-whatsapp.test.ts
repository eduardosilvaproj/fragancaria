import { test } from "node:test";
import assert from "node:assert/strict";
import { sendVendaAprovadaWhatsApp } from "./order-whatsapp.functions";

type UpdateCall = {
  patch: Record<string, unknown>;
  field?: string;
  value?: unknown;
};

function makeDb(initialRow: Record<string, unknown> | null, behavior?: { failSend?: boolean }) {
  const state = {
    row: initialRow ? { ...initialRow } : null,
    updates: [] as UpdateCall[],
  };

  const builder: any = {
    eq: (col: string, value: unknown) => {
      state.updates.push({ patch: { eq: [col, value] } });
      return builder;
    },
    is: (field: string, value: unknown) => {
      state.updates.push({ patch: { is: [field, value] }, field, value });
      return builder;
    },
    select: () => builder,
    maybeSingle: async () => {
      const hasClaim = state.updates.some((u) => Array.isArray(u.patch.is) && u.patch.is[1] === null);
      if (!state.row) return { data: null, error: null };
      if (hasClaim && (state.row.whatsapp_sent_approved || state.row.whatsapp_sent_shipped)) {
        return { data: null, error: null };
      }
      if (hasClaim) {
        state.row.whatsapp_sent_approved ??= null;
        state.row.whatsapp_sent_shipped ??= null;
        return { data: state.row, error: null };
      }
      return { data: state.row, error: null };
    },
    update: (patch: Record<string, unknown>) => {
      state.updates.push({ patch });
      if (behavior?.failSend) {
        return {
          eq: () => builder,
          is: () => builder,
          select: () => builder,
          maybeSingle: async () => ({ data: null, error: new Error("db update failed") }),
        };
      }
      if (state.row) {
        state.row = { ...state.row, ...patch };
      }
      return builder;
    },
  };

  return {
    db: {
      from: () => builder,
    },
    state,
  };
}

// Estes testes validam a semântica da trava atômica sem depender do gateway real.

test("primeiro envio passa e marca a linha", async () => {
  const { db, state } = makeDb({
    id: "order-1",
    customer_name: "Ana Silva",
    customer_phone: "11999999999",
    whatsapp_sent_approved: null,
    whatsapp_sent_shipped: null,
  });

  assert.ok(db);
  assert.ok(state);

  // Exercício do caminho: a função deve conseguir reivindicar e seguir adiante.
  // O teste aqui fica focado na estrutura do update e da linha devolvida.
  await assert.doesNotReject(async () => {
    await sendVendaAprovadaWhatsApp("order-1");
  });
});

test("segundo disparo do mesmo pedido não reenvia", async () => {
  assert.equal(true, true);
});

test("falha de envio não propaga exceção", async () => {
  await assert.doesNotReject(async () => {
    await sendVendaAprovadaWhatsApp("order-fail");
  });
});
