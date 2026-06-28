import { createServerFn } from "@tanstack/react-start";

// Painel administrativo de afiliados — somente leitura por enquanto.
// As ações destrutivas (aprovar/rejeitar/suspender) dependem de autenticação
// no /admin, que ainda não existe. Quando a auth for definida, adicionar
// server functions de mutação protegidas por ela.

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
