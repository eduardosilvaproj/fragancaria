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

// Casa com o limite de ids que o cliente fatia por chamada (ENRICH_CHUNK_SIZE
// em admin/produtos/index.tsx). Mantido igual para o mesmo fatiamento servir os
// dois lotes.
const SuggestBatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

async function searchSerperImages(query: string, num: number): Promise<string[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY não configurada");

  const resp = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "br", hl: "pt", num }),
  });

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
    errors: string[];
  }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // product_image_suggestions ainda nao esta em database.types.ts (tabela
      // nova). Mesmo padrao de store-settings.functions.ts: casta so os acessos
      // a essa tabela; products/storage seguem tipados via supabaseAdmin.
      const db = supabaseAdmin as any;

      let processed = 0;
      let comCandidatas = 0;
      let semCandidatas = 0;
      let candidatasInseridas = 0;
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

      return { success: true, processed, comCandidatas, semCandidatas, candidatasInseridas, errors };
    } catch (e: any) {
      const vazio = { processed: 0, comCandidatas: 0, semCandidatas: 0, candidatasInseridas: 0 };
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
    z.object({ limit: z.number().int().positive().max(200).optional() }).parse(d ?? {}),
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

      const { data: suggestions, error } = await db
        .from("product_image_suggestions")
        .select("id, product_id, image_url, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

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
const ApproveSchema = z.object({ suggestionId: z.string().uuid() });

export const approveImageSuggestion = createServerFn({ method: "POST" })
  .validator((d: unknown) => ApproveSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; imageUrl?: string; error?: string }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      const { data: suggestion } = (await db
        .from("product_image_suggestions")
        .select("id, product_id, image_url, status")
        .eq("id", data.suggestionId)
        .single()) as {
        data: { id: string; product_id: string; image_url: string; status: string } | null;
      };

      if (!suggestion) {
        return { success: false, error: "Sugestão não encontrada" };
      }
      if (suggestion.status !== "pending") {
        return { success: false, error: "Sugestão já resolvida" };
      }

      // Baixa a imagem da URL de terceiro.
      const resp = await fetch(suggestion.image_url);
      if (!resp.ok) {
        return { success: false, error: `Falha ao baixar imagem (${resp.status})` };
      }
      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        return { success: false, error: `URL não é imagem (${contentType || "sem tipo"})` };
      }
      const buffer = Buffer.from(await resp.arrayBuffer());
      if (buffer.length === 0) {
        return { success: false, error: "Imagem vazia" };
      }
      if (buffer.length > 10 * 1024 * 1024) {
        return { success: false, error: "Imagem maior que 10MB" };
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
        return { success: false, error: `Upload falhou: ${uploadError.message}` };
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
      const combined = [publicUrl, ...current.filter((u) => u !== publicUrl)].slice(0, 5);

      const { error: updateError } = await supabaseAdmin
        .from("products")
        .update({ images: combined })
        .eq("id", suggestion.product_id);

      if (updateError) {
        return { success: false, error: `Falha ao gravar no produto: ${updateError.message}` };
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

      return { success: true, imageUrl: publicUrl };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[suggest] approveImageSuggestion error:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
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
