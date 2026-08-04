import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Fluxo de sugestao de imagem em lote via Serper com aprovacao humana.
//
// Por que humano no meio: busca automatica de imagem erra em catalogo de
// cosmetico — pega a linha certa mas o tamanho errado, a embalagem antiga, ou
// um produto parecido de outra marca. Entao nada vai direto pra products.images.
// O lote so PROPOE (grava candidatas em product_image_suggestions); quem aprova
// e o operador na tela de revisao.
//
// Ao aprovar, a imagem NAO e hotlinkada: e baixada e re-hospedada no Storage
// (product-images). URL de terceiro (Serper devolve links de CDN de varejista)
// quebra quando o dono troca/tira a imagem — mesmo motivo do logo do MP ter
// sido baixado em vez de apontado. Ver [[project_ml_api_auth_blocker]].

const SUGGEST_PER_PRODUCT = 6;

// Teto de ids por chamada. NAO reaproveita o 500 do enriquecimento: la o lote
// e uma consulta por produto ao ML e o gargalo e o banco; aqui cada produto e
// uma requisicao HTTP ao Serper.
//
// Medido em prod (2026-07-30): Serper responde em ~1,25s de media (pior caso
// 1,5s) e o custo total por produto fica em ~2,9s contando select + delete +
// insert no Supabase. Um bloco de 500 leva ~25min e o proxy do Railway corta
// muito antes — a chamada volta "upstream error" enquanto a server fn continua
// rodando no servidor. Foi exatamente isso que aconteceu: o cliente exibiu
// "0 processados" e o banco tinha 2964 candidatas em 494 produtos, gravadas ao
// longo de ~8min depois de o cliente ja ter desistido.
//
// 50 ids = ~2,5min de pior caso, dentro do limite do proxy com folga. O cliente
// fatia em blocos ainda menores (IMAGE_CHUNK_SIZE em admin/produtos/index.tsx)
// para o progresso avancar visivelmente; este max e so o teto defensivo.
const SUGGEST_MAX_IDS = 50;

// Sem timeout, uma unica busca pendurada consome o orcamento do bloco inteiro
// e derruba tudo no proxy. 15s e ~10x a media medida: corta o caso patologico
// sem cortar a busca so lenta.
const SERPER_TIMEOUT_MS = 15_000;

// Mesmo raciocinio para o download da imagem candidata na aprovacao.
const DOWNLOAD_TIMEOUT_MS = 15_000;

// Teto de decisoes por chamada de syncImageDecisions, e nao 100+: aprovar custa
// fetch da imagem de terceiro + upload pro Storage, ~1-2s por produto. 100 numa
// chamada dariam ~200s e o proxy do Railway corta muito antes, devolvendo
// "upstream error" enquanto o servidor segue gravando — foi o que aconteceu no
// lote do Serper. 15 = ~30s de pior caso.
const SYNC_MAX_DECISOES = 15;

const SuggestBatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(SUGGEST_MAX_IDS),
  // Pular produto que ja tem candidata pending. Ligado por padrao: com ~1210
  // produtos na fila e 2500 creditos de Serper no plano, reexecutar depois de
  // uma interrupcao nao pode regastar credito no que ja foi buscado. Passe
  // false para forcar nova busca e substituir as candidatas.
  skipComPendentes: z.boolean().optional().default(true),
});

async function searchSerperImages(query: string, num: number): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY não configurada");

  let resp: Response;
  try {
    resp = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "br", hl: "pt", num }),
      signal: AbortSignal.timeout(SERPER_TIMEOUT_MS),
    });
  } catch (e: any) {
    // TimeoutError/AbortError viram mensagem legivel: o erro cru do undici
    // ("The operation was aborted due to timeout") nao diz que foi o Serper.
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new Error(`Serper não respondeu em ${SERPER_TIMEOUT_MS / 1000}s`);
    }
    throw e;
  }

  if (!resp.ok) {
    throw new Error(`Serper respondeu ${resp.status}`);
  }

  const json = await resp.json();
  return Array.isArray(json?.images)
    ? json.images
        .map((im: { imageUrl?: string }) => im?.imageUrl)
        .filter((url: unknown): url is string => typeof url === "string" && url.length > 0)
    : [];
}

