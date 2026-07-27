// =====================================================
// DISPONIBILIDADE DE COMISSAO — LOGICA PURA
//
// Uma comissao NAO tem status "disponivel" no banco. Disponibilidade
// e DERIVADA de tres coisas:
//
//   status = 'confirmed'  AND  payout_id IS NULL
//   AND  confirmed_at + release_delay_days <= agora
//
// Guardar um status 'available' exigiria um job periodico virando
// linhas de 'confirmed' para 'available' — mais uma engrenagem para
// falhar em silencio. Derivar e sempre correto por construcao.
//
// Este modulo nao toca banco de proposito: e a mesma regra usada pelo
// portal do afiliado (tres numeros), pelo admin (o que da para fechar)
// e pelo fechamento (quais linhas entram no lote). Uma regra, um lugar.
// =====================================================

export type AffiliatePayoutSettings = {
  /**
   * Dias corridos apos affiliate_sales.confirmed_at (data de aprovacao
   * do pagamento) para a comissao ficar DISPONIVEL para repasse.
   * Nao confundir com payout_day, que e dia do mes e segue inerte.
   */
  releaseDelayDays: number;
  /** Valor minimo acumulado em comissoes disponiveis para gerar um repasse. */
  minPayoutAmount: number;
};

/** Usado quando a tabela de settings esta vazia ou ilegivel. */
export const AFFILIATE_PAYOUT_SETTINGS_FALLBACK: AffiliatePayoutSettings = {
  releaseDelayDays: 15,
  minPayoutAmount: 50,
};

export type CommissionRow = {
  id: string;
  status: string | null;
  /** Data de aprovacao do pagamento. NULL = nunca fica disponivel (ver nota abaixo). */
  confirmed_at: string | null;
  commission_amount: number | string | null;
  payout_id: string | null;
};

export type CommissionBucket = "pending" | "available" | "paid" | "excluded";

/**
 * Momento em que uma comissao confirmada fica disponivel para repasse.
 * Dias CORRIDOS (nao uteis) somados a data de aprovacao do pagamento.
 */
export function releaseDate(confirmedAt: string, releaseDelayDays: number): Date {
  const base = new Date(confirmedAt);
  const release = new Date(base.getTime());
  release.setUTCDate(release.getUTCDate() + releaseDelayDays);
  return release;
}

/**
 * Em qual dos tres numeros esta comissao entra.
 *
 * - "paid"      : ja repassada (status 'paid')
 * - "available" : devida, prazo cumprido, ainda sem repasse
 * - "pending"   : devida, dentro do prazo
 * - "excluded"  : cancelled / refunded — fora das contas
 *
 * Nota sobre confirmed_at NULL: cai em "pending" e fica preso ali para
 * sempre. Isso e intencional — melhor uma comissao visivelmente parada
 * do que uma liberada com data inventada. O webhook passou a gravar
 * confirmed_at em 2026-07-27; linhas anteriores a isso nao existem mais
 * (eram 2 linhas de teste, apagadas).
 */
export function bucketOf(
  sale: CommissionRow,
  releaseDelayDays: number,
  now: Date,
): CommissionBucket {
  const status = sale.status ?? "pending";

  if (status === "cancelled" || status === "refunded") return "excluded";
  if (status === "paid") return "paid";

  // Uma comissao ja ligada a um repasse nao pode ser oferecida de novo,
  // mesmo que o status tenha ficado atras (defesa contra fechamento
  // parcial). Conta como paga.
  if (sale.payout_id) return "paid";

  if (status !== "confirmed") return "pending"; // inclui o legado 'pending'
  if (!sale.confirmed_at) return "pending";

  return releaseDate(sale.confirmed_at, releaseDelayDays) <= now ? "available" : "pending";
}

/** Soma em centavos e volta para reais — evita drift de float ao acumular. */
export function sumAmounts(values: Array<number | string | null>): number {
  const cents = values.reduce((acc: number, v) => {
    const n = typeof v === "string" ? Number(v) : (v ?? 0);
    if (!Number.isFinite(n)) return acc;
    return acc + Math.round(n * 100);
  }, 0);
  return cents / 100;
}

export type CommissionSummary = {
  /** Devida, ainda dentro do prazo de liberacao. */
  pendingTotal: number;
  pendingCount: number;
  /** Liberada, aguardando repasse. */
  availableTotal: number;
  availableCount: number;
  /** Ja repassada. */
  paidTotal: number;
  paidCount: number;
  /** Ids das comissoes disponiveis — e esta lista que o fechamento consome. */
  availableIds: string[];
  /** Proxima data de liberacao entre as pendentes (ISO), ou null. */
  nextReleaseAt: string | null;
};

