#!/usr/bin/env npx tsx
/**
 * Seed script para migrar produtos do arquivo estático para o banco.
 * Usage: npx tsx scripts/seed-products.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Importar dados estáticos
const { PRODUCTS, CATEGORIES } = await import("../src/data/products");

async function seed() {
  console.log("Starting product seed...\n");

  // 1. Seed categorias
  console.log(`Seeding ${CATEGORIES.length} categories...`);
  const categoriesToInsert = CATEGORIES.map((cat, index) => ({
    id: cat.id === "1" ? undefined : cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || null,
    sort_order: index,
  }));

  const { error: catsError } = await supabase.from("categories").upsert(categoriesToInsert, {
    onConflict: "slug",
  });

  if (catsError) {
    console.error("Error seeding categories:", catsError);
  } else {
    console.log("Categories seeded successfully.");
  }

  // 2. Seed produtos
  console.log(`\nSeeding ${PRODUCTS.length} products...`);
  let successCount = 0;
  let errorCount = 0;

  // Processar em batches de 50
  const batchSize = 50;
  for (let i = 0; i < PRODUCTS.length; i += batchSize) {
    const batch = PRODUCTS.slice(i, i + batchSize);
    const productsToInsert = batch.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand || null,
      brand_slug: product.brand?.toLowerCase().replace(/\s+/g, "-") || null,
      price: product.price,
      original_price: product.originalPrice || null,
      description: product.description || null,
      category: product.category || null,
      category_slug: product.category || null,
      subcategory: product.subcategory || null,
      images: product.images || [],
      tags: product.tags || [],
      in_stock: product.inStock,
      quantity: product.quantity || 0,
      sku: product.sku || null,
      featured: product.featured || false,
      is_new: product.isNew || false,
      slug: product.id, // Usar ID como slug temporário
    }));

    const { error } = await supabase.from("products").upsert(productsToInsert, {
      onConflict: "id",
    });

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(PRODUCTS.length / batchSize)}: OK`);
    }
  }

  console.log(`\n=== Seed Complete ===`);
  console.log(`Products: ${successCount} inserted, ${errorCount} errors`);
  console.log(`Categories: ${CATEGORIES.length} processed`);

  // Verificar resultado
  const { count } = await supabase.from("products").select("*", { count: "exact", head: true });
  console.log(`Total products in database: ${count}`);
}

seed().catch(console.error);