// Para cada produto do lote: monta query (marca + nome), busca no Serper e
// insere ate SUGGEST_PER_PRODUCT candidatas com status 'pending'. Antes de
// inserir, apaga as pending anteriores do mesmo produto — reexecutar o lote
// substitui as candidatas em vez de acumular.
export const suggestProductImagesBatch = createServerFn({ method: "POST" })
  .validator((d: unknown) => SuggestBatchSchema.parse(d))
  .handler(async ({ data }): Promise<{
    success: boolean;
    processed: number;
    comCandidatas: number;
    semCandidatas: number;
    candidatasInseridas: number;
    pulados: number;
    errors: string[];
  }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // product_image_suggestions ainda nao esta em types.ts do Supabase (tabela
      // nova). Mesmo padrao de store-settings.functions.ts: casta so os acessos
      // a essa tabela; products/storage seguem tipados via supabaseAdmin.
      const db = supabaseAdmin as any;

      let processed = 0;
      let comCandidatas = 0;
      let semCandidatas = 0;
      let candidatasInseridas = 0;
      let pulados = 0;
      const errors: string[] = [];

      for (const id of data.ids) {
        processed++;
        try {
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("id, name, brand")
            .eq("id", id)
            .single();

          if (!product) {
            errors.push(`ID ${id}: não encontrado`);
            continue;
          }

          // Ja tem candidata esperando revisao: nao regasta credito do Serper.
          // Importa depois de uma interrupcao — o cliente reenvia os ids que
          // nao sabe se foram processados, e sem isso a rodada seguinte pagaria
          // de novo pelo que ja estava no banco.
          if (data.skipComPendentes) {
            const { count } = await db
              .from("product_image_suggestions")
              .select("id", { count: "exact", head: true })
              .eq("product_id", id)
              .eq("status", "pending");

            if ((count ?? 0) > 0) {
              pulados++;
              continue;
            }
          }

          const query = [product.brand, product.name]
            .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
            .join(" ")
            .trim();

          if (query.length < 2) {
            errors.push(`ID ${id}: sem nome/marca para buscar`);
            semCandidatas++;
            continue;
          }

          const urls = await searchSerperImages(query, SUGGEST_PER_PRODUCT);

          // Limpa candidatas pending anteriores deste produto antes de inserir
          // as novas (reexecucao substitui, nao acumula). Approved/rejected
          // ficam como historico.
          await db
            .from("product_image_suggestions")
            .delete()
            .eq("product_id", id)
            .eq("status", "pending");

          if (urls.length === 0) {
            semCandidatas++;
            continue;
          }

          const rows = urls.slice(0, SUGGEST_PER_PRODUCT).map((image_url) => ({
            product_id: id,
            image_url,
            source: "serper",
            status: "pending",
          }));

          const { error: insertError } = await db
            .from("product_image_suggestions")
            .insert(rows);

          if (insertError) {
            errors.push(`ID ${id}: ${insertError.message}`);
            continue;
          }

          comCandidatas++;
          candidatasInseridas += rows.length;
        } catch (e: any) {
          errors.push(`ID ${id}: ${e?.message || "erro"}`);
        }
      }

      return {
        success: true,
        processed,
        comCandidatas,
        semCandidatas,
        candidatasInseridas,
        pulados,
        errors,
      };
    } catch (e: any) {
      const vazio = {
        processed: 0,
        comCandidatas: 0,
        semCandidatas: 0,
        candidatasInseridas: 0,
        pulados: 0,
      };
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, ...vazio, errors: ["Não autorizado"] };
      }
      console.error("[suggest] suggestProductImagesBatch error:", e);
      return { success: false, ...vazio, errors: [e?.message || "Erro desconhecido"] };
    }
  });

