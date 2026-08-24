// Script pontual para listar e limpar broadcasts órfãos na Zernio (testes e rascunhos)
// Uso: node scripts/cleanup-zernio-broadcasts.mjs

import fetch from "node-fetch";

const apiKey = process.env.ZERNIO_API_KEY;
const accountId = process.env.ZERNIO_WHATSAPP_ACCOUNT_ID;
const ZERNIO_API_BASE = "https://zernio.com/api/v1";

async function run() {
  if (!apiKey) {
    console.error("ZERNIO_API_KEY não configurada no ambiente.");
    process.exit(1);
  }

  console.log("Buscando lista de broadcasts na Zernio...");
  try {
    const res = await fetch(`${ZERNIO_API_BASE}/broadcasts${accountId ? `?accountId=${accountId}` : ""}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.error(`Falha ao listar broadcasts (${res.status}):`, await res.text());
      return;
    }

    const data: any = await res.json();
    const broadcasts = Array.isArray(data) ? data : data?.broadcasts || data?.data || [];

    console.log(`Encontrados ${broadcasts.length} broadcasts.`);

    for (const b of broadcasts) {
      const id = b.id || b._id;
      const name = b.name || "Sem nome";
      if (!id) continue;

      console.log(`Deletando broadcast ${id} (${name})...`);
      const delRes = await fetch(`${ZERNIO_API_BASE}/broadcasts/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (delRes.ok) {
        console.log(` -> Broadcast ${id} deletado com sucesso.`);
      } else {
        console.warn(` -> Falha ao deletar ${id}:`, await delRes.text());
      }
    }

    console.log("Limpeza de broadcasts concluída.");
  } catch (err: any) {
    console.error("Erro ao executar limpeza de broadcasts:", err.message);
  }
}

run();
