import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Product } from "@/data/products";
import { rowToProduct } from "@/lib/products.functions";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import type { Json } from "@/integrations/supabase/types";

// ============================================
// Tipos
// ============================================

export type Campanha = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  inicia_em: string;
  termina_em: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CampanhaInput = {
  titulo: string;
  subtitulo?: string | null;
  inicia_em: string;
  termina_em: string;
  ativo?: boolean;
};

export type CampanhaWithProducts = Campanha & {
  produtos: CampanhaProduto[];
};

export type CampanhaProduto = {
  id: string;
  campanha_id: string;
  produto_id: string;
  ordem: number;
};

export type CampanhaProdutoInput = {
  produto_id: string;
  ordem?: number;
};

// ============================================
// 1. GET Campanha Ativa (Público / Página Inicial)
// Busca a campanha ativa dentro da janela de datas.
// Se houver mais de uma elegível, a de menor inicia_em ganha.
// Retorna null se não houver campanha ou não estiver na janela.
// ============================================
export const getCampanhaAtiva = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ success: boolean; data: Campanha | null; error?: string }> => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const now = new Date().toISOString();

      const { data: campanha, error } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .select("id, titulo, subtitulo, inicia_em, termina_em, ativo, created_at, updated_at")
        .eq("ativo", true)
        .lte("inicia_em", now)
        .gte("termina_em", now)
        .order("inicia_em", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("getCampanhaAtiva error:", error.message);
        return { success: false, data: null, error: error.message };
      }

      if (!campanha) {
        return { success: true, data: null };
      }

      return { success: true, data: campanha as Campanha };
    } catch (err: any) {
      console.error("getCampanhaAtiva exception:", err?.message || err);
      return { success: false, data: null, error: err?.message || "erro" };
    }
  });

// ============================================
// 2. GET Produtos da Campanha Ativa (Público)
// Busca os produtos curados para a campanha ativa.
// Ignora produtos inativos silenciosamente — não aparecem na loja.
// ============================================
export const getProdutosCampanhaAtiva = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ success: boolean; data: Product[]; error?: string }> => {
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const now = new Date().toISOString();

      // 1) Buscar campanha ativa dentro da janela
      const { data: campanha, error: campanhaError } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .select("id, ativo")
        .eq("ativo", true)
        .lte("inicia_em", now)
        .gte("termina_em", now)
        .order("inicia_em", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (campanhaError) {
        console.error("getProdutosCampanhaAtiva campanha error:", campanhaError.message);
        return { success: false, data: [], error: campanhaError.message };
      }

      if (!campanha) {
        return { success: true, data: [] };
      }

      // 2) Buscar produtos curados para esta campanha, em ordem
      const { data: produtosCurados, error: produtosError } = await (supabaseAdmin.from("home_campanha_produtos" as any) as any)
        .select("produto_id, ordem")
        .eq("campanha_id", campanha.id)
        .order("ordem", { ascending: true });

      if (produtosError) {
        console.error("getProdutosCampanhaAtiva produtos error:", produtosError.message);
        return { success: false, data: [], error: produtosError.message };
      }

      if (!produtosCurados || produtosCurados.length === 0) {
        return { success: true, data: [] };
      }

      // 3) Buscar produtos ativos do banco e filtrar apenas os curados
      // Usa join com products para trazer os dados do produto
      const { data: productsData, error: productsError } = await (supabaseAdmin.from("products" as any) as any)
        .select("*")
        .in("id", produtosCurados.map((r: any) => r.produto_id))
        .eq("is_active", true);

      if (productsError) {
        console.error("getProdutosCampanhaAtiva products error:", productsError.message);
        return { success: false, data: [], error: productsError.message };
      }

      // 4) Converter rows para Product e ordenar conforme a curadoria
      const byOrdem = new Map((produtosCurados as Array<{ produto_id: string; ordem: number }>).map((r) => [r.produto_id, r.ordem]));
      const result = (productsData || [])
        .map((r: any) => rowToProduct(r))
        .sort((a: Product, b: Product) => (byOrdem.get(a.id) ?? 0) - (byOrdem.get(b.id) ?? 0));

      return { success: true, data: result };
    } catch (err: any) {
      console.error("getProdutosCampanhaAtiva exception:", err?.message || err);
      return { success: false, data: [], error: err?.message || "erro" };
    }
  });

// ============================================
// 3. GET Todas Campanhas (Admin)
// Lista todas as campanhas (ativas e inativas) para o painel admin.
// ============================================
export const getAdminCampanhas = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const { data, error } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .select("id, titulo, subtitulo, inicia_em, termina_em, ativo, created_at, updated_at")
        .order("inicia_em", { ascending: false });

      if (error) {
        return { success: false, data: [] as Campanha[], error: error.message };
      }

      return { success: true, data: (data || []) as Campanha[] };
    } catch (err: any) {
      return { success: false, data: [] as Campanha[], error: err?.message || "erro" };
    }
  });