// Lista produtos que tem candidatas pending, cada um com suas candidatas.
// Agrupa no servidor para a tela renderizar "um produto por linha".
export const listPendingImageSuggestions = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    // max 150 produtos, nao 200: o PostgREST tem max-rows=1000 no servidor e
    // ignora .limit() acima disso (medido: .limit(5000) devolve 1000). Como
    // pedimos limite x SUGGEST_PER_PRODUCT linhas, 150 x 6 = 900 cabe; 200 x 6
    // seria cortado em 1000 e a tela mostraria menos produtos do que pediu,
    // sem avisar.
    z.object({ limit: z.number().int().positive().max(150).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<{
    success: boolean;
    produtos: Array<{
      productId: string;
      name: string;
      brand: string | null;
      currentImages: string[];
      candidatas: Array<{ id: string; imageUrl: string }>;
    }>;
    error?: string;
  }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      const limiteProdutos = data.limit ?? 100;

      // .limit() explicito: sem ele o PostgREST corta em 1000 linhas por conta
      // propria e a tela mostraria "so isso tem pendente" silenciosamente. Com
      // ~1210 produtos x 6 candidatas a fila passa de 7000 linhas. Pedimos
      // exatamente o teto de produtos x candidatas por produto, ordenado por
      // created_at — os mais antigos da fila primeiro.
      const { data: suggestions, error } = await db
        .from("product_image_suggestions")
        .select("id, product_id, image_url, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(limiteProdutos * SUGGEST_PER_PRODUCT);

      if (error) {
        return { success: false, produtos: [], error: error.message };
      }

      const porProduto = new Map<string, Array<{ id: string; imageUrl: string }>>();
      for (const s of (suggestions || []) as Array<{ id: string; product_id: string; image_url: string }>) {
        const arr = porProduto.get(s.product_id) || [];
        arr.push({ id: s.id, imageUrl: s.image_url });
        porProduto.set(s.product_id, arr);
      }

      const productIds = Array.from(porProduto.keys()).slice(0, data.limit ?? 100);
      if (productIds.length === 0) {
        return { success: true, produtos: [] };
      }

      const { data: products } = await supabaseAdmin
        .from("products")
        .select("id, name, brand, images")
        .in("id", productIds);

      const produtoInfo = new Map((products || []).map((p) => [p.id, p]));

      const produtos = productIds
        .map((pid) => {
          const info = produtoInfo.get(pid);
          if (!info) return null;
          return {
            productId: pid,
            name: info.name,
            brand: info.brand,
            currentImages: Array.isArray(info.images) ? info.images : [],
            candidatas: porProduto.get(pid) || [],
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return { success: true, produtos };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, produtos: [], error: "Não autorizado" };
      }
      console.error("[suggest] listPendingImageSuggestions error:", e);
      return { success: false, produtos: [], error: e?.message || "Erro desconhecido" };
    }
  });

// Baixa a imagem candidata, re-hospeda no Storage e grava a URL publica em
// products.images (na frente das existentes, virando capa). Marca a candidata
// aprovada e derruba as outras pending do mesmo produto (o operador ja escolheu).
//
// Helper compartilhado por approveImageSuggestion (um produto) e
// syncImageDecisions (lote). Retorna 'ja-feito' quando a sugestao ja esta
// approved: isso e o que faz o reenvio de um bloco ser barato depois de uma
// interrupcao — nao rebaixa a imagem nem sobe de novo pro Storage.
type ResultadoAprovacao =
  | { ok: true; jaFeito: boolean; imageUrl?: string }
  | { ok: false; error: string };

async function aprovarSugestao(
  supabaseAdmin: any,
  db: any,
  suggestionId: string,
): Promise<ResultadoAprovacao> {
  const { data: suggestion } = (await db
    .from("product_image_suggestions")
    .select("id, product_id, image_url, status")
    .eq("id", suggestionId)
    .maybeSingle()) as {
    data: { id: string; product_id: string; image_url: string; status: string } | null;
  };

  if (!suggestion) {
    return { ok: false, error: "Sugestão não encontrada" };
  }
  // Idempotente: bloco reenviado depois de "upstream error" nao reprocessa.
  if (suggestion.status === "approved") {
    return { ok: true, jaFeito: true };
  }
  if (suggestion.status !== "pending") {
    return { ok: false, error: "Sugestão já resolvida" };
  }

  // Baixa a imagem da URL de terceiro. Timeout explicito: sem ele uma URL
  // pendurada consome o orcamento do bloco inteiro e derruba tudo no proxy.
  let resp: Response;
  try {
    resp = await fetch(suggestion.image_url, {
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch (e: any) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      return {
        ok: false,
        error: `Imagem não respondeu em ${DOWNLOAD_TIMEOUT_MS / 1000}s`,
      };
    }
    return { ok: false, error: e?.message || "Falha ao baixar imagem" };
  }

  if (!resp.ok) {
    return { ok: false, error: `Falha ao baixar imagem (${resp.status})` };
  }
  const contentType = resp.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return { ok: false, error: `URL não é imagem (${contentType || "sem tipo"})` };
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  if (buffer.length === 0) {
    return { ok: false, error: "Imagem vazia" };
  }
  if (buffer.length > 10 * 1024 * 1024) {
    return { ok: false, error: "Imagem maior que 10MB" };
  }

  const extByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = extByType[contentType.split(";")[0].trim()] || "jpg";
  const rand = Math.random().toString(36).substring(2, 8);
  const filename = `products/${Date.now()}-${rand}-${suggestion.product_id}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("product-images")
    .upload(filename, buffer, { contentType, upsert: false });

  if (uploadError) {
    return { ok: false, error: `Upload falhou: ${uploadError.message}` };
  }

  const { data: urlData } = supabaseAdmin.storage
    .from("product-images")
    .getPublicUrl(filename);
  const publicUrl = urlData.publicUrl;

  // Le as imagens atuais e coloca a nova na frente (capa), sem duplicar.
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("images")
    .eq("id", suggestion.product_id)
    .single();

  const current: string[] = Array.isArray(product?.images) ? product!.images : [];
  const combined = [publicUrl, ...current.filter((u: string) => u !== publicUrl)].slice(0, 5);

  const { error: updateError } = await supabaseAdmin
    .from("products")
    .update({ images: combined })
    .eq("id", suggestion.product_id);

  if (updateError) {
    return { ok: false, error: `Falha ao gravar no produto: ${updateError.message}` };
  }

  // Marca a aprovada e derruba as outras pending do produto (superadas).
  await db
    .from("product_image_suggestions")
    .update({ status: "approved" })
    .eq("id", suggestion.id);
  await db
    .from("product_image_suggestions")
    .update({ status: "rejected" })
    .eq("product_id", suggestion.product_id)
    .eq("status", "pending");

  return { ok: true, jaFeito: false, imageUrl: publicUrl };
}

const ApproveSchema = z.object({ suggestionId: z.string().uuid() });

export const approveImageSuggestion = createServerFn({ method: "POST" })
  .validator((d: unknown) => ApproveSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      const res = await aprovarSugestao(supabaseAdmin, db, data.suggestionId);
      if (!res.ok) {
        return { success: false, error: res.error };
      }
      return { success: true, imageUrl: res.imageUrl };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[suggest] approveImageSuggestion error:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });

// Sincroniza as decisoes marcadas na tela de revisao: suggestionId preenchido
// aprova aquela candidata; null e "nenhuma serve" (rejeita as pending do
// produto). Teto por chamada: SYNC_MAX_DECISOES (ver o porque no topo).
const SyncSchema = z.object({
  decisoes: z
    .array(
      z.object({
        productId: z.string().min(1),
        // null = "nenhuma serve"
        suggestionId: z.string().uuid().nullable(),
      }),
    )
    .min(1)
    .max(SYNC_MAX_DECISOES),
});

export const syncImageDecisions = createServerFn({ method: "POST" })
  .validator((d: unknown) => SyncSchema.parse(d))
  .handler(async ({ data }): Promise<{
    success: boolean;
    aprovados: number;
    rejeitados: number;
    jaFeitos: number;
    errors: string[];
  }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      let aprovados = 0;
      let rejeitados = 0;
      let jaFeitos = 0;
      const errors: string[] = [];

      // Sequencial de proposito: cada aprovacao baixa e sobe um arquivo, e
      // paralelizar aqui multiplicaria o pico de memoria e de banda do
      // servidor sem reduzir o risco de timeout (o bloco e pequeno).
      for (const decisao of data.decisoes) {
        try {
          if (decisao.suggestionId) {
            const res = await aprovarSugestao(supabaseAdmin, db, decisao.suggestionId);
            if (!res.ok) {
              errors.push(`${decisao.productId}: ${res.error}`);
            } else if (res.jaFeito) {
              jaFeitos++;
            } else {
              aprovados++;
            }
            continue;
          }

          // "Nenhuma serve". Idempotente: se nao ha mais pending, o bloco ja
          // rodou antes (reenvio depois de interrupcao) e nao conta de novo.
          const { count } = await db
            .from("product_image_suggestions")
            .select("id", { count: "exact", head: true })
            .eq("product_id", decisao.productId)
            .eq("status", "pending");

          if ((count ?? 0) === 0) {
            jaFeitos++;
            continue;
          }

          const { error } = await db
            .from("product_image_suggestions")
            .update({ status: "rejected" })
            .eq("product_id", decisao.productId)
            .eq("status", "pending");

          if (error) {
            errors.push(`${decisao.productId}: ${error.message}`);
          } else {
            rejeitados++;
          }
        } catch (e: any) {
          errors.push(`${decisao.productId}: ${e?.message || "erro"}`);
        }
      }

      return { success: true, aprovados, rejeitados, jaFeitos, errors };
    } catch (e: any) {
      const vazio = { aprovados: 0, rejeitados: 0, jaFeitos: 0 };
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, ...vazio, errors: ["Não autorizado"] };
      }
      console.error("[suggest] syncImageDecisions error:", e);
      return { success: false, ...vazio, errors: [e?.message || "Erro desconhecido"] };
    }
  });

// "Nenhuma serve": marca todas as pending do produto como rejected. O produto
// continua sem imagem — sai da tela de revisao mas segue no universo "sem
// imagem", podendo receber novo lote de sugestoes depois.
const RejectSchema = z.object({ productId: z.string().min(1) });

export const rejectProductSuggestions = createServerFn({ method: "POST" })
  .validator((d: unknown) => RejectSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      const { error } = await db
        .from("product_image_suggestions")
        .update({ status: "rejected" })
        .eq("product_id", data.productId)
        .eq("status", "pending");

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[suggest] rejectProductSuggestions error:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });
