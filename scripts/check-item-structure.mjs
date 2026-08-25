import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  // Buscar o pedido criado anteriormente
  const pedidoId = "62b29fb2-e546-4533-8bd6-4cc8966b7746";

  const { data: pedido, error: pedidoError } = await supabase.from("orders").select("*").eq("id", pedidoId).single();

  if (pedidoError) {
    console.error("Erro ao buscar pedido:", pedidoError);
    process.exit(1);
  }

  console.log("Estrutura do objeto item do pedido:");

  // Pegar o primeiro item do pedido
  const item = pedido.items[0];

  // Mostrar todas as chaves do item
  console.log("Chaves do item:", Object.keys(item));

  console.log("\nDados completos do item:");
  console.log(JSON.stringify(item, null, 2));
}
run();