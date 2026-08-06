import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// =====================================================
// CONFIGURACOES DO PROGRAMA DE AFILIADOS
//
// A tabela affiliate_settings existe desde a migration 001 e tem
// um unico registro (id UUID, nao o padrao id=1 das settings novas).
// Ate 2026-07-27 NENHUM codigo lia ou escrevia nela: settingsService
// .getSettings() em src/lib/supabase.ts nao tinha chamador. Este
// arquivo e o primeiro leitor/escritor real.
//
// ESCOPO: expoe apenas as duas configs que o ciclo de repasse usa.
// As outras colunas (default_commission_rate, cookie_duration_days,
// auto_approve_affiliates, payout_day, support_email) seguem inertes
// — os valores equivalentes estao hardcoded no codigo. Nao as exponho
// aqui porque um campo editavel que nao muda nada e pior que campo
// nenhum. Ligar essas cinco e um item separado.
// =====================================================

// O tipo e o fallback vivem no modulo puro (affiliate-payout.ts) porque as
// telas do portal tambem precisam deles, e este arquivo importa admin-auth /
// service role — nao pode ser carregado pelo browser.
import {
  AFFILIATE_PAYOUT_SETTINGS_FALLBACK,
  type AffiliatePayoutSettings,
} from "@/lib/affiliate-payout";

export type { AffiliatePayoutSettings };
export { AFFILIATE_PAYOUT_SETTINGS_FALLBACK };

/**
 * Le as configs de repasse com o client admin (service role).
 * Uso interno por outras server fns — nao exige sessao de admin,
 * porque o fechamento e a tela do afiliado tambem precisam do prazo.
 *
 * Nao lanca: se a tabela estiver vazia ou a query falhar, devolve o
 * fallback. O ciclo de repasse nao pode parar por falta de settings.
 */
export async function readAffiliatePayoutSettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<AffiliatePayoutSettings> {
  const { data, error } = await db
    .from("affiliate_settings")
    .select("release_delay_days, min_payout_amount")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.warn("[affiliate-settings] falha ao ler settings, usando fallback", error.message);
    }
    return AFFILIATE_PAYOUT_SETTINGS_FALLBACK;
  }

  return {
    releaseDelayDays:
      data.release_delay_days ?? AFFILIATE_PAYOUT_SETTINGS_FALLBACK.releaseDelayDays,
    minPayoutAmount: Number(
      data.min_payout_amount ?? AFFILIATE_PAYOUT_SETTINGS_FALLBACK.minPayoutAmount,
    ),
  };
}

// =====================================================
// OBTER (admin)
// =====================================================

export const getAffiliateSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; data: AffiliatePayoutSettings } | { success: false; error: string }
  > => {
    try {
      const { requireRole } = await import("@/lib/admin-auth");
      const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
      await requireRole(ADMIN_AREA_ROLES.affiliateSettings);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings = await readAffiliatePayoutSettings(supabaseAdmin as any);
      return { success: true, data: settings };
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err?.status === 401 || err?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      return { success: false, error: err?.message || "Erro desconhecido" };
    }
  },
);

// =====================================================
// SALVAR (admin)
// =====================================================

export const saveAffiliateSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        releaseDelayDays: z.number().int().min(0).max(365),
        minPayoutAmount: z.number().min(0).max(100000),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; data: AffiliatePayoutSettings } | { success: false; error: string }
    > => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;

        const patch = {
          release_delay_days: data.releaseDelayDays,
          min_payout_amount: data.minPayoutAmount,
          updated_at: new Date().toISOString(),
        };

        // A tabela tem id UUID gerado, entao nao ha id fixo para upsert.
        // Le o registro existente e atualiza por id; se estiver vazia
        // (seed da 001 nao rodou), insere o primeiro.
        const { data: existing, error: readErr } = await db
          .from("affiliate_settings")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (readErr) return { success: false, error: readErr.message };

        if (existing?.id) {
          const { error } = await db
            .from("affiliate_settings")
            .update(patch)
            .eq("id", existing.id);
          if (error) return { success: false, error: error.message };
        } else {
          const { error } = await db.from("affiliate_settings").insert(patch);
          if (error) return { success: false, error: error.message };
        }

        return { success: true, data };
      } catch (e: unknown) {
        const err = e as { status?: number; message?: string };
        if (err?.status === 401 || err?.status === 403) {
          return { success: false, error: "Não autorizado" };
        }
        return { success: false, error: err?.message || "Erro desconhecido" };
      }
    },
  );
