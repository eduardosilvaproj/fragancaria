import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Product } from "@/data/products";

// =====================================================
// TIPOS
// =====================================================

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  images: string[];
  tags: string[];
};

type EnrichResult = {
  success: boolean;
  images?: string[];
  tags?: string[];
  error?: string;
};

// =====================================================
// GERAR TAGS AUTOMATICAMENTE
// =====================================================

function generateTags(product: Pick<ProductRow, "name" | "brand" | "category" | "tags">): string[] {
  const existingTags = product.tags || [];
  const newTags: Set<string> = new Set(existingTags.map((t) => t.toLowerCase().trim()));

  // Tags baseadas na marca
  if (product.brand) {
    newTags.add(product.brand.toLowerCase());
  }

  // Tags baseadas na categoria
  if (product.category) {
    newTags.add(product.category.toLowerCase());
  }

  // Extrair palavras-chave do nome
  const stopWords = new Set([
    "de", "da", "do", "para", "com", "em", "ml", "g", "kg", "l", " unidades",
    "kit", "refil", "original", "profissional"
  ]);

  const words = product.name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 2 && !stopWords.has(w));

  words.forEach((w) => newTags.add(w));

  // Tags específicas comuns para cosméticos
  const cosmeticTerms = ["cabelo", "tratamento", "hidratação", "reposição", "proteção", "finalização"];
  cosmeticTerms.forEach((term) => {
    if (product.name.toLowerCase().includes(term)) {
      newTags.add(term);
    }
  });

  return Array.from(newTags).slice(0, 20); // Máximo 20 tags
}

// =====================================================
// BUSCAR IMAGEM NO MERCADO LIVRE
// =====================================================

const ML_API_BASE = "https://api.mercadolibre.com";

interface MLSearchResult {
  results: Array<{
    id: string;
    title: string;
    thumbnail: string;
    pictures: Array<{ url: string }>;
    attributes: Array<{ id: string; value_name: string }>;
    price: number;
  }>;
}

interface MLProductDetail {
  id: string;
  title: string;
  pictures: Array<{ url: string }>;
  attributes: Array<{ id: string; value_name: string }>;
}

/**
 * Busca imagens de produtos similares no Mercado Livre
 * Usa a busca por termo (nome + marca) e pega a melhor imagem do primeiro resultado
 */
async function searchProductImageFromML(
  name: string,
  brand?: string | null
): Promise<{ imageUrl: string | null; mlProductId?: string }> {
  try {
    // Montar query de busca: marca + nome (primeiras 3 palavras)
    const nameWords = name.split(/\s+/).slice(0, 3).join(" ");
    const query = brand ? `${brand} ${nameWords}` : nameWords;
    const encodedQuery = encodeURIComponent(query);

    // Buscar no Mercado Livre
    const searchUrl = `${ML_API_BASE}/sites/MLB/search?q=${encodedQuery}&limit=5&sort_by=relevance`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.error(`[ML API] Search failed: ${response.status}`);
      return { imageUrl: null };
    }

    const data: MLSearchResult = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log(`[ML API] No results for query: ${query}`);
      return { imageUrl: null };
    }

    // Encontrar o melhor match - prioriza thumbnail do ML ou primeira foto disponível
    for (const item of data.results) {
      // Tenta usar thumbnail do ML (já é uma boa imagem em tamanho adequado)
      if (item.thumbnail && item.thumbnail.includes("http")) {
        // Melhora a qualidade: troca tamanho thumbnail (T) por grande (G)
        const imageUrl = item.thumbnail.replace(/-T\./, "-G.");
        return { imageUrl, mlProductId: item.id };
      }

      // Tenta primeira foto das pictures
      if (item.pictures && item.pictures.length > 0) {
        const imageUrl = item.pictures[0].url;
        if (imageUrl.includes("http")) {
          return { imageUrl, mlProductId: item.id };
        }
      }
    }

    return { imageUrl: null };
  } catch (error) {
    console.error("[ML API] Error searching:", error);
    return { imageUrl: null };
  }
}

/**
 * Busca NCM de um produto similar no Mercado Livre
 * O NCM não vem diretamente na busca, mas podemos usar a categoria do ML
 */
async function searchNCMFromML(
  name: string,
  brand?: string | null
): Promise<string | null> {
  try {
    const nameWords = name.split(/\s+/).slice(0, 3).join(" ");
    const query = brand ? `${brand} ${nameWords}` : nameWords;
    const encodedQuery = encodeURIComponent(query);

    const searchUrl = `${ML_API_BASE}/sites/MLB/search?q=${encodedQuery}&limit=3`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      return null;
    }

    const data: MLSearchResult = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    // Pega a categoria do primeiro resultado
    // O ML não fornece NCM diretamente, mas a categoria pode ajudar
    // Em uma implementação futura, poderíamos mapear categorias ML para NCMs
    const categoryId = data.results[0].attributes?.find(
      (attr) => attr.id === "PRODUCT_TYPE"
    )?.value_name;

    return categoryId || null;
  } catch (error) {
    console.error("[ML API] Error fetching NCM:", error);
    return null;
  }
}

/**
 * Wrapper principal: busca imagem no ML
 */
async function searchProductImage(name: string, brand?: string | null): Promise<string | null> {
  const result = await searchProductImageFromML(name, brand);
  return result.imageUrl;
}

/**
 * Busca imagem diretamente pelo ID do Mercado Livre
 * Útil quando o produto já tem ID do ML (como MLB...)
 */
