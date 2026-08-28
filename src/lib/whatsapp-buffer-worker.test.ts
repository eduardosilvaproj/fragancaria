import { test } from "node:test";
import assert from "node:assert/strict";

// Teste unitário para a lógica de agrupamento do buffer (rajadas)
test("Buffer agrupa mensagens por telefone e ordena por timestamp", async () => {
  const mensagens = [
    { phone: "5511999999999", message_id: "msg_2", body: "Como faço para trocar?", message_ts: "2026-08-28T10:00:02Z" },
    { phone: "5511999999999", message_id: "msg_1", body: "Olá, Fran!", message_ts: "2026-08-28T10:00:00Z" },
    { phone: "5511888888888", message_id: "msg_3", body: "Oi!", message_ts: "2026-08-28T10:00:01Z" },
  ];

  // Agrupa e ordena
  const processPhone = (phone: string) => {
    const msgs = mensagens
      .filter((m) => m.phone === phone)
      .sort((a, b) => new Date(a.message_ts).getTime() - new Date(b.message_ts).getTime());
    return msgs.map((m) => m.body).join(" \n");
  };

  const batch1 = processPhone("5511999999999");
  const batch2 = processPhone("5511888888888");

  assert.equal(batch1, "Olá, Fran! \nComo faço para trocar?");
  assert.equal(batch2, "Oi!");
});

test("Webhook identifica duplicatas e retorna 200 (idempotência simulada)", async () => {
  const message_ids = new Set(["msg_1"]);
  const processWebhook = (msgId: string) => {
    if (message_ids.has(msgId)) {
        return { status: 200, duplicated: true };
    }
    message_ids.add(msgId);
    return { status: 200, duplicated: false };
  };

  const res1 = processWebhook("msg_1");
  const res2 = processWebhook("msg_1");

  assert.equal(res1.duplicated, true);
  assert.equal(res2.duplicated, true);
});
