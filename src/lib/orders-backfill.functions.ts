import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const backfillOrdersIbge = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { requireRole } = await import("@/lib/admin-auth");
      const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
      await requireRole(ADMIN_AREA_ROLES.nfe);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Busca pedidos que estao sem shipping_ibge_code
      const { data: orders, error: fetchErr } = await db
        .from("orders")
        .select("id, shipping_address")
        .is("shipping_ibge_code", null);

      if (fetchErr) {
        return { success: false, error: fetchErr.message };
      }

      if (!orders || orders.length === 0) {
        return { success: true, updatedCount: 0 };
      }

      let updatedCount = 0;

      for (const order of orders) {
        const addr = order.shipping_address as any;
        const cleanCep = String(addr?.cep || "").replace(/\D/g, "");
        let ibge: string | null = null;

        if (cleanCep.length === 8) {
          try {
            const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const viaData = await res.json();
            if (viaData && !viaData.erro && viaData.ibge) {
              ibge = String(viaData.ibge);
            }
          } catch {
            // ignora erro de rede individual no backfill
          }
        }

        if (ibge) {
          const { error: updateErr } = await db
            .from("orders")
            .update({ shipping_ibge_code: ibge })
            .eq("id", order.id);

          if (!updateErr) {
            updatedCount++;
          }
        }
      }

      return { success: true, updatedCount, totalFound: orders.length };
    } catch (err: any) {
      return { success: false, error: err?.message || "Erro inesperado no backfill" };
    }
  });
