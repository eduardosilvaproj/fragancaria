#!/usr/bin/env node
// =============================================================
// scripts/seed-products.mjs
// =============================================================
// Seed idempotente dos 434 produtos vindos de src/data/products.ts
// para a tabela canonical public.products (definida em
// 20260707_canonical_products.sql - aplicada via SQL Editor).
//
// Comportamento:
//   - Para cada produto:
//     - INSERT com ON CONFLICT (external_ids->>'mlb') DO UPDATE.
//     - Marca price_pending_validation=true e
//       stock_pending_validation=true para revisao manual.
//     - external_ids jsonb guarda o ID ML (mlb), sku, e o id interno.
//   - Idempotente: rodar 2x nao duplica.
//
// Pre-requisitos:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY no env
//     (carregados via .env se usar dotenv, ou export antes).
//   - Tabela public.products ja criada.
//   - Campo products.external_ids precisa ser jsonb com GIN index.
//
// Uso:
//   node scripts/seed-products.mjs
//   node scripts/seed-products.mjs --dry-run   # nao grava, so mostra
// =============================================================

import { PRODUCTS } from '../src/data/products.ts';
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const BATCH_SIZE = 50;

function toRow(p) {
  return {
    // external_ids: chave canonica de upsert
    external_ids: {
      mlb: p.id,
      sku: p.sku ?? null,
      source: 'mercado_livre',
    },
    name: p.name,
    brand: p.brand,
    description: p.description,
    category: p.category,
    subcategory: p.subcategory ?? null,
    images: p.images ?? [],
    tags: p.tags ?? [],
    // Preco e estoque: NAO confiar nos valores do ML.
    // Manter pending_validation para revisao humana.
    price_cents: null,
    original_price_cents: null,
    stock: null,
    price_pending_validation: true,
    stock_pending_validation: true,
    featured: p.featured ?? false,
    is_new: p.isNew ?? false,
    in_stock_source: p.inStock ?? true,
    // Metadata
    source_quantity_ml: p.quantity ?? null,
  };
}

async function upsertBatch(batch) {
  // ON CONFLICT no campo jsonb external_ids->>'mlb'.
  // Supabase JS client nao expoe ON CONFLICT direto, entao usamos
  // upsert com constraintName se disponivel, OU fazemos
  // SELECT+INSERT/UPDATE manual.
  //
  // Como nao temos certeza do nome do unique constraint, usamos
  // estrategia segura: SELECT existing, INSERT novos, UPDATE
  // existentes com patch.
  const mlbIds = batch.map(r => r.external_ids.mlb);

  const { data: existing, error: selErr } = await supabase
    .from('products')
    .select('id, external_ids')
    .in('external_ids->>mlb', mlbIds);

  if (selErr) throw selErr;

  const existingByMlb = new Map(
    (existing ?? []).map(row => [row.external_ids?.mlb, row.id])
  );

  const toInsert = batch.filter(r => !existingByMlb.has(r.external_ids.mlb));
  const toUpdate = batch.filter(r => existingByMlb.has(r.external_ids.mlb));

  let insCount = 0, updCount = 0;

  // INSERT novos (em chunks para evitar payload gigante)
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE);
    if (DRY_RUN) {
      console.log(`  [dry-run] INSERT ${chunk.length} novos produtos`);
      insCount += chunk.length;
      continue;
    }
    const { error } = await supabase.from('products').insert(chunk);
    if (error) throw new Error(`INSERT failed: ${error.message}`);
    insCount += chunk.length;
  }

  // UPDATE existentes: atualiza apenas campos que SEMPRE sao
  // sobrescritos do TS. Mantem price_cents/stock (validados).
  for (const row of toUpdate) {
    const { external_ids, ...patch } = row;
    // patch nao inclui external_ids (imutavel), price_cents, stock.
    // Apenas metadata e source.
    const safePatch = {
      name: patch.name,
      brand: patch.brand,
      description: patch.description,
      category: patch.category,
      subcategory: patch.subcategory,
      images: patch.images,
      tags: patch.tags,
      featured: patch.featured,
      is_new: patch.is_new,
      in_stock_source: patch.in_stock_source,
      source_quantity_ml: patch.source_quantity_ml,
      // NAO mexer em price_cents, stock, price_pending_validation,
      // stock_pending_validation - sao validados manualmente.
    };
    if (DRY_RUN) {
      console.log(`  [dry-run] UPDATE ${row.external_ids.mlb}`);
      updCount++;
      continue;
    }
    const { error } = await supabase
      .from('products')
      .update(safePatch)
      .eq('id', existingByMlb.get(row.external_ids.mlb));
    if (error) throw new Error(`UPDATE failed for ${row.external_ids.mlb}: ${error.message}`);
    updCount++;
  }

  return { inserted: insCount, updated: updCount };
}

async function main() {
  console.log(`🚀 Seed de ${PRODUCTS.length} produtos (dry-run=${DRY_RUN})`);
  console.log(`   SUPABASE_URL: ${SUPABASE_URL}`);
  console.log('');

  let totalIns = 0, totalUpd = 0;
  const start = Date.now();

  for (let i = 0; i < PRODUCTS.length; i += BATCH_SIZE) {
    const batch = PRODUCTS.slice(i, i + BATCH_SIZE).map(toRow);
    const { inserted, updated } = await upsertBatch(batch);
    totalIns += inserted;
    totalUpd += updated;
    const pct = Math.round(((i + batch.length) / PRODUCTS.length) * 100);
    process.stdout.write(`\r   progresso: ${pct}% (${i + batch.length}/${PRODUCTS.length}) ins=${totalIns} upd=${totalUpd}`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('');
  console.log('');
  console.log(`✅ Concluído em ${elapsed}s`);
  console.log(`   inseridos: ${totalIns}`);
  console.log(`   atualizados: ${totalUpd}`);
  console.log(`   total no banco: ${totalIns + totalUpd}`);
  console.log('');
  console.log('⚠️  Todos os produtos foram marcados com');
  console.log('   price_pending_validation=true e stock_pending_validation=true.');
  console.log('   Rodar diff-products.mjs e revisar manualmente antes de liberar venda.');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});