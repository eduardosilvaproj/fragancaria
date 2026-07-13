import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// =====================================================
// TIPOS
// =====================================================

type ProductRow = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  images: string[];
  tags: string[];
};

type EnrichResult = {
  success: boolean;
  images?: string[];
  tags?: string[];
  dimensions?: {
    weight_grams: number | null;
    height_cm: number | null;
    width_cm: number | null;
    length_cm: number | null;
  };
  error?: string;
};

// =====================================================
// GERAR TAGS AMPLIADAS
// =====================================================

function generateTags(product: Pick<ProductRow, "name" | "brand" | "category" | "tags">): string[] {
  const existingTags = product.tags || [];
  const newTags: Set<string> = new Set(existingTags.map((t) => t.toLowerCase().trim()));

  // Tags baseadas na marca
  if (product.brand) {
    newTags.add(product.brand.toLowerCase());
    // Variações da marca
    const brandLower = product.brand.toLowerCase();
    if (!newTags.has(brandLower)) newTags.add(brandLower);
  }

  // Tags baseadas na categoria
  if (product.category) {
    newTags.add(product.category.toLowerCase());
    // Variações da categoria
    const cat = product.category.toLowerCase();
    if (cat === "shampoos") {
      newTags.add("shampoo");
      newTags.add("lavagem");
      newTags.add("limpeza");
    } else if (cat === "condicionadores") {
      newTags.add("condicionador");
      newTags.add("hidratação");
    } else if (cat === "mascaras") {
      newTags.add("máscara");
      newTags.add("tratamento");
      newTags.add("reposição");
    } else if (cat === "leave-in") {
      newTags.add("leave in");
      newTags.add("sem enxágue");
      newTags.add("finalização");
    } else if (cat === "coloracao") {
      newTags.add("coloração");
      newTags.add("tintura");
      newTags.add("pintura");
    } else if (cat === "maquiagem") {
      newTags.add("make");
      newTags.add("beleza");
    }
  }

  // Stop words mais completas
  const stopWords = new Set([
    "de", "da", "do", "das", "dos", "para", "com", "em", "no", "na", "nos", "nas",
    "ml", "g", "kg", "l", "unidades", "und", "peça", "pç",
    "kit", "kits", "refil", "original", "profissional", "profissional",
    "nano", "plus", "max", "ultra", "super", "premium", "gold", "silver",
    "e", "o", "a", "os", "as", "um", "uma", "uns", "umas",
    "tipo", "linha", "série", "versão", "cor", "tom",
    "ml", "-", "/", "(", ")", "[", "]", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"
  ]);

  // Extrair palavras-chave do nome com mais inteligência
  const words = product.name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\s]/g, ""))
    .filter((w) => w.length > 2 && !stopWords.has(w));

  words.forEach((w) => newTags.add(w));

  // Termos de cosméticos expandidos
  const cosmeticTerms: Record<string, string[]> = {
    // Cabelo
    "cabelo": ["cabelos", "fios", "mechas"],
    "hidratação": ["hidratar", "hidratante", "úmido", "nutrição"],
    "reposição": ["repor", "reposição", "reconstrói", "reconstrução"],
    "tratamento": ["tratar", "cuidado", "terapia", "repair"],
    "reparação": ["reparar", "corrigir", "restauração"],
    "proteção": ["proteger", "proteção", "guardar", "escudo"],
    "finalização": ["finalizar", "acabamento", "styling"],
    "antifrizz": ["anti-frizz", "anti frizz", "antifriz"],
    "queda": ["queda", "fortalecimento", "queda", "anti-queda"],
    "cronograma": ["cronograma capilar", "rotina", "dias"],
    "lowell": ["lowell", "linha lowell"],
    "truss": ["truss", "linha truss"],
    "loreal": ["l'oreal", "loreal", "lóreal", "loregal", "l'oréal"],
    "wella": ["wella", "linha wella"],
    "botox": ["botox capilar", "reconstrução"],
    "queratina": ["queratina", "keratina", "cisteína"],
    "arginina": ["arginina", "aminoácido"],

    // Maquiagem
    "base": ["base facial", "make base", "cobertura"],
    "batom": ["lábios", "boca", "labial"],
    "blush": ["bochecha", "maçã do rosto", "rubor"],
    "delineador": ["olho", "linha", "gatinho"],
    "sombra": ["olhos", "paleta", "cores"],
    "rimel": ["cílios", "mascara", "volume"],
    "pó": ["powder", "finishing", "定妆"],

    // Tipos de produto
    "shampoo": ["lavagem", "cleanse", "xampu"],
    "condicionador": ["cond", "after", "detangler"],
    "máscara": ["mask", "ampola", "tratamento intensivo"],
    "leave-in": ["sem enxágue", "creme para pentear", "milk"],
    "óleo": ["oil", "serum", "elixir"],
    "serum": [" Ampola", "concentrado", "intensivo"],
    "pomada": ["wax", "pasta", "fixação"],
    "gel": ["gelatina", " efecto", "moldar"],
    "mousse": ["espuma", "volume", "body"],
    "spray": ["aerossol", "jato", "fixação"],

    // Ingredientes/Fragrâncias
    "mirtilo": ["blueberry", "antioxidante", "frutas"],
    "coco": ["coconut", "tropical", "hydrating"],
    "morango": ["strawberry", "frutas vermelhas"],
    "floral": ["flor", "bouquet", "perfume"],
    "doce": ["sweet", "açucarado", "gourmet"],
    "lavanda": ["lavender", "calmante", "relaxante"],
    "baunilha": ["vanilla", "doce", "aconchegante"],
    "âmbar": ["amber", "quente", "oriental"],
    "rosa": ["rose", "romântico", "floral"],

    // Benefícios
    "brilho": ["brilhante", "luminoso", "glossy"],
    "maciez": ["macio", "suave", "sedoso"],
    "força": ["forte", "resistente", "power"],
    "volume": ["volumoso", "cheio", "body"],
    "lisura": ["liso", "liss", "alinhado"],
    "definição": ["definido", "cacheado", "ondulado"],

    // Problemas
    "oleoso": ["oleosidade", "engordurado", "brilhante"],
    "ressecado": ["ressecamento", "seco", "desidratado"],
    "danificado": ["dano", "quebradiço", "quebrado"],
  };

  // Verificar cada termo e adicionar variações
  const nameLower = product.name.toLowerCase();
  Object.entries(cosmeticTerms).forEach(([term, variations]) => {
    if (nameLower.includes(term)) {
      newTags.add(term);
      variations.forEach((v) => newTags.add(v));
    }
  });

  // Adicionar tags genéricas úteis
  newTags.add("cosmético");
  newTags.add("beleza");
  newTags.add("capilar");
  if (product.category?.toLowerCase().includes("cabelo") ||
      ["shampoos", "condicionadores", "mascaras", "leave-in"].includes(product.category?.toLowerCase() || "")) {
    newTags.add("cabelo");
    newTags.add("cosmético capilar");
    newTags.add("tratamento capilar");
  }
  if (product.category?.toLowerCase().includes("maquiagem")) {
    newTags.add("maquiagem");
    newTags.add("make");
  }

  return Array.from(newTags).slice(0, 25); // Máximo 25 tags
}

