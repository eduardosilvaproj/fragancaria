import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  // Verificar colunas de CFOP na tabela products
  const { data: product, error } = await supabase.from("products").select("*").limit(1);
  if (error) {
    console.error("Erro:", error);
    process.exit(1);
  }
  console.log("Colunas do produto (sample):", Object.keys(product[0] || {}).filter(k => k.includes("cfop")).join(", "));

  // Verificar também order_items via info schema
  const { data: order, error2 } = await supabase.from("orders").select("items").limit(1);
  if (error2) {
    console.error("Erro:", error2);
    process.exit(1);
  }
  const firstItem = order.items?.[0];
  if (firstItem) {
    console.log("Chaves do item do pedido:", Object.keys(firstItem || {}).filter(k => k.includes("cfop")).join(", "));
  }
}
run();