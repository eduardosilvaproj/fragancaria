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

      const { data, error } = await supabaseAdmin
        .from("affiliates")
        .select(
          "id, full_name, email, phone, instagram, status, created_at, total_sales_amount, total_commission_earned",
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("listAffiliates error:", error.message);
        return { success: false, data: [], error: error.message };
      }

      const rows: AdminAffiliateRow[] = (data ?? []).map((a: any) => ({
        id: a.id,
        full_name: a.full_name ?? "",
        email: a.email ?? "",
        phone: a.phone ?? null,
        instagram: a.instagram ?? null,
        status: a.status ?? "pending",
        created_at: a.created_at ?? "",
        total_sales: Number(a.total_sales_amount ?? 0),
        total_commission: Number(a.total_commission_earned ?? 0),
      }));

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
