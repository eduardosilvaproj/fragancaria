import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import type { AdminUser } from "@/lib/admin-auth";
import type { Json } from "@/integrations/supabase/types";

// Schema base do banner
const baseBannerSchema = z.object({
  slot: z.enum(["hero", "faixa_meio", "ticker"]),
  ordem: z.number().int().default(0),
  ativo: z.boolean().default(false),
  kicker: z.string().optional().nullable(),
  titulo: z.string().optional().nullable(),
  subtitulo: z.string().optional().nullable(),
  cta_texto: z.string().optional().nullable(),
  cta_url: z.string().refine(val => !val || val.startsWith("/") || val.startsWith("https://"), {
    message: "URL deve começar com / (relativa) ou https://"
  }).optional().nullable(),
  cta2_texto: z.string().optional().nullable(),
  cta2_url: z.string().refine(val => !val || val.startsWith("/") || val.startsWith("https://"), {
    message: "URL do segundo botão deve começar com / (relativa) ou https://"
  }).optional().nullable(),
  imagem_url: z.string().refine(val => !val || val.startsWith("/") || val.startsWith("https://"), {
    message: "URL da imagem deve começar com / (relativa) ou https://"
  }).optional().nullable(),
  imagem_mobile_url: z.string().refine(val => !val || val.startsWith("/") || val.startsWith("https://"), {
    message: "URL da imagem mobile deve começar com / (relativa) ou https://"
  }).optional().nullable(),
  imagem_alt: z.string().optional().nullable(),
  inicia_em: z.string().optional().nullable(),
  termina_em: z.string().optional().nullable(),
});

const bannerSchema = baseBannerSchema.refine(data => {
  if ((data.imagem_url || data.imagem_mobile_url) && (!data.imagem_alt || data.imagem_alt.trim() === "")) {
    return false;
  }
  return true;
}, {
  message: "imagem_alt é obrigatório quando há imagem informada",
  path: ["imagem_alt"]
});

export type SiteBanner = {
  id: string;
  slot: "hero" | "faixa_meio" | "ticker";
  ordem: number;
  ativo: boolean;
  kicker?: string | null;
  titulo?: string | null;
  subtitulo?: string | null;
  cta_texto?: string | null;
  cta_url?: string | null;
  cta2_texto?: string | null;
  cta2_url?: string | null;
  imagem_url?: string | null;
  imagem_mobile_url?: string | null;
  imagem_alt?: string | null;
  inicia_em?: string | null;
  termina_em?: string | null;
  created_at?: string;
  updated_at?: string;
};

// 1. GET Banners Ativos (público, sem auth, com whitelist de colunas)
export const getBannersAtivos = createServerFn({ method: "GET" })
  .validator((slot?: string) => slot)
  .handler(async ({ data: slotParam }) => {
    try {
      const now = new Date().toISOString();
      let query = (supabaseAdmin.from("site_banners" as any) as any)
        .select("id, slot, ordem, ativo, kicker, titulo, subtitulo, cta_texto, cta_url, cta2_texto, cta2_url, imagem_url, imagem_mobile_url, imagem_alt")
        .eq("ativo", true)
        .or(`inicia_em.is.null,inicia_em.lte.${now}`)
        .or(`termina_em.is.null,termina_em.gte.${now}`)
        .order("ordem", { ascending: true });

      if (slotParam) {
        query = query.eq("slot", slotParam);
      }

      const { data, error } = await query;

      if (error) {
        console.error("getBannersAtivos error:", error.message);
        return { success: false, data: [] as SiteBanner[], error: error.message };
      }

      // Normalizar nulls para undefined no tipo retornado
      const normalized = (data || []).map((banner: any) => ({
        ...banner,
        cta_texto: banner.cta_texto ?? null,
        cta_url: banner.cta_url ?? null,
        cta2_texto: banner.cta2_texto ?? null,
        cta2_url: banner.cta2_url ?? null,
      }));

      return { success: true, data: normalized as SiteBanner[] };
    } catch (err: any) {
      console.error("getBannersAtivos exception:", err?.message || err);
      return { success: false, data: [] as SiteBanner[], error: err?.message || "Erro desconhecido" };
    }
  });

// 2. GET Todos Banners (Admin)
export const getAdminBanners = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const admin = await requireAdmin();
      const { data, error } = await (supabaseAdmin.from("site_banners" as any) as any)
        .select("*")
        .order("slot", { ascending: true })
        .order("ordem", { ascending: true });

      if (error) {
        return { success: false, data: [] as SiteBanner[], error: error.message };
      }

      return { success: true, data: (data || []) as SiteBanner[] };
    } catch (err: any) {
      return { success: false, data: [] as SiteBanner[], error: err?.message || "Erro de permissão" };
    }
  });

// 3. CREATE Banner (Admin)
export const createBanner = createServerFn({ method: "POST" })
  .validator((input: unknown) => bannerSchema.parse(input))
  .handler(async ({ data: inputData }) => {
    try {
      const admin = await requireAdmin();
      const { data, error } = await (supabaseAdmin.from("site_banners" as any) as any)
        .insert([inputData])
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      logAdminAction(
        admin,
        "site_banner.create",
        "site_banner",
        data.id,
        null,
        data as Json,
        { slot: data.slot, titulo: data.titulo }
      );

      return { success: true, data: data as SiteBanner };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Erro ao criar banner" };
    }
  });

// 4. UPDATE Banner (Admin)
export const updateBanner = createServerFn({ method: "POST" })
  .validator((input: { id: string; [key: string]: any }) => {
    const updateSchema = z.object({
      id: z.string().uuid(),
      ...baseBannerSchema.shape
    }).refine(data => {
      if ((data.imagem_url || data.imagem_mobile_url) && (!data.imagem_alt || data.imagem_alt.trim() === "")) {
        return false;
      }
      return true;
    }, {
      message: "imagem_alt é obrigatório quando há imagem informada",
      path: ["imagem_alt"]
    });
    return updateSchema.parse(input);
  })
  .handler(async ({ data: inputData }) => {
    try {
      const admin = await requireAdmin();
      const { id, ...updateFields } = inputData;

      // Busca o estado anterior para auditoria
      const { data: beforeData } = await (supabaseAdmin.from("site_banners" as any) as any)
        .select("*")
        .eq("id", id)
        .single();

      const { data, error } = await (supabaseAdmin.from("site_banners" as any) as any)
        .update({ ...updateFields, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      logAdminAction(
        admin,
        "site_banner.update",
        "site_banner",
        id,
        beforeData as Json,
        data as Json,
        { slot: data.slot, titulo: data.titulo }
      );

      return { success: true, data: data as SiteBanner };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "Erro ao atualizar banner" };
    }
  });

// 5. DELETE Banner (Admin)
export const deleteBanner = createServerFn({ method: "POST" })
  .validator((id: string) => z.string().uuid().parse(id))
  .handler(async ({ data: bannerId }) => {
    try {
      const admin = await requireAdmin();

      // Busca o estado anterior para auditoria
      const { data: beforeData } = await (supabaseAdmin.from("site_banners" as any) as any)
        .select("*")
        .eq("id", bannerId)
        .single();

      const { error } = await (supabaseAdmin.from("site_banners" as any) as any)
        .delete()
        .eq("id", bannerId);

      if (error) {
        return { success: false, error: error.message };
      }

      logAdminAction(
        admin,
        "site_banner.delete",
        "site_banner",
        bannerId,
        beforeData as Json,
        null,
        {}
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Erro ao excluir banner" };
    }
  });
