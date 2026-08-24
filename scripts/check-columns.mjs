import { createClient } from "@supabase/supabase-base";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltam variáveis do Supabase.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, cfop_devolucao_pj_dentro, cfop_devolucao_pj_fora, cfop_devolucao_pf_dentro, cfop_devolucao_pf_fora")
    .limit(10);

  if (error) {
    console.error("Erro:", error);
    process.exit(1);
  }

  console.log("Amostra de dados:", data);
}

check();
