import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AdminAffiliateRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  total_sales: number;
  total_commission: number;
};

export const listAffiliates = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    success: boolean;
    data: AdminAffiliateRow[];
    error?: string;
  }> => {
    try {
      const { requireAdmin } = await import("./admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      // A tabela `affiliates` tem os dados cadastrais (nome, email, telefone,
      // instagram, status, created_at) mas NÃO as métricas. As métricas
      // (vendas, comissão) vivem na view `affiliate_dashboard_summary`.
      // Buscamos os dois e juntamos por id.
      const [base, metrics] = await Promise.all([
        supabaseAdmin
          .from("affiliates")
          .select("id, full_name, email, phone, instagram, status, created_at")
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("affiliate_dashboard_summary")
          .select("id, total_sales_amount, total_commission_earned"),
      ]);

      if (base.error) {
        console.error("listAffiliates base error:", base.error.message);
        return { success: false, data: [], error: base.error.message };
      }
      // Métricas são complementares: se a view falhar, ainda mostramos a lista.
      if (metrics.error) {
        console.error("listAffiliates metrics error:", metrics.error.message);
      }

      const metricsById = new Map<
        string,
        { total_sales_amount?: number; total_commission_earned?: number }
      >();
      for (const m of metrics.data ?? []) {
        metricsById.set((m as any).id, m as any);
      }

      const rows: AdminAffiliateRow[] = (base.data ?? []).map((a: any) => {
        const m = metricsById.get(a.id);
        return {
          id: a.id,
          full_name: a.full_name ?? "",
          email: a.email ?? "",
          phone: a.phone ?? null,
          instagram: a.instagram ?? null,
          status: a.status ?? "pending",
          created_at: a.created_at ?? "",
          total_sales: Number(m?.total_sales_amount ?? 0),
          total_commission: Number(m?.total_commission_earned ?? 0),
        };
      });

      return { success: true, data: rows };
    } catch (err: any) {
      console.error("listAffiliates exception:", err?.message || err);
      return {
        success: false,
        data: [],
        error: err?.message || "Erro ao carregar afiliados",
      };
    }
  },
);

export const approveAffiliate = createServerFn({
  method: "POST",
})
  .validator((d: unknown) =>
    z.object({ affiliateId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data: { affiliateId } }: { data: { affiliateId: string } }) => {
  try {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data, error } = await supabaseAdmin
      .from("affiliates")
      .update({
        status: "approved",
        approved_at: new Date().toISOString()
      })
      .eq("id", affiliateId)
      .select();

    if (error) {
      console.error("Erro ao aprovar afiliado:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Exception ao aprovar afiliado:", err);
    return { success: false, error: err?.message || "Erro interno" };
  }
});

export const rejectAffiliate = createServerFn({
  method: "POST",
})
  .validator((d: unknown) =>
    z.object({ affiliateId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data: { affiliateId } }: { data: { affiliateId: string } }) => {
  try {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data, error } = await supabaseAdmin
      .from("affiliates")
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString()
      })
      .eq("id", affiliateId)
      .select();

    if (error) {
      console.error("Erro ao rejeitar afiliado:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Exception ao rejeitar afiliado:", err);
    return { success: false, error: err?.message || "Erro interno" };
  }
});

export const suspendAffiliate = createServerFn({
  method: "POST",
})
  .validator((d: unknown) =>
    z.object({ affiliateId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data: { affiliateId } }: { data: { affiliateId: string } }) => {
  try {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data, error } = await supabaseAdmin
      .from("affiliates")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString()
      })
      .eq("id", affiliateId)
      .select();

    if (error) {
      console.error("Erro ao suspender afiliado:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Exception ao suspender afiliado:", err);
    return { success: false, error: err?.message || "Erro interno" };
  }
});

export type AffiliateFullDetails = {
  // Dados cadastrais
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  instagram: string | null;
  youtube: string | null;
  tiktok: string | null;
  website: string | null;
  // Endereço
  address_zip: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  // Status e código
  status: string;
  affiliate_code: string | null;
  current_tier_id: string | null;
  custom_commission_rate: number | null;
  // Pix
  pix_key_type: string | null;
  pix_key: string | null;
  // Datas
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  accepted_terms: boolean;
  accepted_terms_at: string | null;
  // Relacionados
  links: { id: string; code: string; url: string; created_at: string; clicks_count: number }[];
  clicks: { id: string; link_id: string; clicked_at: string; referrer: string | null }[];
};

export const getAffiliateDetails = createServerFn({
  method: "GET",
})
  .validator((d: unknown) =>
    z.object({ affiliateId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data: { affiliateId } }: { data: { affiliateId: string } }) => {
  try {
    const { requireAdmin } = await import("./admin-auth");
    await requireAdmin();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const [affiliateResult, linksResult, clicksResult] = await Promise.all([
      supabaseAdmin.from("affiliates").select("*").eq("id", affiliateId).single(),
      supabaseAdmin.from("affiliate_links").select("*").eq("affiliate_id", affiliateId).order("created_at", { ascending: false }),
      supabaseAdmin.from("affiliate_clicks").select("*").eq("affiliate_id", affiliateId).order("clicked_at", { ascending: false }).limit(50),
    ]);

    if (affiliateResult.error) {
      console.error("getAffiliateDetails error:", affiliateResult.error.message);
      return { success: false, error: affiliateResult.error.message };
    }

    const links = (linksResult.data ?? []).map((l: any) => ({
      id: l.id,
      code: l.code ?? "",
      url: l.url ?? "",
      created_at: l.created_at ?? "",
      clicks_count: l.clicks_count ?? 0,
    }));

    const clicks = (clicksResult.data ?? []).map((c: any) => ({
      id: c.id,
      link_id: c.link_id ?? "",
      clicked_at: c.clicked_at ?? "",
      referrer: c.referrer ?? null,
    }));

    return { success: true, data: { ...affiliateResult.data, links, clicks } as AffiliateFullDetails };
  } catch (err: any) {
    console.error("Exception ao buscar detalhes do afiliado:", err);
    return { success: false, error: err?.message || "Erro interno" };
  }
});
