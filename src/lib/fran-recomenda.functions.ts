import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import type { AdminUser } from "@/lib/admin-auth";
import type { Json } from "@/integrations/supabase/types";

// =====================================================
// TIPOS
// =====================================================

/**
 * Produto enriquecido que o frontend consome da Fran recomenda.
 * Inclui o selo da Fran e a frase curta, além dos dados do produto.
 */
export type FranRecomendaProduto = {
  /** ID da linha fran_recomenda (uuid string) */
  id: string;
  /** Selos possíveis: "Fran indica", "Fran usa", "Fran ama" */
  selo?: string | null;
  /** Frase curta da recomendação (max ~140 chars) */
  frase?: string | null;
  /** Produto associado */
  produto: {
    /** ID do produto da tabela products */
    id: string;
    /** Nome do produto */
    name: string;
    /** Marca do produto */
    brand: string;
    /** Preço atual */
    price: number;
    /** Preço original (com desconto) */
    originalPrice?: number | null;
    /** Imagens principais */
    images: string[];
    /** Slug para URL */
    slug: string | null;
    /** Em estoque? */
    inStock: boolean;
    /** SKU do produto */
    sku?: string | null;
  };
};

/**
 * Item cru da tabela fran_recomenda (sem join).
 * Usado no admin (com join) e nos payloads de upsert.
 */
export type FranRecomendaRow = {
  /** ID da linha fran_recomenda (uuid string) */
  id: string;
  /** ID do produto */
  produtoId: string;
  /** Selo da Fran */
  selo: string | null;
  /** Frase curta da recomendação */
  frase: string | null;
  /** Ordem de exibição */
  ordem: number;
  /** Ativo/Inativo na home */
  ativo: boolean;
  /** Produto enriquecido (apenas para listagem admin) */
  produto?: ProductLite | null;
};

/**
 * Linha crua para upsert (id é opcional, gerado se ausente)
 */
export type FranRecomendaRowInput = {
  id?: string;
  produtoId: string;
  selo?: string | null;
  frase?: string | null;
  ordem?: number;
  ativo?: boolean;
};

/**
 * Versão lite do produto usada no join para o admin
 * (apenas os campos que o painel precisa para exibir thumbnail e nome)
 */
export type ProductLite = {
  id: string;
  name: string;
  brand: string;
  images: string[];
};

// =====================================================
// 1. GET Fran Recomenda (Público / Página Inicial)
// Retorna no máximo 3 produtos ativos da Fran com seus dados enriquecidos.
// Retorna array vazio se não houver configuração.
//
// Só renderiza produtos cujo `is_active=true` no catálogo — se um produto
// curado for desativado depois da curadoria, some da vitrine silenciosamente
// em vez de quebrar a home.
export const getFranRecomenda = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // 1) Buscar até 3 linhas ativas ordenadas por ordem
      const { data, error } = await (supabaseAdmin.from("fran_recomenda" as any) as any)
        .select("id, produto_id, selo, frase, ordem, ativo")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .limit(3);

      if (error) {
        console.error("getFranRecomenda error:", error.message);
        return { success: false, data: [] as FranRecomendaProduto[] };
      }

      if (!data || data.length === 0) {
        return { success: true, data: [] as FranRecomendaProduto[] };
      }

      // 2) Buscar os produtos correspondentes, filtrando apenas ativos
      const produtoIds = data.map((r: any) => r.produto_id);
      const { data: produtosData, error: prodError } = await (supabaseAdmin.from("products" as any) as any)
        .select(
          "id, name, brand, price, original_price, images, slug, in_stock, sku"
        )
        .in("id", produtoIds)
        .eq("is_active", true);

      if (prodError) {
        console.error("getFranRecomenda products error:", prodError.message);
        return { success: false, data: [] as FranRecomendaProduto[] };
      }

      if (!produtosData) {
        return { success: true, data: [] as FranRecomendaProduto[] };
      }

      // 3) Indexar produtos por id e montar array enriquecido
      const produtosMap = new Map<string, any>(
        produtosData.map((p: any) => [p.id, p])
      );

      const resultado: FranRecomendaProduto[] = (data || [])
        .filter((r: any) => r.produto_id && produtosMap.has(r.produto_id))
        .map((r: any) => {
          const p = produtosMap.get(r.produto_id)!;
          return {
            id: r.id,
            selo: r.selo ?? null,
            frase: r.frase ?? null,
            produto: {
              id: p.id,
              name: p.name,
              brand: p.brand ?? "",
              price: Number(p.price),
              originalPrice: p.original_price ? Number(p.original_price) : null,
              images: p.images ?? [],
              slug: p.slug ?? null,
              inStock: p.in_stock,
              sku: p.sku ?? null,
            },
          };
        });

      return { success: true, data: resultado };
    } catch (err: any) {
      console.error("getFranRecomenda exception:", err?.message || err);
      return { success: false, data: [] as FranRecomendaProduto[] };
    }
  });

