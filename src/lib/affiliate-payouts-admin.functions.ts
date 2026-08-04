import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  availabilityCutoff,
  buildPayoutOverview,
  type CommissionRow,
  type PayoutOverviewRow,
} from "@/lib/affiliate-payout";

// =====================================================
// FECHAMENTO DE REPASSE (ADMIN)
//
// A transacao NAO vive aqui. O client Supabase fala PostgREST, que
// executa uma instrucao por request: nao ha BEGIN/COMMIT abrangendo
// "cria payout" + "marca comissoes". Fazer isso em dois requests
// permite exatamente o estado proibido — payout sem comissoes
// marcadas, ou comissoes marcadas sem payout.
//
// Por isso o fechamento e a funcao plpgsql close_affiliate_payout
// (supabase/migrations/20260727d_close_affiliate_payout.sql), cujo
// corpo roda numa transacao unica. Este arquivo so:
//   1. autentica o admin,
//   2. le prazo e minimo das settings (nunca do cliente),
//   3. chama a funcao,
//   4. traduz o resultado.
//
// O LOTE NUNCA VEM DAQUI: passamos apenas o corte de data. A lista de
// comissoes e remontada e travada dentro da transacao. Uma lista
// calculada aqui estaria velha no instante em que chegasse ao banco.
// =====================================================

/** A montagem vive em affiliate-payout.ts (puro, testavel sem banco). */
export type AffiliateAvailableRow = PayoutOverviewRow;

export type ClosePayoutResult = {
  affiliateId: string;
  payoutId: string | null;
  salesCount: number;
  amount: number;
  periodStart: string | null;
  periodEnd: string | null;
  /** Preenchido quando nada foi fechado (sem disponivel, ou abaixo do minimo). */
  skippedReason: string | null;
};

// =====================================================
// PANORAMA: o que da para fechar, por afiliado
// =====================================================

export const getAffiliatePayoutOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    | {
        success: true;
        data: {
          affiliates: AffiliateAvailableRow[];
          releaseDelayDays: number;
          minPayoutAmount: number;
        };
      }
    | { success: false; error: string }
  > => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { readAffiliatePayoutSettings } = await import("@/lib/affiliate-settings.functions");
      const settings = await readAffiliatePayoutSettings(db);

      const [affiliatesResult, salesResult] = await Promise.all([
        db
          .from("affiliates")
          .select("id, full_name, email, affiliate_code, pix_key, pix_key_type, status")
          .in("status", ["approved"]),
        db
          .from("affiliate_sales")
          .select("id, affiliate_id, status, confirmed_at, commission_amount, payout_id"),
      ]);

      if (affiliatesResult.error) {
        return { success: false, error: affiliatesResult.error.message };
      }
      if (salesResult.error) {
        return { success: false, error: salesResult.error.message };
      }

      // Montagem pura: a MESMA regra que o fechamento usa.
      // Banco vazio => lista vazia, sem ramo especial.
      const rows = buildPayoutOverview(
        affiliatesResult.data || [],
        (salesResult.data || []) as Array<CommissionRow & { affiliate_id: string }>,
        settings,
        new Date(),
      );

      return {
        success: true,
        data: {
          affiliates: rows,
          releaseDelayDays: settings.releaseDelayDays,
          minPayoutAmount: settings.minPayoutAmount,
        },
      };
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err?.status === 401 || err?.status === 403 || err?.message === "NAO_AUTORIZADO") {
        return { success: false, error: "Não autorizado" };
      }
      return { success: false, error: err?.message || "Erro desconhecido" };
    }
  },
);

// =====================================================
// FECHAR UM AFILIADO
// =====================================================

/**
 * Chama a funcao transacional. O cutoff e SEMPRE derivado das settings
 * aqui no servidor — nunca aceito do cliente, senao um cutoff no futuro
 * liberaria comissao dentro do prazo.
 */