// ============================================
// 4. GET Produtos de uma Campanha (Admin)
// ============================================
export const getAdminCampanhaProdutos = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ campanhaId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ success: boolean; data: CampanhaProduto[]; error?: string }> => {
    try {
      await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const { data: produtos, error } = await (supabaseAdmin.from("home_campanha_produtos" as any) as any)
        .select("id, campanha_id, produto_id, ordem")
        .eq("campanha_id", data.campanhaId)
        .order("ordem", { ascending: true });

      if (error) {
        return { success: false, data: [], error: error.message };
      }

      return { success: true, data: (produtos || []) as CampanhaProduto[] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  });

// ============================================
// 5. CREATE Campanha (Admin)
// ============================================
const campanhaSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório").max(100),
  subtitulo: z.string().nullable().optional(),
  inicia_em: z.string().min(1, "Data de início é obrigatória"),
  termina_em: z.string().min(1, "Data de término é obrigatória"),
  ativo: z.boolean().default(false),
});

export const createCampanha = createServerFn({ method: "POST" })
  .validator((input: unknown) => campanhaSchema.parse(input))
  .handler(async ({ data: input }): Promise<{ success: boolean; data: Campanha | null; error?: string }> => {
    try {
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const now = new Date().toISOString();

      const { data: campanha, error } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .insert([{
          ...input,
          created_at: now,
          updated_at: now,
        }])
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      logAdminAction(
        admin,
        "campanha.create",
        "campanha",
        campanha.id,
        null,
        campanha as Json,
        { titulo: campanha.titulo }
      );

      return { success: true, data: campanha as Campanha };
    } catch (err: any) {
      console.error("createCampanha exception:", err?.message || err);
      return { success: false, data: null, error: err?.message || "erro" };
    }
  });

// ============================================
// 6. UPDATE Campanha (Admin)
// ============================================
export const updateCampanha = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      titulo: z.string().min(1, "Título é obrigatório").max(100).optional(),
      subtitulo: z.string().nullable().optional(),
      inicia_em: z.string().optional(),
      termina_em: z.string().optional(),
      ativo: z.boolean().optional(),
    }).parse(input)
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; data: Campanha | null; error?: string }> => {
    try {
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const { id, ...updateFields } = input;

      // Busca estado anterior para auditoria
      const { data: beforeData } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const { data: campanha, error } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .update({ ...updateFields, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      logAdminAction(
        admin,
        "campanha.update",
        "campanha",
        id,
        beforeData as Json,
        campanha as Json,
        { titulo: campanha.titulo }
      );

      return { success: true, data: campanha as Campanha };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "erro" };
    }
  });

// ============================================
// 7. UPSERT Produtos da Campanha (Admin)
// Recebe: { campanhaId, rows: [{ produto_id, ordem }] }
// Limpa e reinsere produtos para a campanha (semelhante a reorderFeatured).
// ============================================
export const upsertCampanhaProdutos = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({
      campanhaId: z.string().uuid(),
      rows: z.array(
        z.object({
          produto_id: z.string().min(1),
          ordem: z.number().int().min(0).default(0),
        })
      ).max(50),
    }).parse(input)
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; data: CampanhaProduto[]; error?: string }> => {
    try {
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      // Busca estado anterior para auditoria
      const { data: beforeData } = await (supabaseAdmin.from("home_campanha_produtos" as any) as any)
        .select("*")
        .eq("campanha_id", input.campanhaId);

      // Limpa e reinseri
      const { error: delError } = await (supabaseAdmin.from("home_campanha_produtos" as any) as any)
        .delete()
        .eq("campanha_id", input.campanhaId);

      if (delError) {
        return { success: false, data: [], error: delError.message };
      }

      if (input.rows.length === 0) {
        logAdminAction(
          admin,
          "campanha_produtos.clear",
          "campanha",
          input.campanhaId,
          beforeData as Json,
          null,
          {}
        );
        return { success: true, data: [] };
      }

      const rows = input.rows.map((r) => ({
        campanha_id: input.campanhaId,
        produto_id: r.produto_id,
        ordem: r.ordem ?? 0,
      }));

      const { data: inserted, error } = await (supabaseAdmin.from("home_campanha_produtos" as any) as any)
        .insert(rows)
        .select("id, campanha_id, produto_id, ordem");

      if (error) {
        return { success: false, data: [], error: error.message };
      }

      logAdminAction(
        admin,
        "campanha_produtos.upsert",
        "campanha",
        input.campanhaId,
        beforeData as Json,
        inserted as Json,
        { count: inserted?.length ?? 0 }
      );

      return { success: true, data: (inserted || []) as CampanhaProduto[] };
    } catch (err: any) {
      return { success: false, data: [], error: err?.message || "erro" };
    }
  });

// ============================================
// 8. DELETE Campanha (Admin)
// Remove campanha e todos os produtos associados (ON DELETE CASCADE).
// ============================================
export const deleteCampanha = createServerFn({ method: "POST" })
  .validator((id: unknown) => z.string().uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ success: boolean; data: null; error?: string }> => {
    try {
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      // Busca estado anterior para auditoria
      const { data: beforeData } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const { error } = await (supabaseAdmin.from("home_campanha" as any) as any)
        .delete()
        .eq("id", id);

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      logAdminAction(
        admin,
        "campanha.delete",
        "campanha",
        id,
        beforeData as Json,
        null,
        {}
      );

      return { success: true, data: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "erro" };
    }
  });
