// scripts/test-affiliate-e2e.ts
// Teste e2e em STAGING — exercita a lógica server-side de afiliados
// sem navegador e sem sandbox do Mercado Pago.
//
// Uso: npx tsx scripts/test-affiliate-e2e.ts
//
// Pré-requisitos: .env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
//
// ⚠️  NÃO RODAR AINDA — ESTE SCRIPT ESTÁ DEFASADO. A lógica de resolução de
//     afiliado embutida aqui (resolveAffiliate) e o makeWebhookDeps divergem do
//     código de produção atual. Antes de rodar, atualizar:
//     1. Usa `affiliate_tiers!inner` — inner join descarta afiliado sem tier
//        (bug corrigido em 0822b68; hoje o código usa left join).
//     2. Não considera `custom_commission_rate` — taxa negociada do afiliado é
//        ignorada (bug corrigido em bd9ef6e; precedência custom > tier > 0.08).
//     3. Não tem fallback de `affiliates.affiliate_code` — só resolve via
//        affiliate_links.code (link de indicação corrigido em 099132c).
//     4. makeWebhookDeps insere em affiliate_sales SEM `commission_base`
//        (coluna adicionada em 774eb98; sem ela o backfill/view ficam errados).
//     Enquanto esses 4 pontos não forem corrigidos, o teste valida a lógica
//     ANTIGA e vai dar falso-verde/vermelho contra o schema e o código atuais.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types";
import { handleMpWebhookRequest, type WebhookOrder } from "../src/lib/mp-webhook-handler";

// ─── Setup ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FATAL: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios no .env");
  process.exit(1);
}

// Guard de produção: este teste CRIA e APAGA dados (afiliados, links, pedidos,
// vendas). Rodar contra o projeto real (gzxlupgdmrtkprwhiutp) poluiria/apagaria
// dados de produção. Aborta imediatamente se a URL apontar para lá.
const PROD_PROJECT_REF = "gzxlupgdmrtkprwhiutp";
if (SUPABASE_URL.includes(PROD_PROJECT_REF)) {
  console.error(
    `FATAL: SUPABASE_URL aponta para PRODUÇÃO (${PROD_PROJECT_REF}). ` +
      `Este script cria e apaga dados de teste — nunca rodar em produção. ` +
      `Use um projeto de staging/local.`,
  );
  process.exit(1);
}

console.log(`🔗 Conectado a: ${SUPABASE_URL}`);
console.log(`   Ambiente: ${SUPABASE_URL.includes("staging") ? "STAGING" : SUPABASE_URL.includes("localhost") ? "LOCAL" : "⚠️  não reconhecido — confirme antes de prosseguir"}`);

const db = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

// Prefixo para identificar dados de teste
const PREFIX = "e2e-test-";
const TEST_EMAIL_AFFILIATE = `${PREFIX}affiliate@example.com`;
const TEST_EMAIL_BUYER = `${PREFIX}buyer@example.com`;
const TEST_CPF = "39053344705";

let testTierId: string | null = null;
let testAffiliateId: string | null = null;
let testLinkId: string | null = null;
let testLinkCode: string | null = null;
const createdOrderIds: string[] = [];

// ─── Lógica de resolução de afiliado (MESMA lógica de createPayment) ──────────

async function resolveAffiliate(admin: any, affiliateCode: string | undefined, payerEmail: string) {
  let resolvedAffiliateId: string | null = null;
  let resolvedAffiliateLinkId: string | null = null;
  let resolvedAffiliateCommissionRate: number | null = null;

  if (affiliateCode) {
    try {
      const { data: link } = await admin
        .from("affiliate_links")
        .select("id, affiliate_id, affiliates!inner(id, email, status, current_tier_id, affiliate_tiers!inner(commission_rate))")
        .eq("code", affiliateCode)
        .eq("is_active", true)
        .maybeSingle();
      if (link) {
        const aff = link.affiliates as any;
        if (aff?.status === "approved" || aff?.status === "active") {
          const affiliateEmail = (aff.email ?? "").toLowerCase().trim();
          const buyerEmail = payerEmail.toLowerCase().trim();
          if (affiliateEmail && affiliateEmail === buyerEmail) {
            console.warn("[resolveAffiliate] auto-indicação bloqueada", { code: affiliateCode, email: buyerEmail });
          } else {
            resolvedAffiliateLinkId = link.id;
            resolvedAffiliateId = link.affiliate_id;
            resolvedAffiliateCommissionRate = aff?.affiliate_tiers?.commission_rate ?? 0.08;
          }
        }
      }
    } catch (e) {
      console.warn("[resolveAffiliate] falha ao resolver afiliado, segue sem", e);
    }
  }

  return { resolvedAffiliateId, resolvedAffiliateLinkId, resolvedAffiliateCommissionRate };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWebhookRequest(paymentId: number) {
  return new Request("https://loja/api/public/mp-webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "payment", data: { id: paymentId } }),
  });
}