async function runClose(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  affiliateId: string,
  releaseDelayDays: number,
  minPayoutAmount: number,
  notes: string | null,
  now: Date,
): Promise<ClosePayoutResult> {
  const { data, error } = await db.rpc("close_affiliate_payout", {
    p_affiliate_id: affiliateId,
    p_cutoff: availabilityCutoff(releaseDelayDays, now),
    p_min_amount: minPayoutAmount,
    p_notes: notes,
  });

  if (error) throw new Error(error.message);

  // RETURNS TABLE chega como array de uma linha.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("close_affiliate_payout não retornou resultado");

  return {
    affiliateId,
    payoutId: row.out_payout_id ?? null,
    salesCount: Number(row.out_sales_count ?? 0),
    amount: Number(row.out_amount ?? 0),
    periodStart: row.out_period_start ?? null,
    periodEnd: row.out_period_end ?? null,
    skippedReason: row.out_skipped_reason ?? null,
  };
}

export const closeAffiliatePayout = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        affiliateId: z.string().uuid(),
        notes: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: true; data: ClosePayoutResult } | { success: false; error: string }> => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;

        const { readAffiliatePayoutSettings } = await import("@/lib/affiliate-settings.functions");
        const settings = await readAffiliatePayoutSettings(db);

        const result = await runClose(
          db,
          data.affiliateId,
          settings.releaseDelayDays,
          settings.minPayoutAmount,
          data.notes ?? null,
          new Date(),
        );

        return { success: true, data: result };
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 401 || err?.status === 403 || err?.message === "NAO_AUTORIZADO") {
          return { success: false, error: "Não autorizado" };
        }
        return { success: false, error: err?.message || "Erro desconhecido" };
      }
    },
  );

// =====================================================
// FECHAR TODOS OS ELEGIVEIS
// =====================================================

export const closeAllAffiliatePayouts = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({ notes: z.string().max(500).optional() })
      .optional()
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | {
          success: true;
          data: { closed: ClosePayoutResult[]; skipped: ClosePayoutResult[]; failed: Array<{ affiliateId: string; error: string }> };
        }
      | { success: false; error: string }
    > => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;

        const { readAffiliatePayoutSettings } = await import("@/lib/affiliate-settings.functions");
        const settings = await readAffiliatePayoutSettings(db);
        const now = new Date();

        // Candidatos: quem tem comissao confirmada, sem repasse, com o
        // prazo cumprido. Filtro no banco para nao varrer a tabela toda.
        const { data: candidates, error } = await db
          .from("affiliate_sales")
          .select("affiliate_id")
          .eq("status", "confirmed")
          .is("payout_id", null)
          .not("confirmed_at", "is", null)
          .lte("confirmed_at", availabilityCutoff(settings.releaseDelayDays, now));

        if (error) return { success: false, error: error.message };

        const affiliateIds = [
          ...new Set(
            (candidates as Array<{ affiliate_id: string }> | null)?.map((c) => c.affiliate_id) ??
              [],
          ),
        ];

        const closed: ClosePayoutResult[] = [];
        const skipped: ClosePayoutResult[] = [];
        const failed: Array<{ affiliateId: string; error: string }> = [];

        // Sequencial de proposito: cada afiliado e uma transacao propria.
        // Um afiliado abaixo do minimo, ou um erro isolado, nao pode
        // derrubar o fechamento dos outros.
        for (const affiliateId of affiliateIds) {
          try {
            const result = await runClose(
              db,
              affiliateId as string,
              settings.releaseDelayDays,
              settings.minPayoutAmount,
              data?.notes ?? null,
              now,
            );
            if (result.payoutId) closed.push(result);
            else skipped.push(result);
          } catch (e: unknown) {
            const err = e as { message?: string };
            console.error("[closeAllAffiliatePayouts] falha em um afiliado", {
              affiliateId,
              error: err?.message,
            });
            failed.push({
              affiliateId: affiliateId as string,
              error: err?.message || "Erro desconhecido",
            });
          }
        }

        return { success: true, data: { closed, skipped, failed } };
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 401 || err?.status === 403 || err?.message === "NAO_AUTORIZADO") {
          return { success: false, error: "Não autorizado" };
        }
        return { success: false, error: err?.message || "Erro desconhecido" };
      }
    },
  );
