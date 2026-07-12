#!/usr/bin/env node
// =============================================================
// scripts/seed-products.mjs
// =============================================================
// Popula o catalogo (public.products/categories/brands) a partir de
// src/data/products.ts. Schema: 20260711_products_catalog.sql.
//
// - Idempotente: upsert por id (products), slug (categories/brands).
// - Marcas deduplicadas por slug (L'Oreal / L'Oréal / Loreal -> loreal).
//
// Pre-requisitos:
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY no env.
//   - Migration 20260711_products_catalog.sql ja aplicada.
//
// Uso (o import de .ts exige tsx):
//   npx tsx scripts/seed-products.mjs
//   npx tsx scripts/seed-products.mjs --dry-run
// =============================================================

import { PRODUCTS, CATEGORIES, BRANDS } from '../src/data/products.ts';
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

const BATCH_SIZE = 100;

function slugify(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (combining marks)
    .toLowerCase()
    .replace(/['’]/g, '') // apostrofos ' e ' (L'Oréal -> loreal)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function productToRow(p) {
  const brandSlug = slugify(p.brand);
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? null,
    brand_slug: brandSlug || null,
    price: Number(p.price ?? 0),
    original_price: p.originalPrice ?? null,
    description: p.description ?? null,
    category: p.category ?? null,
    category_slug: p.category ?? null, // Product.category ja e slug
    subcategory: p.subcategory ?? null,
    images: p.images ?? [],
    tags: p.tags ?? [],
    in_stock: p.inStock ?? true,
    quantity: p.quantity ?? 0,
    sku: p.sku ?? null,
    featured: p.featured ?? false,
    is_new: p.isNew ?? false,
    is_active: true,
    slug: slugify(p.name) + '-' + p.id.toLowerCase(),
    external_ids: { mlb: p.id, source: 'mercado_livre' },
  };
}

async function seedCategories() {
  const rows = CATEGORIES.map((c, i) => ({
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    image: c.image ?? null,
    sort_order: i,
  }));
  if (DRY_RUN) {
    console.log(`  [dry-run] upsert ${rows.length} categorias`);
    return;
  }
  const { error } = await supabase
    .from('categories')
    .upsert(rows, { onConflict: 'slug' });
  if (error) throw new Error(`categories: ${error.message}`);
  console.log(`  ✓ ${rows.length} categorias`);
}

async function seedBrands() {
  // Dedup por slug: L'Oreal / L'Oréal / Loreal -> loreal (mantem 1o nome visto).
  const bySlug = new Map();
  for (const name of BRANDS) {
    const slug = slugify(name);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, { name, slug });
  }
  const rows = [...bySlug.values()];
  if (DRY_RUN) {
    console.log(`  [dry-run] upsert ${rows.length} marcas (de ${BRANDS.length})`);
    return;
  }
  const { error } = await supabase
    .from('brands')
    .upsert(rows, { onConflict: 'slug' });
  if (error) throw new Error(`brands: ${error.message}`);
  console.log(`  ✓ ${rows.length} marcas (dedup de ${BRANDS.length})`);
}

async function seedProducts() {
  let total = 0;
  for (let i = 0; i < PRODUCTS.length; i += BATCH_SIZE) {
    const chunk = PRODUCTS.slice(i, i + BATCH_SIZE).map(productToRow);
    if (DRY_RUN) {
      console.log(`  [dry-run] upsert ${chunk.length} produtos`);
      total += chunk.length;
      continue;
    }
    const { error } = await supabase
      .from('products')
      .upsert(chunk, { onConflict: 'id' });
    if (error) throw new Error(`products @${i}: ${error.message}`);
    total += chunk.length;
    process.stdout.write(`\r  progresso: ${total}/${PRODUCTS.length}`);
  }
  console.log(`\n  ✓ ${total} produtos`);
}

async function main() {
  console.log(`🚀 Seed do catalogo (dry-run=${DRY_RUN})`);
  console.log(`   SUPABASE_URL: ${SUPABASE_URL}\n`);
  await seedCategories();
  await seedBrands();
  await seedProducts();
  console.log('\n✅ Concluído');
}

main().catch((err) => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
