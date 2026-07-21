import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getOrderByToken,
  getOrderByIdAndEmail,
  getPaymentStatusByToken,
  getPaymentStatusByIdAndEmail,
} from "./order-status";

const ORDER_ROWS = [
  {
    id: "ord-001",
    status: "shipped",
    payment_status: "paid",
    tracking_code: "BR123456789BR",
    created_at: "2025-01-15T10:00:00Z",
    items: [
      { title: "Perfume Wella Invigo", quantity: 2, price: 734 },
      { title: "Máscara Truss Scalp", quantity: 1, price: 170.99 },
    ],
    status_history: [
      { status: "pending", at: "2025-01-15T10:00:00Z" },
      { status: "paid", at: "2025-01-15T10:05:00Z" },
      { status: "shipped", at: "2025-01-16T08:00:00Z" },
    ],
    tracking_token: "ABCD1234EFGH5678",
    customer_email: "cliente@example.com",
  },
  {
    id: "ord-002",
    status: "pending",
    payment_status: "pending",
    tracking_code: null,
    created_at: "2025-02-01T14:30:00Z",
    items: [{ title: "Shampoo LOreal", quantity: 1, price: 246 }],
    status_history: [
      { status: "pending", at: "2025-02-01T14:30:00Z" },
    ],
    tracking_token: "WXYZ9876JKLM5432",
    customer_email: "outro@example.com",
  },
];

function fakeDb(rows = ORDER_ROWS) {
  return {
    from() {
      const state = { eqs: [] as Array<[string, unknown]> };
      const builder: any = {
        select: (cols?: string) => {
          state.selectedCols = cols;
          return builder;
        },
        eq: (col: string, val: unknown) => {
          state.eqs.push([col, val]);
          return builder;
        },
        in: () => builder,
        maybeSingle: async () => {
          let filtered = [...rows];
          for (const [col, val] of state.eqs) {
            filtered = filtered.filter((r) => (r as any)[col] === val);
          }
          return { data: filtered[0] ?? null, error: null };
        },
      };
      return builder;
    },
  };
}

// ─── getOrderByToken ────────────────────────────────────────────────

test("getOrderByToken retorna dados do pedido por token válido", async () => {
  const result = await getOrderByToken(fakeDb(), "ABCD1234EFGH5678");
  assert.ok(result !== null);
  assert.equal(result!.id, "ord-001");
  assert.equal(result!.status, "shipped");
  assert.equal(result!.paymentStatus, "paid");
  assert.equal(result!.trackingCode, "BR123456789BR");
  assert.equal(result!.items.length, 2);
  assert.equal(result!.items[0].title, "Perfume Wella Invigo");
  assert.equal(result!.items[0].quantity, 2);
  assert.equal(result!.statusHistory.length, 3);
  assert.equal(result!.statusHistory[2].status, "shipped");
});

test("getOrderByToken retorna null para token inexistente", async () => {
  const result = await getOrderByToken(fakeDb(), "NONEXISTENT12345");
  assert.equal(result, null);
});

test("getOrderByToken retorna null se db der erro", async () => {
  const brokenDb = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error("db down") }),
        }),
      }),
    }),
  };
  const result = await getOrderByToken(brokenDb, "ABCD1234EFGH5678");
  assert.equal(result, null);
});

test("getOrderByToken lida com pedido sem items e sem status_history", async () => {
  const db = fakeDb([
    {
      id: "ord-003",
      status: "cancelled",
      payment_status: "refunded",
      tracking_code: null,
      created_at: "2025-03-01T09:00:00Z",
      items: null,
      status_history: null,
      tracking_token: "EMPTY1234ITEMS5678",
      customer_email: "test@test.com",
    },
  ]);
  const result = await getOrderByToken(db, "EMPTY1234ITEMS5678");
  assert.ok(result !== null);
  assert.equal(result!.items.length, 0);
  assert.equal(result!.statusHistory.length, 0);
  assert.equal(result!.trackingCode, null);
});

// ─── getOrderByIdAndEmail ───────────────────────────────────────────

test("getOrderByIdAndEmail retorna dados por orderId + email correto", async () => {
  const result = await getOrderByIdAndEmail(fakeDb(), "ord-001", "cliente@example.com");
  assert.ok(result !== null);
  assert.equal(result!.id, "ord-001");
  assert.equal(result!.status, "shipped");
});

test("getOrderByIdAndEmail retorna null para email errado (não vaza existência)", async () => {
  const result = await getOrderByIdAndEmail(fakeDb(), "ord-001", "hacker@example.com");
  assert.equal(result, null);
});

test("getOrderByIdAndEmail é case-insensitive no email", async () => {
  const result = await getOrderByIdAndEmail(fakeDb(), "ord-001", "CLIENTE@EXAMPLE.COM");
  assert.ok(result !== null);
  assert.equal(result!.id, "ord-001");
});

test("getOrderByIdAndEmail faz trim no email", async () => {
  const result = await getOrderByIdAndEmail(fakeDb(), "ord-001", "  cliente@example.com  ");
  assert.ok(result !== null);
  assert.equal(result!.id, "ord-001");
});

test("getOrderByIdAndEmail retorna null para orderId inexistente", async () => {
  const result = await getOrderByIdAndEmail(fakeDb(), "ord-999", "cliente@example.com");
  assert.equal(result, null);
});

test("getOrderByIdAndEmail retorna null se db der erro", async () => {
  const brokenDb = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error("db down") }),
        }),
      }),
    }),
  };
  const result = await getOrderByIdAndEmail(brokenDb, "ord-001", "cliente@example.com");
  assert.equal(result, null);
});

// ─── getPaymentStatusByToken ────────────────────────────────────────

test("getPaymentStatusByToken retorna status por token válido", async () => {
  const result = await getPaymentStatusByToken(fakeDb(), "ABCD1234EFGH5678");
  assert.equal(result, "paid");
});

test("getPaymentStatusByToken retorna null para token inexistente", async () => {
  const result = await getPaymentStatusByToken(fakeDb(), "NONEXISTENT12345");
  assert.equal(result, null);
});

test("getPaymentStatusByToken retorna null se db der erro", async () => {
  const brokenDb = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error("db down") }),
        }),
      }),
    }),
  };
  const result = await getPaymentStatusByToken(brokenDb, "ABCD1234EFGH5678");
  assert.equal(result, null);
});

// ─── getPaymentStatusByIdAndEmail ───────────────────────────────────

test("getPaymentStatusByIdAndEmail retorna status por id+email correto", async () => {
  const result = await getPaymentStatusByIdAndEmail(fakeDb(), "ord-001", "cliente@example.com");
  assert.equal(result, "paid");
});

test("getPaymentStatusByIdAndEmail retorna null para email errado (não vaza existência)", async () => {
  const result = await getPaymentStatusByIdAndEmail(fakeDb(), "ord-001", "hacker@example.com");
  assert.equal(result, null);
});

test("getPaymentStatusByIdAndEmail é case-insensitive", async () => {
  const result = await getPaymentStatusByIdAndEmail(fakeDb(), "ord-001", "CLIENTE@EXAMPLE.COM");
  assert.equal(result, "paid");
});

test("getPaymentStatusByIdAndEmail retorna null para orderId inexistente", async () => {
  const result = await getPaymentStatusByIdAndEmail(fakeDb(), "ord-999", "cliente@example.com");
  assert.equal(result, null);
});