// =====================================================
// 2. GET Admin Fran Recomenda
// Retorna TODAS as linhas (ativas e inativas) com join ao produto.
// Requer admin. Limite máximo de 3 linhas ativas na home é decidido pelo admin.
export const getAdminFranRecomenda = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const admin = await requireAdmin();

      const { data, error } = await (supabaseAdmin.from("fran_recomenda" as any) as any)
        .select("id, produto_id, selo, frase, ordem, ativo")
        .order("ordem", { ascending: true });

      if (error) {
        console.error("getAdminFranRecomenda error:", error.message);
        return { success: false, data: [] as FranRecomendaRow[] };
      }

      if (!data || data.length === 0) {
        return { success: true, data: [] as FranRecomendaRow[] };
      }

      // Buscar produtos para join (apenas os ativos, mas mantemos os inativos
      // na lista para o admin poder editar / desativar mesmo depois da desativação)
      const produtoIds = data.map((r: any) => r.produto_id);
      const { data: produtosData, error: prodError } = await (supabaseAdmin.from("products" as any) as any)
        .select("id, name, brand, images, is_active")
        .in("id", produtoIds);

      if (prodError) {
        console.error("getAdminFranRecomenda products error:", prodError.message);
      }

      const produtosMap = new Map<string, ProductLite>(
        (produtosData || []).map((p: any) => [
          p.id,
          {
            id: p.id,
            name: p.name,
            brand: p.brand ?? "",
            images: p.images ?? [],
          },
        ])
      );

      const rows: FranRecomendaRow[] = data.map((r: any) => ({
        id: r.id,
        produtoId: r.produto_id,
        selo: r.selo ?? null,
        frase: r.frase ?? null,
        ordem: r.ordem ?? 0,
        ativo: r.ativo ?? false,
        produto: produtosMap.get(r.produto_id) ?? null,
      }));

      return { success: true, data: rows };
    } catch (err: any) {
      console.error("getAdminFranRecomenda exception:", err?.message || err);
      return { success: false, data: [] as FranRecomendaRow[] };
    }
  });