// =====================================================
// BUSCAR DADOS NO MERCADO LIVRE
// =====================================================

const ML_API_BASE = "https://api.mercadolibre.com"; // API oficial ML (todos os países, site MLB = Brasil)

interface MLItem {
  id: string;
  title: string;
  thumbnail: string;
  pictures: Array<{ url: string }>;
  attributes: Array<{ id: string; value_name: string }>;
  dimensions: {
    height: string | null;
    width: string | null;
    depth: string | null;
  };
  weight: string | null;
}

interface MLSearchResult {
  results: Array<{
    id: string;
    title: string;
    thumbnail: string;
    pictures: Array<{ url: string }>;
    attributes: Array<{ id: string; value_name: string }>;
    dimensions: {
      height: string | null;
      width: string | null;
      depth: string | null;
    };
    weight: string | null;
  }>;
}

/**
 * Estima dimensões baseado na categoria do produto
 * Usado quando a API do ML não retorna dados de dimensões
 */
function estimateDimensionsByCategory(
  category: string | null,
  name: string
): { weight: number; height: number; width: number; length: number } {
  const catLower = (category || "").toLowerCase();
  const nameLower = name.toLowerCase();

  // Dimensões padrão por categoria (em cm e gramas)
  const defaults: Record<string, { weight: number; height: number; width: number; length: number }> = {
    // Cabelo
    shampoos: { weight: 350, height: 20, width: 8, length: 8 },
    "shampoo": { weight: 350, height: 20, width: 8, length: 8 },
   condicionadores: { weight: 400, height: 22, width: 8, length: 8 },
    "condicionador": { weight: 400, height: 22, width: 8, length: 8 },
    mascaras: { weight: 300, height: 15, width: 10, length: 10 },
    "máscara": { weight: 300, height: 15, width: 10, length: 10 },
    "leave-in": { weight: 250, height: 18, width: 6, length: 6 },
    finalizadores: { weight: 200, height: 15, width: 6, length: 6 },
    coloracao: { weight: 150, height: 12, width: 6, length: 6 },
    "tintura": { weight: 150, height: 12, width: 6, length: 6 },

    // Maquiagem
    maquiagem: { weight: 100, height: 10, width: 5, length: 5 },
    "base": { weight: 80, height: 8, width: 5, length: 3 },
    batom: { weight: 30, height: 8, width: 2, length: 2 },
    blush: { weight: 50, height: 6, width: 5, length: 3 },
    sombra: { weight: 40, height: 5, width: 8, length: 5 },
    delineador: { weight: 25, height: 13, width: 2, length: 2 },
  };

  // Primeiro tenta encontrar categoria exata
  for (const [key, values] of Object.entries(defaults)) {
    if (catLower.includes(key)) {
      return values;
    }
  }

  // Depois tenta encontrar no nome
  for (const [key, values] of Object.entries(defaults)) {
    if (nameLower.includes(key)) {
      return values;
    }
  }

  // Padrão geral para cosméticos
  return { weight: 250, height: 15, width: 7, length: 7 };
}

/**
 * Busca dados completos de um produto no Mercado Livre pelo ID
 */
async function fetchMLProductData(mlId: string): Promise<{
  imageUrl: string | null;
  allImages: string[];
  weight: number | null;
  height: number | null;
  width: number | null;
  length: number | null;
  category?: string;
} | null> {
  try {
    if (!mlId.startsWith("MLB")) {
      return null;
    }

    const response = await fetch(`${ML_API_BASE}/items/${mlId}`);

    if (!response.ok) {
      console.error(`[ML API] Item fetch failed: ${response.status}`);
      return null;
    }

    const data: MLItem = await response.json();

    // Extrair TODAS as imagens em alta qualidade
    const allImages: string[] = [];
    let imageUrl: string | null = null;

    if (data.pictures && data.pictures.length > 0) {
      data.pictures.forEach((pic) => {
        // ML substitui -T por -G para alta qualidade
        const highRes = pic.url.replace(/-T\./, "-G.");
        allImages.push(highRes);
      });
      // Primeira imagem como principal
      imageUrl = allImages[0];
    } else if (data.thumbnail) {
      imageUrl = data.thumbnail.replace(/-T\./, "-G.");
      allImages.push(imageUrl);
    }

    // Extrair dimensões do atributo ou diretamente
    let height: number | null = null;
    let width: number | null = null;
    let length: number | null = null;
    let weight: number | null = null;

    // Tentar pegar dos atributos primeiro
    const heightAttr = data.attributes?.find((a) => a.id === "HEIGHT");
    const widthAttr = data.attributes?.find((a) => a.id === "WIDTH");
    const lengthAttr = data.attributes?.find((a) => a.id === "DEPTH");
    const weightAttr = data.attributes?.find((a) => a.id === "WEIGHT");

    if (heightAttr?.value_name) {
      height = parseFloat(heightAttr.value_name.replace(/[^0-9.,]/g, "").replace(",", "."));
    }
    if (widthAttr?.value_name) {
      width = parseFloat(widthAttr.value_name.replace(/[^0-9.,]/g, "").replace(",", "."));
    }
    if (lengthAttr?.value_name) {
      length = parseFloat(lengthAttr.value_name.replace(/[^0-9.,]/g, "").replace(",", "."));
    }
    if (weightAttr?.value_name) {
      weight = parseFloat(weightAttr.value_name.replace(/[^0-9.,]/g, "").replace(",", "."));
      // Converter para gramas se necessário
      if (weight && weightAttr.value_name.toLowerCase().includes("kg")) {
        weight = weight * 1000;
      }
    }

    // Se não encontrou nos atributos, tentar do objeto dimensions diretamente
    if (!height && data.dimensions?.height) {
      height = parseFloat(data.dimensions.height);
    }
    if (!width && data.dimensions?.width) {
      width = parseFloat(data.dimensions.width);
    }
    if (!length && data.dimensions?.depth) {
      length = parseFloat(data.dimensions.depth);
    }
    if (!weight && data.weight) {
      weight = parseFloat(data.weight);
      // Peso do ML geralmente vem em kg
      if (weight) weight = weight * 1000;
    }

    console.log(`[ML API] Product ${mlId}: weight=${weight}g, height=${height}cm, width=${width}cm, length=${length}cm`);

    return {
      imageUrl,
      allImages,
      weight,
      height,
      width,
      length,
    };
  } catch (error) {
    console.error("[ML API] Error fetching item:", error);
    return null;
  }
}

