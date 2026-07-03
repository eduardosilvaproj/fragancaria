import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Server fns para a área "Minha Conta".
// A RLS policy `orders_select_own` (migration 20260702_orders_user_id.sql)
// filtra os pedidos por auth.uid() = user_id, então o user só vê os
// próprios pedidos — sem precisar filtrar manualmente no .eq().

export type MyOrderRow = {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  shipping_price: number;
  discount: number;
  created_at: string;
  payment_method: string;
  customer_email: string;
  items: any[] | null;
};

export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{ success: boolean; data: MyOrderRow[]; error?: string }> => {
      try {
        const { supabase } = context as unknown as { supabase: any };
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, status, total, subtotal, shipping_price, discount, created_at, payment_method, customer_email, items"
          )
          .order("created_at", { ascending: false });

        if (error) {
          return { success: false, data: [], error: error.message };
        }
        return { success: true, data: (data ?? []) as MyOrderRow[] };
      } catch (err: any) {
        return {
          success: false,
          data: [],
          error: err?.message || "Erro ao carregar pedidos",
        };
      }
    }
  );

// Busca um pedido pelo id (do próprio user). A RLS garante que só retorna
// pedidos cujo user_id = auth.uid() — não vazaria pedidos alheios.
export const getMyOrderById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
      data,
    }): Promise<{ success: boolean; data: MyOrderRow | null; error?: string }> => {
      try {
        const { supabase } = context as unknown as { supabase: any };
        const orderId = String((data as any)?.orderId ?? "").trim();
        if (!orderId) {
          return { success: false, data: null, error: "orderId é obrigatório" };
        }
        const { data: row, error } = await supabase
          .from("orders")
          .select(
            "id, status, total, subtotal, shipping_price, discount, created_at, payment_method, customer_email, items"
          )
          .eq("id", orderId)
          .maybeSingle();

        if (error) {
          return { success: false, data: null, error: error.message };
        }
        return { success: true, data: (row as MyOrderRow) ?? null };
      } catch (err: any) {
        return {
          success: false,
          data: null,
          error: err?.message || "Erro ao carregar pedido",
        };
      }
    }
  );