// =====================================================
// 3. UPSERT Admin Fran Recomenda
// Recebe: { rows: [{ id?, produtoId, selo, frase, ordem, ativo }] }
//
// Regras:
// - máximo 3 linhas ativas (validado no cliente também, mas re-checado aqui)
// - selo <= 20 chars; frase <= 140 chars
// - produtoId deve existir e ser is_active=true (curadoria precisa de produto visível)
// - upsert é feito linha a linha para auditoria granular via logAdminAction
export const upsertFranRecomenda = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const schema = z.object({
      rows: z
        .array(
          z.object({
            id: z.string().uuid().optional().nullable(),
            produtoId: z.string().min(1, "produtoId é obrigatório"),
            selo: z
              .string()
              .max(20, "Selo deve ter no máximo 20 caracteres")
              .nullable()
              .optional(),
            frase: z
              .string()
              .max(140, "Frase deve ter no máximo 140 caracteres")
              .nullable()
              .optional(),
            ordem: z.number().int().min(0).default(0),
            ativo: z.boolean().default(false),
          })
        )
        .max(3, "Máximo 3 linhas permitidas"),
    });

    const parsed = schema.parse(input);

    // Validação: máximo 3 ativos
    const ativos = parsed.rows.filter((r) => r.ativo).length;
    if (ativos > 3) {
      throw new Error("Máximo 3 produtos ativos permitidos");
    }

    // Validação de produtos ativos (existe+is_active=true) é feita no handler
    // porque o validator do createServerFn é síncrono.

    return parsed;
  })
  .handler(async ({ data: input }) => {
    try {
      const admin = await requireAdmin();

      const now = new Date().toISOString();

      // 1) Validar que todos os produtos existem e são ativos
      const produtoIds = input.rows.map((r) => r.produtoId);
      const { data: produtosData, error: produtosError } = await (supabaseAdmin
        .from("products" as any)
        .select("id, is_active")
        .in("id", produtoIds));

      if (produtosError) {
        return {
          success: false,
          error: "Erro ao validar produtos: " + produtosError.message,
        };
      }

      const produtosAtivosSet = new Set(
        (produtosData || [])
          .filter((p: any) => p.is_active)
          .map((p: any) => p.id)
      );

      for (const row of input.rows) {
        if (!produtosAtivosSet.has(row.produtoId)) {
          return {
            success: false,
            error: `Produto ${row.produtoId} não encontrado ou inativo`,
          };
        }
      }

      // 2) Buscar estado anterior para auditoria
      const { data: beforeData } = await (supabaseAdmin
        .from("fran_recomenda" as any)
        .select("*"));

      const beforeMap = new Map(
        (beforeData || []).map((r: any) => [r.id, r])
      );

      // 3) Processar cada linha: insert ou update
      const results = [];
      for (const row of input.rows) {
        const payload = {
          produto_id: row.produtoId,
          selo: row.selo ?? null,
          frase: row.frase ?? null,
          ordem: row.ordem ?? 0,
          ativo: row.ativo ?? false,
        };

        if (row.id) {
          // Update
          const { error } = await (supabaseAdmin.from("fran_recomenda" as any) as any)
            .update({ ...payload, updated_at: now })
            .eq("id", row.id);

          if (error) {
            return { success: false, error: "Erro ao atualizar: " + error.message };
          }

          logAdminAction(
            admin,
            "fran_recomenda.update",
            "fran_recomenda",
            row.id,
            (beforeMap.get(row.id) ?? null) as Json,
            payload as Json,
            { produtoId: row.produtoId, ativo: row.ativo }
          );

          results.push({ id: row.id, action: "updated" as "updated" });
        } else {
          // Insert - deixa o Postgres gerar o id via default gen_random_uuid()
          const { data: insertedData, error } = await (supabaseAdmin.from("fran_recomenda" as any) as any)
            .insert([
              {
                ...payload,
                created_at: now,
                updated_at: now,
              },
            ])
            .select("id")
            .single();

          if (error) {
            return { success: false, error: "Erro ao criar: " + error.message };
          }

          const newId = insertedData?.id ?? "unknown";

          logAdminAction(
            admin,
            "fran_recomenda.create",
            "fran_recomenda",
            newId,
            null,
            payload as Json,
            { produtoId: row.produtoId, ativo: row.ativo }
          );

          results.push({ id: newId, action: "created" as const });
        }
      }

      return { success: true, data: results };
    } catch (err: any) {
      console.error("upsertFranRecomenda exception:", err?.message || err);
      return { success: false, error: err?.message || "Erro ao salvar" };
    }
  });

// =====================================================
// 4. DELETE Admin Fran Recomenda (Admin)
// Remove definitivamente uma linha da curadoria.
export const deleteFranRecomenda = createServerFn({ method: "POST" })
  .validator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data: id }) => {
    try {
      const admin = await requireAdmin();

      // Buscar estado anterior
      const { data: beforeData } = await (supabaseAdmin
        .from("fran_recomenda" as any)
        .select("*")
        .eq("id", id)
        .maybeSingle());

      const { error } = await (supabaseAdmin.from("fran_recomenda" as any) as any)
        .delete()
        .eq("id", id);

      if (error) {
        return { success: false, error: "Erro ao excluir: " + error.message };
      }

      logAdminAction(
        admin,
        "fran_recomenda.delete",
        "fran_recomenda",
        id,
        beforeData as Json,
        null,
        {}
      );

      return { success: true };
    } catch (err: any) {
      console.error("deleteFranRecomenda exception:", err?.message || err);
      return { success: false, error: err?.message || "Erro ao excluir" };
    }
  });
