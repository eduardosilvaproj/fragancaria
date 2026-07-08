#!/usr/bin/env node
// =============================================================
// scripts/diff-products.mjs
// =============================================================
// Compara src/data/products.ts (fonte autoritativa do ML) contra
// a tabela public.products (banco). Gera relatorio para revisao
// manual antes de qualquer promo / mudanca de preco.
//
// Saida: tabela markdown com 4 secoes:
//   1. so_no_ts      - esta no TS mas nao foi seedado no banco
//   2. so_no_banco   - esta no banco mas nao no TS (produto orfao)
//   3. preco_diverge - ambos, mas preco mudou
//   4. estoque_diverge - ambos, mas estoque mudou
//
// Uso:
//   node scripts/diff-products.mjs
//   node scripts/diff-products.mjs --json   # saida em JSON
// =============================================================

import { PRODUCTS } from '../src/data/products.ts';
import { createClient } from '@supabase/supabase-js';

const JSON_OUT = process.argv.includes('--json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function fetchAllFromDb() {
  // Paginacao manual (Supabase retorna max 1000 por padrao)
  const PAGE = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, external_ids, name, brand, price_cents, stock, in_stock_source, price_pending_validation, stock_pending_validation, source_quantity_ml')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function toBrl(cents) {
  if (cents == null) return '—';
  return `R$ ${(cents / 100).toFixed(2)}`;
}

function main() {
  return (async () => {
    console.log('🔍 Carregando TS...');
    const tsProducts = PRODUCTS;
    console.log(`   ${tsProducts.length} produtos no TS`);

    console.log('🔍 Carregando banco...');
    const dbProducts = await fetchAllFromDb();
    console.log(`   ${dbProducts.length} produtos no banco`);

    // Indexacao por MLB
    const dbByMlb = new Map();
    for (const p of dbProducts) {
      const mlb = p.external_ids?.mlb;
      if (mlb) dbByMlb.set(mlb, p);
    }

    const tsMlbs = new Set(tsProducts.map(p => p.id));

    // 1. so_no_ts
    const so_no_ts = tsProducts.filter(p => !dbByMlb.has(p.id));
    // 2. so_no_banco
    const so_no_banco = dbProducts.filter(p => !tsMlbs.has(p.external_ids?.mlb));

    // 3/4. divergencias
    const preco_diverge = [];
    const estoque_diverge = [];

    for (const tsP of tsProducts) {
      const dbP = dbByMlb.get(tsP.id);
      if (!dbP) continue;

      // Preco: TS tem em reais (price), DB tem em centavos (price_cents)
      const tsPriceCents = tsP.price ? Math.round(tsP.price * 100) : null;
      if (tsPriceCents !== dbP.price_cents) {
        preco_diverge.push({
          mlb: tsP.id,
          name: tsP.name,
          ts_price: toBrl(tsPriceCents),
          db_price: toBrl(dbP.price_cents),
          ts_original: tsP.originalPrice ? toBrl(Math.round(tsP.originalPrice * 100)) : '—',
          pending: dbP.price_pending_validation,
        });
      }

      // Estoque: TS tem quantity (number) ou inStock (bool). DB tem stock (number)
      const tsStock = tsP.quantity ?? (tsP.inStock ? 10 : 0);
      if (tsStock !== dbP.stock) {
        estoque_diverge.push({
          mlb: tsP.id,
          name: tsP.name,
          ts_stock: tsStock,
          db_stock: dbP.stock,
          pending: dbP.stock_pending_validation,
        });
      }
    }

    const report = {
      totals: {
        ts: tsProducts.length,
        db: dbProducts.length,
        so_no_ts: so_no_ts.length,
        so_no_banco: so_no_banco.length,
        preco_diverge: preco_diverge.length,
        estoque_diverge: estoque_diverge.length,
      },
      so_no_ts,
      so_no_banco,
      preco_diverge,
      estoque_diverge,
    };

    if (JSON_OUT) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    // Markdown output
    console.log('');
    console.log('# Relatorio diff: TS (data/products.ts) vs Banco (public.products)');
    console.log('');
    console.log(`- TS: **${report.totals.ts}** produtos`);
    console.log(`- DB: **${report.totals.db}** produtos`);
    console.log(`- So no TS: **${report.totals.so_no_ts}**`);
    console.log(`- So no banco: **${report.totals.so_no_banco}**`);
    console.log(`- Preco diverge: **${report.totals.preco_diverge}**`);
    console.log(`- Estoque diverge: **${report.totals.estoque_diverge}**`);
    console.log('');

    if (so_no_ts.length) {
      console.log('## 1. Produtos so no TS (faltam no banco)');
      console.log('');
      console.log('| MLB | Nome |');
      console.log('|---|---|');
      for (const p of so_no_ts.slice(0, 50)) {
        console.log(`| ${p.id} | ${p.name.substring(0, 60)} |`);
      }
      if (so_no_ts.length > 50) console.log(`| ... | +${so_no_ts.length - 50} mais |`);
      console.log('');
    }

    if (so_no_banco.length) {
      console.log('## 2. Produtos orfaos no banco (nao estao no TS)');
      console.log('');
      console.log('| DB id | MLB | Nome |');
      console.log('|---|---|---|');
      for (const p of so_no_banco.slice(0, 50)) {
        console.log(`| ${p.id} | ${p.external_ids?.mlb} | ${(p.name ?? '').substring(0, 50)} |`);
      }
      if (so_no_banco.length > 50) console.log(`| ... | ... | +${so_no_banco.length - 50} mais |`);
      console.log('');
    }

    if (preco_diverge.length) {
      console.log('## 3. Preco diverge');
      console.log('');
      console.log('| MLB | Nome | TS | DB | TS original | Pending? |');
      console.log('|---|---|---|---|---|---|');
      for (const d of preco_diverge.slice(0, 50)) {
        console.log(`| ${d.mlb} | ${d.name.substring(0, 40)} | ${d.ts_price} | ${d.db_price} | ${d.ts_original} | ${d.pending ? '⚠️ SIM' : '✓'} |`);
      }
      if (preco_diverge.length > 50) console.log(`| ... | +${preco_diverge.length - 50} mais | ... | ... | ... | ... |`);
      console.log('');
    }

    if (estoque_diverge.length) {
      console.log('## 4. Estoque diverge');
      console.log('');
      console.log('| MLB | Nome | TS qty | DB stock | Pending? |');
      console.log('|---|---|---|---|---|');
      for (const d of estoque_diverge.slice(0, 50)) {
        console.log(`| ${d.mlb} | ${d.name.substring(0, 40)} | ${d.ts_stock} | ${d.db_stock ?? '—'} | ${d.pending ? '⚠️ SIM' : '✓'} |`);
      }
      if (estoque_diverge.length > 50) console.log(`| ... | +${estoque_diverge.length - 50} mais | ... | ... | ... |`);
      console.log('');
    }

    if (so_no_ts.length === 0 && so_no_banco.length === 0 && preco_diverge.length === 0 && estoque_diverge.length === 0) {
      console.log('✅ Tudo em sincronia.');
    }
  })();
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});