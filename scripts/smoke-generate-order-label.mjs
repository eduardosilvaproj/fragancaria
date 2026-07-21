#!/usr/bin/env node
// Smoke REAL do PR B + fix de documento PJ.
// Prova que o remetente PJ real (CNPJ em company_document, via
// buildContatoFromSender roteando por tamanho) é aceito pela API sandbox —
// o 422 "from.document deve ter um CPF válido" tem que sumir.
//
// Chama o MESMO núcleo compartilhado que o server function usa em produção
// (runGenerateOrderLabelCore), com o sender_info REAL do banco (sem override).
//
// UMA RODADA SÓ — cuidado com saldo sandbox.
//
// Uso: npx tsx --env-file=.env scripts/smoke-generate-order-label.mjs

import { createClient } from "@supabase/supabase-js";
import { comprarEtiqueta } from "../src/lib/melhor-envio-client.server.ts";
import { runGenerateOrderLabelCore } from "../src/lib/generate-order-label-core.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}
if (!process.env.MELHOR_ENVIO_SANDBOX_URL || !process.env.MELHOR_ENVIO_SANDBOX_TOKEN) {
  console.error("Sandbox não configurado (MELHOR_ENVIO_SANDBOX_URL/TOKEN).");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const PRODUCT_ID = "MLB68928714"; // kit ativo com peso/dimensões
const SERVICE_ID = 1; // PAC (validado no smoke do PR A)

let debitCount = 0;
const comprarInstrumentado = async (input) => {
  debitCount += 1;
  const doc = input.from?.document ? "document(CPF)" : "";
  const cnpj = input.from?.company_document ? "company_document(CNPJ)" : "";
  console.log(
    `\n[comprar] CHAMADA #${debitCount} — debita saldo sandbox (serviceId=${input.serviceId}, from usa: ${[doc, cnpj].filter(Boolean).join("+") || "nenhum"})`,
  );
  return comprarEtiqueta(input);
};

async function seedOrder() {
  const { data: product, error: prodErr } = await db
    .from("products")
    .select("id, name, price")
    .eq("id", PRODUCT_ID)
    .single();
  if (prodErr || !product) {
    throw new Error(`Produto ${PRODUCT_ID} não encontrado: ${prodErr?.message}`);
  }

  const { data: order, error } = await db
    .from("orders")
    .insert({
      status: "processing",
      payment_status: "approved",
      payment_method: "pix",
      payment_id: `SMOKE-LABEL-${Date.now()}`,
      subtotal: Number(product.price),
      discount: 0,
      shipping_price: 18.54,
      total: Number(product.price) + 18.54,
      items: [{ id: product.id, title: product.name, quantity: 1, price: Number(product.price) }],
      customer_name: "Cliente Smoke Label",
      customer_email: "smoke.label@fragranciaria.com",
      customer_cpf: "12345678909",
      customer_phone: "11999998888",
      shipping_service_id: SERVICE_ID,
      shipping_service_name: "Correios • PAC",
      shipping_quoted_cents: 1854,
      shipping_charged_cents: 1854,
      shipping_method: "Correios • PAC",
      shipping_address: {
        street: "Avenida Paulista",
        number: "1000",
        complement: "",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
        zipCode: "01310100",
        cep: "01310100",
      },
      tracking_token: `SMOKELABEL${Date.now()}`.slice(0, 16),
    })
    .select("id")
    .single();
  if (error || !order) {
    throw new Error(`Falha ao seedar pedido: ${error?.message}`);
  }
  return order.id;
}

async function cleanup(orderId) {
  await db.from("shipping_quotes").delete().eq("order_id", orderId);
  await db.from("orders").delete().eq("id", orderId);
}

async function main() {
  // Mostra o formato do sender_info REAL (só o shape, não o número).
  const { data: senderRow } = await db
    .from("shipping_settings")
    .select("value")
    .eq("key", "sender_info")
    .maybeSingle();
  const senderDigits = String(senderRow?.value?.document ?? "").replace(/\D/g, "");
  console.log(
    `[sender real] document: ${senderDigits.length} dígitos → ${senderDigits.length === 14 ? "CNPJ (vai em company_document)" : senderDigits.length === 11 ? "CPF (vai em document)" : "desconhecido"}`,
  );

  const orderId = await seedOrder();
  console.log(`[seed] pedido de teste: ${orderId} (shipping_service_id=${SERVICE_ID})`);

  try {
    console.log("\n=== RODADA ÚNICA (remetente PJ real, CNPJ em company_document) ===");
    const r1 = await runGenerateOrderLabelCore(db, orderId, comprarInstrumentado);
    console.log("[resultado]", JSON.stringify(r1, null, 2));

    console.log("\n=== VEREDITO ===");
    if (r1.success) {
      console.log("PROVA OK: PJ com CNPJ em company_document foi ACEITO — 422 sumiu.");
      console.log(`  shipment_id_external: ${r1.data.shipment_id_external}`);
      console.log(`  label_url: ${r1.data.label_url}`);
      console.log(`  tracking_code: ${r1.data.tracking_code ?? "null (entra depois)"}`);
    } else {
      console.log(`FALHA: API ainda rejeitou. Erro real:\n  ${r1.error}`);
      process.exitCode = 1;
    }
  } finally {
    await cleanup(orderId);
    console.log(`\n[cleanup] pedido ${orderId} e shipping_quotes removidos.`);
  }
}

main().catch((error) => {
  console.error("\n[erro]", error instanceof Error ? error.message : error);
  process.exit(1);
});