function makeWebhookDeps(order: WebhookOrder | null, payment: Record<string, unknown>) {
  return {
    webhookSecret: undefined,
    isDevelopment: true,
    now: () => new Date().toISOString(),
    log: console,
    fetchPayment: async () => payment,
    findOrderById: async (id: string) => (order && order.id === id ? order : null),
    findOrderByPaymentId: async () => order,
    updateOrder: async (orderId: string, patch: any) => {
      const { error } = await db.from("orders").update(patch).eq("id", orderId);
      if (error) throw error;
    },
    createAffiliateSale: async (params: {
      orderId: string;
      affiliateId: string;
      linkId: string | null;
      orderTotal: number;
      commissionRate: number;
      commissionBase: number;
      confirmedAt: string;
    }) => {
      const commissionAmount = Number((params.commissionBase * params.commissionRate).toFixed(2));
      const { error } = await db.from("affiliate_sales").insert({
        order_id: params.orderId,
        affiliate_id: params.affiliateId,
        link_id: params.linkId,
        order_total: params.orderTotal,
        commission_base: params.commissionBase,
        commission_rate: params.commissionRate,
        commission_amount: commissionAmount,
        status: "confirmed",
        confirmed_at: params.confirmedAt,
      });
      if (error && !error.message?.includes("duplicate key")) throw error;
    },
  };
}

async function cleanTestData() {
  for (const oid of createdOrderIds) {
    await db.from("affiliate_sales").delete().eq("order_id", oid);
    await db.from("orders").delete().eq("id", oid);
  }
  if (testLinkId) {
    await db.from("affiliate_clicks").delete().eq("link_id", testLinkId);
    await db.from("affiliate_links").delete().eq("id", testLinkId);
  }
  if (testAffiliateId) {
    await db.from("affiliate_tier_history").delete().eq("affiliate_id", testAffiliateId);
    await db.from("affiliate_notifications").delete().eq("affiliate_id", testAffiliateId);
    await db.from("affiliates").delete().eq("id", testAffiliateId);
  }
  if (testTierId) {
    await db.from("affiliate_tiers").delete().eq("id", testTierId);
  }
}

async function createTestData() {
  // Nota: slug não existe em prod (schema-baseline-20260717 não tem a coluna)
  const { data: tier, error: tierErr } = await db
    .from("affiliate_tiers")
    .insert({
      name: `${PREFIX}Bronze`,
      min_sales_amount: 0,
      commission_rate: 0.08,
      is_active: true,
    })
    .select("id")
    .single();
  if (tierErr) throw new Error(`Falha ao criar tier: ${tierErr.message}`);
  testTierId = tier.id;

  const { data: aff, error: affErr } = await db
    .from("affiliates")
    .insert({
      full_name: `${PREFIX}Afiliado Teste`,
      email: TEST_EMAIL_AFFILIATE,
      cpf: TEST_CPF,
      status: "approved",
      current_tier_id: testTierId,
      affiliate_code: `${PREFIX}CODE01`,
    })
    .select("id")
    .single();
  if (affErr) throw new Error(`Falha ao criar afiliado: ${affErr.message}`);
  testAffiliateId = aff.id;

  const { data: link, error: linkErr } = await db
    .from("affiliate_links")
    .insert({
      affiliate_id: testAffiliateId,
      code: `${PREFIX}LINK01`,
      is_active: true,
    })
    .select("id, code")
    .single();
  if (linkErr) throw new Error(`Falha ao criar link: ${linkErr.message}`);
  testLinkId = link.id;
  testLinkCode = link.code;
}

// ─── Cenários ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function report(scenario: number, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✅ Cenário ${scenario}`);
    passed++;
  } else {
    console.log(`  ❌ Cenário ${scenario}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function scenario1_happyPath() {
  console.log("\n─── Cenário 1: Caminho feliz (afiliado 8%, R$100, comprador diferente) ───");

  const resolved = await resolveAffiliate(db, testLinkCode!, TEST_EMAIL_BUYER);
  if (!resolved.resolvedAffiliateId) {
    report(1, false, "resolução retornou null — afiliado não encontrado ou bloqueado");
    return;
  }

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      status: "pending",
      payment_status: "pending",
      payment_method: "pix",
      total: 100,
      subtotal: 100,
      discount: 0,
      shipping_price: 0,
      shipping_method: "Retirada",
      items: [{ id: "test-prod-1", title: "Teste", quantity: 1, price: 100 }],
      customer_email: TEST_EMAIL_BUYER,
      customer_name: "Comprador Teste",
      customer_cpf: TEST_CPF,
      customer_phone: "(11) 99999-9999",
      shipping_address: {
        street: "Rua A", number: "10", neighborhood: "Centro",
        city: "São Paulo", state: "SP", cep: "01310100",
      },
      affiliate_id: resolved.resolvedAffiliateId,
      affiliate_link_id: resolved.resolvedAffiliateLinkId,
      affiliate_commission_rate: resolved.resolvedAffiliateCommissionRate,
    })
    .select("id, affiliate_id, affiliate_link_id, affiliate_commission_rate")
    .single();
  if (orderErr) { report(1, false, `erro ao criar pedido: ${orderErr.message}`); return; }
  createdOrderIds.push(order.id);

  const a1 = order.affiliate_id === resolved.resolvedAffiliateId;
  const a2 = order.affiliate_link_id === resolved.resolvedAffiliateLinkId;
  const a3 = order.affiliate_commission_rate === 0.08;
  if (!a1 || !a2 || !a3) {
    report(1, false, `campos: affiliate_id=${order.affiliate_id} link_id=${order.affiliate_link_id} rate=${order.affiliate_commission_rate}`);
    return;
  }

  const whOrder: WebhookOrder = {
    id: order.id,
    status: "pending",
    payment_status: "pending",
    payment_id: null,
    status_history: [],
    shipping_address: {
      street: "Rua A", number: "10", neighborhood: "Centro",
      city: "São Paulo", state: "SP", cep: "01310100",
    },
    customer_phone: "(11) 99999-9999",
    customer_cpf: TEST_CPF,
    affiliate_id: resolved.resolvedAffiliateId,
    affiliate_link_id: resolved.resolvedAffiliateLinkId,
    affiliate_commission_rate: 0.08,
    subtotal: 100,
    discount: 0,
    total: 100,
  };

  const deps = makeWebhookDeps(whOrder, {
    id: 900000001,
    status: "approved",
    status_detail: "accredited",
    external_reference: order.id,
    payment_method_id: "pix",
    payer: { email: TEST_EMAIL_BUYER },
    transaction_amount: 100,
  });

  const res = await handleMpWebhookRequest(makeWebhookRequest(900000001), deps);
  const json = await res.json();

  const { data: sales } = await db
    .from("affiliate_sales")
    .select("*")
    .eq("order_id", order.id);

  const ok = json.received === true
    && sales?.length === 1
    && sales![0].commission_amount === 8.00
    && sales![0].commission_rate === 0.08
    && sales![0].affiliate_id === resolved.resolvedAffiliateId;

  report(1, ok, ok ? undefined : JSON.stringify({ json, salesCount: sales?.length, amount: sales?.[0]?.commission_amount }));
}

async function scenario2_idempotency() {
  console.log("\n─── Cenário 2: Idempotência (reenviar mesmo webhook) ───");

  const orderId = createdOrderIds[0];
  if (!orderId) { report(2, false, "sem pedido do cenário 1"); return; }

  const { data: order } = await db
    .from("orders")
    .select("id, status, payment_status, payment_id, status_history, shipping_address, customer_phone, customer_cpf, affiliate_id, affiliate_link_id, affiliate_commission_rate, subtotal, discount, total")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) { report(2, false, "pedido não encontrado"); return; }

  const whOrder = order as unknown as WebhookOrder;
  const deps = makeWebhookDeps(whOrder, {
    id: 900000001,
    status: "approved",
    external_reference: orderId,
  });

  const res = await handleMpWebhookRequest(makeWebhookRequest(900000001), deps);
  const json = await res.json();

  // Asserção específica: COUNT direto no affiliate_sales
  const { count, error: countErr } = await db
    .from("affiliate_sales")
    .select("*", { count: "exact", head: true })
    .eq("order_id", orderId);

  if (countErr) { report(2, false, `erro no count: ${countErr.message}`); return; }

  const ok = json.deduplicated === true && count === 1;
  report(2, ok, ok ? undefined : `json.deduplicated=${json.deduplicated} count=${count}`);
}

async function scenario3_selfIndication() {
  console.log("\n─── Cenário 3: Auto-indicação (comprador com e-mail DO afiliado) ───");

  // Chama a MESMA função de resolução com o e-mail do afiliado como comprador
  const resolved = await resolveAffiliate(db, testLinkCode!, TEST_EMAIL_AFFILIATE);

  // A resolução DEVE ter bloqueado: todos os campos null
  if (resolved.resolvedAffiliateId !== null) {
    report(3, false, `resolução não bloqueou auto-indicação: affiliate_id=${resolved.resolvedAffiliateId}`);
    return;
  }

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      status: "pending",
      payment_status: "pending",
      payment_method: "pix",
      total: 100,
      subtotal: 100,
      discount: 0,
      shipping_price: 0,
      shipping_method: "Retirada",
      items: [{ id: "test-prod-1", title: "Teste", quantity: 1, price: 100 }],
      customer_email: TEST_EMAIL_AFFILIATE,
      customer_name: "Auto Indicação Teste",
      customer_cpf: TEST_CPF,
      customer_phone: "(11) 99999-9999",
      shipping_address: {
        street: "Rua A", number: "10", neighborhood: "Centro",
        city: "São Paulo", state: "SP", cep: "01310100",
      },
      affiliate_id: resolved.resolvedAffiliateId,
      affiliate_link_id: resolved.resolvedAffiliateLinkId,
      affiliate_commission_rate: resolved.resolvedAffiliateCommissionRate,
    })
    .select("id, affiliate_id, affiliate_link_id, affiliate_commission_rate")
    .single();
  if (orderErr) { report(3, false, `erro: ${orderErr.message}`); return; }
  createdOrderIds.push(order.id);

  if (order.affiliate_id !== null || order.affiliate_link_id !== null || order.affiliate_commission_rate !== null) {
    report(3, false, `campos deveriam ser null: ${JSON.stringify(order)}`);
    return;
  }

  const whOrder: WebhookOrder = {
    id: order.id,
    status: "pending",
    payment_status: "pending",
    payment_id: null,
    status_history: [],
    shipping_address: {
      street: "Rua A", number: "10", neighborhood: "Centro",
      city: "São Paulo", state: "SP", cep: "01310100",
    },
    customer_phone: "(11) 99999-9999",
    customer_cpf: TEST_CPF,
    affiliate_id: null,
    affiliate_link_id: null,
    affiliate_commission_rate: null,
    subtotal: 100,
    discount: 0,
    total: 100,
  };

  const deps = makeWebhookDeps(whOrder, {
    id: 900000002,
    status: "approved",
    external_reference: order.id,
  });

  await handleMpWebhookRequest(makeWebhookRequest(900000002), deps);

  const { data: sales } = await db
    .from("affiliate_sales")
    .select("*")
    .eq("order_id", order.id);

  const ok = !sales || sales.length === 0;
  report(3, ok, ok ? undefined : `affiliate_sales indevida: ${sales?.length}`);
}

async function scenario4_noAffiliate() {
  console.log("\n─── Cenário 4: Sem afiliado (sem affiliateCode) ───");

  // Chama a MESMA função de resolução SEM código
  const resolved = await resolveAffiliate(db, undefined, `${PREFIX}noaff@example.com`);

  // Sem código, a resolução deve retornar tudo null
  if (resolved.resolvedAffiliateId !== null) {
    report(4, false, `resolução sem código retornou affiliate_id=${resolved.resolvedAffiliateId}`);
    return;
  }

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      status: "pending",
      payment_status: "pending",
      payment_method: "pix",
      total: 50,
      subtotal: 50,
      discount: 0,
      shipping_price: 0,
      shipping_method: "Retirada",
      items: [{ id: "test-prod-2", title: "Teste 2", quantity: 1, price: 50 }],
      customer_email: `${PREFIX}noaff@example.com`,
      customer_name: "Sem Afiliado",
      customer_cpf: TEST_CPF,
      customer_phone: "(11) 99999-9999",
      shipping_address: {
        street: "Rua A", number: "10", neighborhood: "Centro",
        city: "São Paulo", state: "SP", cep: "01310100",
      },
      affiliate_id: resolved.resolvedAffiliateId,
      affiliate_link_id: resolved.resolvedAffiliateLinkId,
      affiliate_commission_rate: resolved.resolvedAffiliateCommissionRate,
    })
    .select("id")
    .single();
  if (orderErr) { report(4, false, `erro: ${orderErr.message}`); return; }
  createdOrderIds.push(order.id);

  const whOrder: WebhookOrder = {
    id: order.id,
    status: "pending",
    payment_status: "pending",
    payment_id: null,
    status_history: [],
    shipping_address: {
      street: "Rua A", number: "10", neighborhood: "Centro",
      city: "São Paulo", state: "SP", cep: "01310100",
    },
    customer_phone: "(11) 99999-9999",
    customer_cpf: TEST_CPF,
    affiliate_id: null,
    affiliate_link_id: null,
    affiliate_commission_rate: null,
    subtotal: 50,
    discount: 0,
    total: 50,
  };

  const deps = makeWebhookDeps(whOrder, {
    id: 900000003,
    status: "approved",
    external_reference: order.id,
  });

  await handleMpWebhookRequest(makeWebhookRequest(900000003), deps);

  const { data: sales } = await db
    .from("affiliate_sales")
    .select("*")
    .eq("order_id", order.id);

  const ok = !sales || sales.length === 0;
  report(4, ok, ok ? undefined : `affiliate_sales indevida: ${sales?.length}`);
}

async function scenario5_invalidCode() {
  console.log("\n─── Cenário 5: Código inválido (affiliateCode 'NAOEXISTE') ───");

  const resolved = await resolveAffiliate(db, "NAOEXISTE", `${PREFIX}invalid@example.com`);

  if (resolved.resolvedAffiliateId !== null) {
    report(5, false, `código NAOEXISTE resolveu para affiliate_id=${resolved.resolvedAffiliateId}`);
    return;
  }

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      status: "pending",
      payment_status: "pending",
      payment_method: "pix",
      total: 75,
      subtotal: 75,
      discount: 0,
      shipping_price: 0,
      shipping_method: "Retirada",
      items: [{ id: "test-prod-3", title: "Teste 3", quantity: 1, price: 75 }],
      customer_email: `${PREFIX}invalid@example.com`,
      customer_name: "Código Inválido",
      customer_cpf: TEST_CPF,
      customer_phone: "(11) 99999-9999",
      shipping_address: {
        street: "Rua A", number: "10", neighborhood: "Centro",
        city: "São Paulo", state: "SP", cep: "01310100",
      },
      affiliate_id: resolved.resolvedAffiliateId,
      affiliate_link_id: resolved.resolvedAffiliateLinkId,
      affiliate_commission_rate: resolved.resolvedAffiliateCommissionRate,
    })
    .select("id, affiliate_id, affiliate_link_id, affiliate_commission_rate")
    .single();
  if (orderErr) { report(5, false, `erro: ${orderErr.message}`); return; }
  createdOrderIds.push(order.id);

  const ok = order.affiliate_id === null
    && order.affiliate_link_id === null
    && order.affiliate_commission_rate === null;
  report(5, ok, ok ? undefined : `campos deveriam ser null: ${JSON.stringify(order)}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪 Teste e2e — Sistema de Afiliados (STAGING)");

  try {
    await cleanTestData();
    await createTestData();
    console.log("   Dados de teste criados.\n");

    await scenario1_happyPath();
    await scenario2_idempotency();
    await scenario3_selfIndication();
    await scenario4_noAffiliate();
    await scenario5_invalidCode();
  } finally {
    await cleanTestData();
    console.log("\n   Dados de teste limpos.");
  }

  console.log(`\n📊 Resultado: ${passed} passaram, ${failed} falharam\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("FATAL:", err);
  cleanTestData().catch(() => {});
  process.exit(1);
});