async function searchImageByMLId(mlId: string): Promise<string | null> {
  try {
    // Verifica se é um ID válido do ML
    if (!mlId.startsWith("MLB")) {
      return null;
    }

    const response = await fetch(`${ML_API_BASE}/items/${mlId}`);

    if (!response.ok) {
      console.error(`[ML API] Item fetch failed: ${response.status}`);
      return null;
    }

    const data: MLProductDetail = await response.json();

    // Pega a melhor foto disponível
    if (data.pictures && data.pictures.length > 0) {
      // Tenta pegar a foto em maior resolução (a última geralmente é maior)
      const bestPicture = data.pictures[data.pictures.length - 1]?.url;
      if (bestPicture && bestPicture.includes("http")) {
        return bestPicture;
      }
    }

    return null;
  } catch (error) {
    console.error("[ML API] Error fetching by ID:", error);
    return null;
  }
}

// =====================================================
// SERVER FUNCTIONS
// =====================================================

// Listar produtos que precisam de enriquecimento
export const listProductsNeedingEnrichment = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ success: boolean; data: ProductRow[]; count: number }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data, error, count } = await supabaseAdmin
        .from("products")
        .select("id, name, brand, images, tags")
        .or("images.eq.{},images.is.null,tags.eq.{},tags.is.null")
        .limit(100);

      if (error) {
        return { success: false, data: [], count: 0 };
      }

      return { success: true, data: data || [], count: count || 0 };
    } catch (e: any) {
      console.error("[enrich] listProductsNeedingEnrichment error:", e);
      return { success: false, data: [], count: 0 };
    }
  });

// Enriquecer um produto específico
const EnrichProductSchema = z.object({
  id: z.string().min(1),
  fields: z.array(z.enum(["images", "tags"])).min(1),
});

export const enrichProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => EnrichProductSchema.parse(d))
  .handler(async ({ data }): Promise<EnrichResult> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Buscar produto atual
      const { data: product, error } = await supabaseAdmin
        .from("products")
        .select("id, name, brand, category, images, tags")
        .eq("id", data.id)
        .single();

      if (error || !product) {
        return { success: false, error: "Produto não encontrado" };
      }

      const updates: Record<string, unknown> = {};

      // Gerar tags se solicitado
      if (data.fields.includes("tags")) {
        const newTags = generateTags({
          name: product.name,
          brand: product.brand,
          category: product.category,
          tags: product.tags || [],
        });
        updates.tags = newTags;
      }

      // Buscar imagem se solicitado
      if (data.fields.includes("images")) {
        let imageUrl: string | null = null;

        // Primeiro tenta buscar pelo ID do ML (se o ID começar com MLB)
        if (product.id.startsWith("MLB")) {
          imageUrl = await searchImageByMLId(product.id);
        }

        // Se não encontrou pelo ID, busca por nome
        if (!imageUrl) {
          imageUrl = await searchProductImage(product.name, product.brand);
        }

        if (imageUrl) {
          updates.images = [imageUrl]; // Substitui imagens existentes com a do ML
        }
      }

      // Atualizar no banco
      const { error: updateError } = await supabaseAdmin
        .from("products")
        .update(updates)
        .eq("id", data.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        images: updates.images as string[] | undefined,
        tags: updates.tags as string[] | undefined,
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[enrich] enrichProduct error:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });

// Enriquecer múltiplos produtos em lote
const EnrichBatchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  fields: z.array(z.enum(["images", "tags"])).min(1),
});

export const enrichProductsBatch = createServerFn({ method: "POST" })
  .validator((d: unknown) => EnrichBatchSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; processed: number; updated: number; errors: string[] }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      let processed = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const id of data.ids) {
        processed++;

        try {
          // Buscar produto
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("id, name, brand, category, images, tags")
            .eq("id", id)
            .single();

          if (!product) {
            errors.push(`ID ${id}: não encontrado`);
            continue;
          }

          const updates: Record<string, unknown> = {};

          if (data.fields.includes("tags")) {
            updates.tags = generateTags({
              name: product.name,
              brand: product.brand,
              category: product.category,
              tags: product.tags || [],
            });
          }

          if (data.fields.includes("images") && (!product.images || product.images.length === 0)) {
            let imageUrl: string | null = null;

            // Primeiro tenta buscar pelo ID do ML
            if (product.id.startsWith("MLB")) {
              imageUrl = await searchImageByMLId(product.id);
            }

            // Se não encontrou pelo ID, busca por nome
            if (!imageUrl) {
              imageUrl = await searchProductImage(product.name, product.brand);
            }

            if (imageUrl) {
              updates.images = [imageUrl];
            }
          }

          if (Object.keys(updates).length > 0) {
            const { error } = await supabaseAdmin
              .from("products")
              .update(updates)
              .eq("id", id);

            if (error) {
              errors.push(`ID ${id}: ${error.message}`);
            } else {
              updated++;
            }
          }
        } catch (e: any) {
          errors.push(`ID ${id}: ${e.message}`);
        }
      }

      return { success: true, processed, updated, errors };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, processed: 0, updated: 0, errors: ["Não autorizado"] };
      }
      console.error("[enrich] enrichProductsBatch error:", e);
      return { success: false, processed: 0, updated: 0, errors: [e?.message || "Erro desconhecido"] };
    }
  });

// Atualizar NCM de um produto
const UpdateNCMSchema = z.object({
  id: z.string().min(1),
  ncm: z.string().min(4).max(10),
});

export const updateProductNCM = createServerFn({ method: "POST" })
  .validator((d: unknown) => UpdateNCMSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { error } = await supabaseAdmin
        .from("products")
        .update({ ncm: data.ncm })
        .eq("id", data.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });