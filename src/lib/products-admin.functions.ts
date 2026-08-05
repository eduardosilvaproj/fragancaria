import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server fns de CRUD de produtos para o admin. Padrão: requireAdmin() +
// supabaseAdmin (service role, bypassa RLS). O guard beforeLoad em admin.tsx
// já barra visitantes; requireAdmin é defesa em profundidade.

function slugify(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const variationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  color: z.string().max(30).nullable().optional(),
  image: z.string().max(2000).nullable().optional(),
});

const productInput = z.object({
  name: z.string().min(1).max(300),
  brand: z.string().max(120).nullable().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  subcategory: z.string().max(120).nullable().optional(),
  images: z.array(z.string()).max(20).optional(),
  tags: z.array(z.string()).max(50).optional(),
  inStock: z.boolean().optional(),
  quantity: z.number().int().nonnegative().optional(),
  sku: z.string().max(120).nullable().optional(),
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isActive: z.boolean().optional(),
  // Dimensões para frete
  weightGrams: z.number().int().nonnegative().nullable().optional(),
  heightCm: z.number().nonnegative().nullable().optional(),
  widthCm: z.number().nonnegative().nullable().optional(),
  lengthCm: z.number().nonnegative().nullable().optional(),
  // Dados fiscais
  ncm: z.string().max(10).nullable().optional(),
  eanBarcode: z.string().max(20).nullable().optional(),
  // Custo e margem
  cost: z.number().nonnegative().nullable().optional(),
  pricingMode: z.enum(["manual", "auto"]).optional(),
  targetMargin: z.number().min(0).max(0.9999).nullable().optional(),
  // Variações (ex.: tons de coloração)
  variations: z.array(variationSchema).max(50).optional(),
});

type ProductInput = z.infer<typeof productInput>;

// Mapeia SÓ as chaves presentes no input para colunas do banco (snake_case).
//
// Diferença de inputToRow: aqui chave ausente NÃO entra no objeto, então não
// vira `null`/`[]` num UPDATE. É o que permite ao import ser merge — ver
// importProducts. `updateProduct` tem a própria cópia dessa lógica, escrita
// antes desta função e sem os campos de dimensão/fiscais.
function inputToPatch(data: Partial<ProductInput>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.brand !== undefined) {
    patch.brand = data.brand;
    patch.brand_slug = data.brand ? slugify(data.brand) : null;
  }
  if (data.price !== undefined) patch.price = data.price;
  if (data.originalPrice !== undefined) patch.original_price = data.originalPrice;
  if (data.description !== undefined) patch.description = data.description;
  if (data.category !== undefined) {
    patch.category = data.category;
    patch.category_slug = data.category;
  }
  if (data.subcategory !== undefined) patch.subcategory = data.subcategory;
  if (data.images !== undefined) patch.images = data.images;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (data.inStock !== undefined) patch.in_stock = data.inStock;
  if (data.quantity !== undefined) patch.quantity = data.quantity;
  if (data.sku !== undefined) patch.sku = data.sku;
  if (data.featured !== undefined) patch.featured = data.featured;
  if (data.isNew !== undefined) patch.is_new = data.isNew;
  if (data.isActive !== undefined) patch.is_active = data.isActive;
  if (data.weightGrams !== undefined) patch.weight_grams = data.weightGrams;
  if (data.heightCm !== undefined) patch.height_cm = data.heightCm;
  if (data.widthCm !== undefined) patch.width_cm = data.widthCm;
  if (data.lengthCm !== undefined) patch.length_cm = data.lengthCm;
  if (data.ncm !== undefined) patch.ncm = data.ncm;
  if (data.eanBarcode !== undefined) patch.ean_barcode = data.eanBarcode;
  if (data.cost !== undefined) patch.cost = data.cost;
  if (data.pricingMode !== undefined) patch.pricing_mode = data.pricingMode;
  if (data.targetMargin !== undefined) patch.target_margin = data.targetMargin;
  if (data.variations !== undefined) patch.variations = data.variations;
  return patch;
}

// Mapeia o input (camelCase da UI) para a row do banco (snake_case).
function inputToRow(data: ProductInput) {
  const brandSlug = data.brand ? slugify(data.brand) : null;
  return {
    name: data.name,
    brand: data.brand ?? null,
    brand_slug: brandSlug,
    price: data.price,
    original_price: data.originalPrice ?? null,
    description: data.description ?? null,
    category: data.category ?? null,
    category_slug: data.category ?? null,
    subcategory: data.subcategory ?? null,
    images: data.images ?? [],
    tags: data.tags ?? [],
    in_stock: data.inStock ?? true,
    quantity: data.quantity ?? 0,
    sku: data.sku ?? null,
    featured: data.featured ?? false,
    is_new: data.isNew ?? false,
    is_active: data.isActive ?? true,
    // Dimensões para frete
    weight_grams: data.weightGrams ?? null,
    height_cm: data.heightCm ?? null,
    width_cm: data.widthCm ?? null,
    length_cm: data.lengthCm ?? null,
    // Dados fiscais
    ncm: data.ncm ?? null,
    ean_barcode: data.eanBarcode ?? null,
    // Custo e margem
    cost: data.cost ?? null,
    pricing_mode: data.pricingMode ?? "manual",
    target_margin: data.targetMargin ?? null,
    // Variações
    variations: data.variations ?? [],
  };
}