/**
 * Busca imagem por nome no Mercado Livre (fallback)
 */
async function searchProductByName(
  name: string,
  brand?: string | null
): Promise<string | null> {
  try {
    const nameWords = name.split(/\s+/).slice(0, 4).join(" ");
    const query = brand ? `${brand} ${nameWords}` : nameWords;
    const encodedQuery = encodeURIComponent(query);

    const searchUrl = `${ML_API_BASE}/sites/MLB/search?q=${encodedQuery}&limit=5&sort_by=relevance`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      return null;
    }

    const data: MLSearchResult = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    // Pegar thumbnail do primeiro resultado
    const item = data.results[0];
    if (item.thumbnail) {
      return item.thumbnail.replace(/-T\./, "-G.");
    }
    if (item.pictures && item.pictures.length > 0) {
      return item.pictures[0].url;
    }

    return null;
  } catch (error) {
    console.error("[ML API] Error searching:", error);
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
        .select("id, name, brand, category, images, tags")
        .or("images.eq.{},images.is.null,tags.eq.{},tags.is.null,weight_grams.is.null")
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
  fields: z.array(z.enum(["images", "tags", "dimensions"])).min(1),
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

      // Buscar dados do ML se solicitado
      if (data.fields.includes("images") || data.fields.includes("dimensions")) {
        let imageUrl: string | null = null;
        let mlData: { weight: number | null; height: number | null; width: number | null; length: number | null } | null = null;

        // Primeiro tenta buscar pelo ID do ML
        if (product.id.startsWith("MLB")) {
          mlData = await fetchMLProductData(product.id);
          if (mlData) {
            imageUrl = mlData.imageUrl;
          }
        }

        // Fallback: busca por nome
        if (!imageUrl && data.fields.includes("images")) {
          imageUrl = await searchProductByName(product.name, product.brand);
        }

        // Atualizar imagem
        if (imageUrl && data.fields.includes("images")) {
          updates.images = [imageUrl];
        }

        // Atualizar dimensões do ML
        if (mlData && data.fields.includes("dimensions")) {
          if (mlData.weight) updates.weight_grams = Math.round(mlData.weight);
          if (mlData.height) updates.height_cm = mlData.height;
          if (mlData.width) updates.width_cm = mlData.width;
          if (mlData.length) updates.length_cm = mlData.length;
        }
      }

      // Atualizar no banco
      if (Object.keys(updates).length === 0) {
        return { success: true };
      }

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
        dimensions: {
          weight_grams: updates.weight_grams as number | null,
          height_cm: updates.height_cm as number | null,
          width_cm: updates.width_cm as number | null,
          length_cm: updates.length_cm as number | null,
        },
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
  ids: z.array(z.string().min(1)).min(1).max(500),
  fields: z.array(z.enum(["images", "tags", "dimensions"])).min(1),
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
            .select("id, name, brand, category, images, tags, weight_grams, height_cm, width_cm, length_cm")
            .eq("id", id)
            .single();

          if (!product) {
            errors.push(`ID ${id}: não encontrado`);
            continue;
          }

          const updates: Record<string, unknown> = {};

          // Gerar tags
          if (data.fields.includes("tags")) {
            updates.tags = generateTags({
              name: product.name,
              brand: product.brand,
              category: product.category,
              tags: product.tags || [],
            });
          }

          // Buscar dados do ML
          if (data.fields.includes("images") || data.fields.includes("dimensions")) {
            let mlData: { imageUrl: string | null; allImages: string[]; weight: number | null; height: number | null; width: number | null; length: number | null } | null = null;

            // Primeiro tenta buscar pelo ID do ML
            if (product.id.startsWith("MLB")) {
              mlData = await fetchMLProductData(product.id);
            }

            // Fallback: busca por nome se não tem imagens do ML
            if (!mlData?.allImages.length && data.fields.includes("images")) {
              const imageUrl = await searchProductByName(product.name, product.brand);
              if (imageUrl) {
                mlData = {
                  imageUrl,
                  allImages: [imageUrl],
                  weight: null,
                  height: null,
                  width: null,
                  length: null,
                };
              }
            }

            // Atualizar imagens - adicionar TODAS as imagens do ML
            if (data.fields.includes("images") && mlData?.allImages && mlData.allImages.length > 0) {
              const currentImages = product.images || [];
              // Filtrar imagens duplicadas
              const newImages = mlData.allImages.filter((img: string) => !currentImages.includes(img));
              // Combinar: existentes + novas (máximo 5)
              const combined = [...currentImages, ...newImages].slice(0, 5);
              if (combined.length > currentImages.length) {
                updates.images = combined;
              }
            }

            // Atualizar dimensões do ML - sempre busca se solicitado
            if (data.fields.includes("dimensions")) {
              // Se ML não retornou dados,估算 baseado na categoria
              const estimated = !mlData?.weight ? estimateDimensionsByCategory(product.category, product.name) : null;

              if (!product.weight_grams) {
                updates.weight_grams = mlData?.weight ? Math.round(mlData.weight) : estimated?.weight || 250;
              }
              if (!product.height_cm) {
                updates.height_cm = mlData?.height || estimated?.height || 15;
              }
              if (!product.width_cm) {
                updates.width_cm = mlData?.width || estimated?.width || 7;
              }
              if (!product.length_cm) {
                updates.length_cm = mlData?.length || estimated?.length || 7;
              }
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

/**
 * Busca imagens de um produto específico no Mercado Livre
 */
const FetchImagesSchema = z.object({
  mlId: z.string().min(1),
});

export const fetchProductImages = createServerFn({ method: "POST" })
  .validator((d: unknown) => FetchImagesSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; images: string[]; error?: string }> => {
    try {
      const mlData = await fetchMLProductData(data.mlId);
      if (!mlData) {
        return { success: false, images: [], error: "Produto não encontrado no Mercado Livre" };
      }
      return { success: true, images: mlData.allImages };
    } catch (e: any) {
      console.error("[enrich] fetchProductImages error:", e);
      return { success: false, images: [], error: e?.message || "Erro desconhecido" };
    }
  });

/**
 * Busca imagens de um produto por texto (nome + marca) via Serper.dev.
 * Retorna URLs de imagens em alta resolução de varejistas/fabricantes.
 */
const SearchImagesSchema = z.object({
  query: z.string().min(2),
});

export const searchProductImages = createServerFn({ method: "POST" })
  .validator((d: unknown) => SearchImagesSchema.parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; images: string[]; error?: string }> => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const apiKey = process.env.SERPER_API_KEY;
      if (!apiKey) {
        return { success: false, images: [], error: "SERPER_API_KEY não configurada" };
      }

      const resp = await fetch("https://google.serper.dev/images", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ q: data.query, gl: "br", hl: "pt", num: 20 }),
      });

      if (!resp.ok) {
        console.error(`[enrich] Serper fetch failed: ${resp.status}`);
        return { success: false, images: [], error: `Erro na busca (${resp.status})` };
      }

      const json = await resp.json();
      const images: string[] = Array.isArray(json?.images)
        ? json.images
            .map((im: { imageUrl?: string }) => im?.imageUrl)
            .filter((url: unknown): url is string => typeof url === "string" && url.length > 0)
        : [];

      return { success: true, images };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403 || e?.message === "NAO_AUTORIZADO") {
        return { success: false, images: [], error: "Não autorizado" };
      }
      console.error("[enrich] searchProductImages error:", e);
      return { success: false, images: [], error: e?.message || "Erro desconhecido" };
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