export function summarizeCommissions(
  sales: CommissionRow[],
  releaseDelayDays: number,
  now: Date = new Date(),
): CommissionSummary {
  const pending: CommissionRow[] = [];
  const available: CommissionRow[] = [];
  const paid: CommissionRow[] = [];

  for (const sale of sales) {
    switch (bucketOf(sale, releaseDelayDays, now)) {
      case "pending":
        pending.push(sale);
        break;
      case "available":
        available.push(sale);
        break;
      case "paid":
        paid.push(sale);
        break;
      case "excluded":
        break;
    }
  }

  let nextRelease: Date | null = null;
  for (const sale of pending) {
    if (!sale.confirmed_at || sale.status !== "confirmed") continue;
    const at = releaseDate(sale.confirmed_at, releaseDelayDays);
    if (!nextRelease || at < nextRelease) nextRelease = at;
  }

  return {
    pendingTotal: sumAmounts(pending.map((s) => s.commission_amount)),
    pendingCount: pending.length,
    availableTotal: sumAmounts(available.map((s) => s.commission_amount)),
    availableCount: available.length,
    paidTotal: sumAmounts(paid.map((s) => s.commission_amount)),
    paidCount: paid.length,
    availableIds: available.map((s) => s.id),
    nextReleaseAt: nextRelease ? nextRelease.toISOString() : null,
  };
}

/**
 * Data-limite de confirmacao para uma comissao estar disponivel agora.
 * Serve para empurrar o filtro para o banco:
 *
 *   .eq('status','confirmed').is('payout_id',null)
 *   .lte('confirmed_at', cutoffISO)
 */
export function availabilityCutoff(releaseDelayDays: number, now: Date = new Date()): string {
  const cutoff = new Date(now.getTime());
  cutoff.setUTCDate(cutoff.getUTCDate() - releaseDelayDays);
  return cutoff.toISOString();
}

/** Um afiliado so fecha repasse se o disponivel alcancar o minimo. */
export function meetsMinimum(availableTotal: number, minPayoutAmount: number): boolean {
  return Math.round(availableTotal * 100) >= Math.round(minPayoutAmount * 100);
}

// =====================================================
// PANORAMA POR AFILIADO (admin)
//
// Montagem pura para o painel de fechamento: recebe as duas listas
// cruas e devolve as linhas prontas. Fica aqui — e nao dentro da
// server fn — para o estado vazio ser testavel sem banco.
// =====================================================

export type PayoutOverviewAffiliate = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  affiliate_code?: string | null;
  pix_key?: string | null;
  pix_key_type?: string | null;
};

export type PayoutOverviewRow = {
  affiliateId: string;
  fullName: string;
  email: string;
  affiliateCode: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  pendingTotal: number;
  pendingCount: number;
  availableTotal: number;
  availableCount: number;
  paidTotal: number;
  paidCount: number;
  nextReleaseAt: string | null;
  /** Se o disponivel alcanca o minimo configurado — o botao de fechar depende disto. */
  canClose: boolean;
};

export function buildPayoutOverview(
  affiliates: PayoutOverviewAffiliate[],
  sales: Array<CommissionRow & { affiliate_id: string }>,
  settings: AffiliatePayoutSettings,
  now: Date = new Date(),
): PayoutOverviewRow[] {
  const byAffiliate = new Map<string, CommissionRow[]>();
  for (const sale of sales) {
    const list = byAffiliate.get(sale.affiliate_id);
    if (list) list.push(sale);
    else byAffiliate.set(sale.affiliate_id, [sale]);
  }

  const rows = affiliates.map((aff) => {
    const summary = summarizeCommissions(
      byAffiliate.get(aff.id) || [],
      settings.releaseDelayDays,
      now,
    );
    return {
      affiliateId: aff.id,
      fullName: aff.full_name ?? "",
      email: aff.email ?? "",
      affiliateCode: aff.affiliate_code ?? null,
      pixKey: aff.pix_key ?? null,
      pixKeyType: aff.pix_key_type ?? null,
      pendingTotal: summary.pendingTotal,
      pendingCount: summary.pendingCount,
      availableTotal: summary.availableTotal,
      availableCount: summary.availableCount,
      paidTotal: summary.paidTotal,
      paidCount: summary.paidCount,
      nextReleaseAt: summary.nextReleaseAt,
      canClose:
        summary.availableCount > 0 &&
        meetsMinimum(summary.availableTotal, settings.minPayoutAmount),
    };
  });

  // Quem tem mais disponivel primeiro; depois quem tem mais pendente.
  rows.sort((a, b) => b.availableTotal - a.availableTotal || b.pendingTotal - a.pendingTotal);
  return rows;
}