export const listProductsForAdmin = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        search: z.string().optional(),
        category: z.string().optional(),
        brand: z.string().optional(),
        status: z.enum(["all", "active", "inactive", "low_stock", "out_of_stock"]).optional(),
        limit: z.number().int().positive().max(200).optional(),
        offset: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const limit = data.limit ?? 50;
      const offset = data.offset ?? 0;

      let query = supabaseAdmin
        .from("products")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (data.category) query = query.eq("category", data.category);
      if (data.brand) query = query.eq("brand", data.brand);
      if (data.status === "active") query = query.eq("is_active", true);
      if (data.status === "inactive") query = query.eq("is_active", false);
      if (data.status === "out_of_stock") query = query.eq("quantity", 0);
      if (data.search && data.search.trim()) {
        const term = data.search.replace(/[%_]/g, (c) => "\\" + c).trim();
        query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%`);
      }

      const { data: rows, error, count } = await query;
      if (error) return { success: false as const, error: error.message };
      return { success: true as const, data: { products: rows ?? [], total: count ?? 0 } };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const getProductForAdmin = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (error) return { success: false as const, error: error.message };
      if (!row) return { success: false as const, error: "Produto nao encontrado" };
      return { success: true as const, data: row };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const createProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => productInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAdminAction } = await import("@/lib/admin-audit");
      const { randomUUID } = await import("node:crypto");

      const id = data.sku?.trim() || `FRAG-${randomUUID().slice(0, 12)}`;
      const row = {
        ...inputToRow(data),
        id,
        slug: `${slugify(data.name)}-${id.toLowerCase()}`.slice(0, 200),
        external_ids: {},
      };
      const { data: created, error } = await supabaseAdmin
        .from("products")
        .insert(row as any)
        .select("*")
        .single();
      if (error) return { success: false as const, error: error.message };

      logAdminAction(admin, "product.create", "product", created.id, null, created as Record<string, unknown>);

      return { success: true as const, id: created.id };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const updateProduct = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ id: z.string(), patch: productInput.partial() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAdminAction, diffSnapshots } = await import("@/lib/admin-audit");

      const p = data.patch;
      const patch: Record<string, unknown> = {};
      if (p.name !== undefined) patch.name = p.name;
      if (p.brand !== undefined) {
        patch.brand = p.brand;
        patch.brand_slug = p.brand ? slugify(p.brand) : null;
      }
      if (p.price !== undefined) patch.price = p.price;
      if (p.originalPrice !== undefined) patch.original_price = p.originalPrice;
      if (p.description !== undefined) patch.description = p.description;
      if (p.category !== undefined) {
        patch.category = p.category;
        patch.category_slug = p.category;
      }
      if (p.subcategory !== undefined) patch.subcategory = p.subcategory;
      if (p.images !== undefined) patch.images = p.images;
      if (p.tags !== undefined) patch.tags = p.tags;
      if (p.inStock !== undefined) patch.in_stock = p.inStock;
      if (p.quantity !== undefined) patch.quantity = p.quantity;
      if (p.sku !== undefined) patch.sku = p.sku;
      if (p.featured !== undefined) patch.featured = p.featured;
      if (p.isNew !== undefined) patch.is_new = p.isNew;
      if (p.isActive !== undefined) patch.is_active = p.isActive;
      if (p.cost !== undefined) patch.cost = p.cost;
      if (p.pricingMode !== undefined) patch.pricing_mode = p.pricingMode;
      if (p.targetMargin !== undefined) patch.target_margin = p.targetMargin;
      if (p.variations !== undefined) patch.variations = p.variations;

      const changedKeys = Object.keys(patch);
      if (changedKeys.length === 0) {
        return { success: false as const, error: "nenhum campo para atualizar" };
      }

      const { data: before, error: beforeErr } = await supabaseAdmin
        .from("products")
        .select(changedKeys.join(","))
        .eq("id", data.id)
        .single();
      if (beforeErr) return { success: false as const, error: beforeErr.message };

      const action: "product.update" | "product.activate" | "product.deactivate" =
        changedKeys.length === 1 && patch.is_active !== undefined
          ? patch.is_active
            ? "product.activate"
            : "product.deactivate"
          : "product.update";

      const { data: after, error: updateErr } = await supabaseAdmin
        .from("products")
        .update(patch as unknown as Record<string, never>)
        .eq("id", data.id)
        .select(changedKeys.join(","))
        .single();
      if (updateErr) return { success: false as const, error: updateErr.message };

      const diff = diffSnapshots(
        before as Record<string, unknown>,
        after as Record<string, unknown>,
      );
      if (diff) {
        logAdminAction(admin, action, "product", data.id, diff.before, diff.after);
      }

      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const deleteProducts = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ ids: z.array(z.string()).min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAdminActionBatch } = await import("@/lib/admin-audit");

      const { data: beforeRows, error: readErr } = await supabaseAdmin
        .from("products")
        .select("id, name, sku")
        .in("id", data.ids);
      if (readErr) return { success: false as const, error: readErr.message };

      const { error } = await supabaseAdmin.from("products").delete().in("id", data.ids);
      if (error) return { success: false as const, error: error.message };

      logAdminActionBatch(
        admin,
        "product.delete",
        "product",
        (beforeRows ?? []).map((r) => ({
          entityId: r.id as string,
          before: r as Record<string, unknown>,
          after: null,
        })),
      );

      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const setProductsActive = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ ids: z.array(z.string()).min(1).max(500), isActive: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAdminActionBatch } = await import("@/lib/admin-audit");

      const action = data.isActive ? "product.activate" : "product.deactivate";
      const { data: beforeRows, error: readErr } = await supabaseAdmin
        .from("products")
        .select("id, is_active, name")
        .in("id", data.ids);
      if (readErr) return { success: false as const, error: readErr.message };

      const { error } = await supabaseAdmin
        .from("products")
        .update({ is_active: data.isActive })
        .in("id", data.ids);
      if (error) return { success: false as const, error: error.message };

      const beforeMap = new Map(
        (beforeRows ?? []).map((r) => [r.id as string, Boolean(r.is_active)]),
      );
      const changedIds = data.ids.filter((id) => beforeMap.get(id) !== data.isActive);
      const afterValue = { is_active: data.isActive };

      logAdminActionBatch(
        admin,
        action,
        "product",
        changedIds.map((id) => ({
          entityId: id,
          before: { is_active: beforeMap.get(id) ?? null },
          after: afterValue,
        })),
      );

      return { success: true as const };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

// Aplica margem global a um lote de produtos.
// Se cost for null, o produto é ignorado (não tem custo para recalcular).
// Se cost existir, price é recalculado: price = cost / (1 - targetMargin).
// Retorna preview com quantos serão alterados e faixa de preço antes/depois.
export const applyGlobalMargin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      targetMargin: z.number().min(0).max(0.9999),
      ids: z.array(z.string()).min(1).max(2000),
      dryRun: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Busca os produtos selecionados que têm cost
      const { data: rows, error } = await supabaseAdmin
        .from("products")
        .select("id, name, cost, price, target_margin")
        .in("id", data.ids)
        .not("cost", "is", null);

      if (error) return { success: false as const, error: error.message };
      if (!rows || rows.length === 0) {
        return { success: false as const, error: "Nenhum produto selecionado tem custo definido." };
      }

      const margin = data.targetMargin;
      const preview = rows.map((r) => {
        const cost = Number(r.cost);
        const newPrice = Math.round(cost / (1 - margin) * 100) / 100;
        return {
          id: r.id,
          name: r.name,
          cost,
          oldPrice: Number(r.price ?? 0),
          newPrice,
          oldTargetMargin: r.target_margin != null ? Number(r.target_margin) : null,
        };
      });

      if (data.dryRun) {
        const afetados = preview.length;
        const semCusto = data.ids.length - afetados;
        const minOld = Math.min(...preview.map((p) => p.oldPrice));
        const maxOld = Math.max(...preview.map((p) => p.oldPrice));
        const minNew = Math.min(...preview.map((p) => p.newPrice));
        const maxNew = Math.max(...preview.map((p) => p.newPrice));
        return {
          success: true as const,
          dryRun: true as const,
          afetados,
          semCusto,
          faixaPrecoAntes: `${minOld.toFixed(2)} - ${maxOld.toFixed(2)}`,
          faixaPrecoDepois: `${minNew.toFixed(2)} - ${maxNew.toFixed(2)}`,
          preview,
        };
      }

      // Aplica apenas price e target_margin. UPDATE isolado por id protege as
      // demais colunas (images, weight_grams, dimensões, ncm etc.) do bug de upsert.
      const { logAdminActionBatch } = await import("@/lib/admin-audit");
      const auditItems = preview.map((p) => ({
        entityId: p.id,
        before: { price: p.oldPrice, target_margin: p.oldTargetMargin },
        after: { price: p.newPrice, target_margin: margin },
      }));

      for (const p of preview) {
        const { error: updateErr } = await supabaseAdmin
          .from("products")
          .update({ price: p.newPrice, target_margin: margin })
          .eq("id", p.id);
        if (updateErr) return { success: false as const, error: updateErr.message };
      }

      logAdminActionBatch(admin, "product.margin.apply", "product", auditItems, {
        targetMargin: margin,
        requestedCount: data.ids.length,
      });

      return { success: true as const, dryRun: false as const, atualizados: preview.length };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

// Importa lote de linhas (CSV parseado no cliente). Casa por id (= sku, ou
// gerado quando não há sku), então re-importar o mesmo arquivo atualiza.
//
// MERGE, não sobrescrita: só as colunas presentes no CSV são gravadas. Antes
// isso passava por inputToRow, que preenchia TODA coluna com `?? null`/`?? []`
// — um import de duas colunas para corrigir preço zerava images, tags,
// weight_grams/height_cm/width_cm/length_cm (o que a cotação do Melhor Envio
// consome), ncm, ean_barcode, variations e external_ids do produto existente.
//
// Produto que já existe passa por inputToPatch (só chaves presentes); produto
// novo continua por inputToRow, porque aí os defaults SÃO o comportamento certo
// e name/slug precisam existir.
export const importProducts = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    // .partial(): um CSV de `sku,price` é entrada válida. O que cada linha
    // precisa de fato depende de já existir ou não, e isso é decidido no
    // handler, contra o banco.
    z.object({ rows: z.array(productInput.partial()).min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { randomUUID } = await import("node:crypto");

      // linha+2: a linha 1 do arquivo é o cabeçalho, e o índice começa em 0.
      const linhas = data.rows.map((input, i) => ({
        linha: i + 2,
        input,
        sku: input.sku?.trim() || null,
      }));

      // SKU repetido no mesmo arquivo faz o Postgres abortar TUDO com
      // "ON CONFLICT DO UPDATE command cannot affect row a second time".
      // Falhar é o certo (não há como saber qual linha vale), mas o operador
      // precisa saber QUAIS skus corrigir — não o erro cru do banco.
      const porSku = new Map<string, number[]>();
      for (const l of linhas) {
        if (!l.sku) continue;
        porSku.set(l.sku, [...(porSku.get(l.sku) ?? []), l.linha]);
      }
      const duplicados = [...porSku.entries()].filter(([, ls]) => ls.length > 1);
      if (duplicados.length > 0) {
        const detalhe = duplicados
          .slice(0, 10)
          .map(([sku, ls]) => `${sku} (linhas ${ls.join(", ")})`)
          .join("; ");
        const resto = duplicados.length > 10 ? ` e outros ${duplicados.length - 10}` : "";
        return {
          success: false as const,
          error: `SKU repetido no arquivo: ${detalhe}${resto}. Cada SKU pode aparecer uma vez só — nada foi importado.`,
        };
      }

      const ids = linhas.map((l) => l.sku ?? `FRAG-${randomUUID().slice(0, 12)}`);

      // Quais desses ids já existem: decide merge (update) x criação (insert).
      // Traz `name` junto porque ele é reinjetado no payload — ver abaixo.
      const { data: achados, error: erroSelect } = await supabaseAdmin
        .from("products")
        .select("id, name")
        .in("id", ids);
      if (erroSelect) return { success: false as const, error: erroSelect.message };
      const nomeAtual = new Map<string, string>(
        (achados ?? []).map((r) => [r.id as string, r.name as string]),
      );
      const existentes = new Set(nomeAtual.keys());

      const erros: string[] = [];
      let atualizados = 0;
      let criados = 0;
      let semMudanca = 0;

      // ---- produtos existentes: grava só as colunas do CSV ----
      // O PostgREST exige que todos os objetos de um bulk tenham as MESMAS
      // chaves, então agrupa por assinatura. Na prática dá um grupo só (as
      // linhas vêm do mesmo cabeçalho), mas agrupar evita erro se o CSV tiver
      // células vazias que virem chave ausente em algumas linhas.
      const grupos = new Map<string, Record<string, unknown>[]>();
      for (let i = 0; i < linhas.length; i++) {
        const id = ids[i];
        if (!existentes.has(id)) continue;
        const patch = inputToPatch(linhas[i].input);
        if (Object.keys(patch).length === 0) {
          semMudanca++;
          continue;
        }
        // `name` reinjetado com o valor que já está no banco. Não é enfeite:
        // upsert do PostgREST é INSERT ... ON CONFLICT, e o Postgres valida
        // NOT NULL na tentativa de INSERT ANTES de resolver o conflito. Sem
        // isso, um CSV de `sku,price` falha com "null value in column name
        // violates not-null constraint" mesmo com o produto existindo. `name`
        // é a única coluna NOT NULL sem default (as outras têm), então é a
        // única que precisa disso. O ON CONFLICT só atualiza as colunas
        // enviadas, e aqui name recebe o mesmo valor: no-op.
        const payload = { ...patch, id, name: patch.name ?? nomeAtual.get(id) };
        const assinatura = Object.keys(payload).sort().join(",");
        grupos.set(assinatura, [...(grupos.get(assinatura) ?? []), payload]);
      }
      for (const payloads of grupos.values()) {
        const { error } = await supabaseAdmin
          .from("products")
          .upsert(payloads as any, { onConflict: "id" });
        if (error) erros.push(`Atualização de ${payloads.length} produto(s): ${error.message}`);
        else atualizados += payloads.length;
      }

      // ---- produtos novos: linha completa, com defaults ----
      const novos: Record<string, unknown>[] = [];
      for (let i = 0; i < linhas.length; i++) {
        const id = ids[i];
        if (existentes.has(id)) continue;
        const { input, linha, sku } = linhas[i];
        // name é NOT NULL sem default: um CSV de `sku,price` só serve para
        // atualizar. Sem name, e sem o produto existir, a linha não dá insert.
        if (!input.name) {
          erros.push(
            `Linha ${linha}: ${sku ? `SKU ${sku} não existe no catálogo e a linha` : "linha"} não tem a coluna name, necessária para criar produto.`,
          );
          continue;
        }
        novos.push({
          ...inputToRow(input as ProductInput),
          id,
          slug: `${slugify(input.name)}-${id.toLowerCase()}`.slice(0, 200),
          external_ids: {},
        });
      }
      if (novos.length > 0) {
        const { error } = await supabaseAdmin.from("products").insert(novos as any);
        if (error) erros.push(`Criação de ${novos.length} produto(s): ${error.message}`);
        else criados = novos.length;
      }

      return {
        success: true as const,
        atualizados,
        criados,
        semMudanca,
        erros,
        // Mantido para quem já lia `imported`.
        imported: atualizados + criados,
      };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "erro" };
    }
  });

export const exportProducts = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select("id, sku, name, brand, category, price, original_price, quantity, in_stock, is_active, featured, is_new, images, tags, description, cost, pricing_mode, target_margin")
      .order("name", { ascending: true });
    if (error) return { success: false as const, error: error.message };
    return { success: true as const, data: rows ?? [] };
  } catch (e: any) {
    return { success: false as const, error: e?.message || "erro" };
  }
});
