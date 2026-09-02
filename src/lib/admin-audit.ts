import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import type { AdminUser } from "./admin-auth";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.activate"
  | "product.deactivate"
  | "product.margin.apply"
  | "order.update"
  | "refund.approve"
  | "refund.reject"
  | "coupon.create"
  | "coupon.update"
  | "coupon.deactivate"
  | "affiliate.approve"
  | "affiliate.reject"
  | "affiliate.suspend"
  | "store_settings.update"
  | "shipping_settings.update"
  | "payment_settings.update"
  | "nfe_settings.update"
  | "notification_settings.create"
  | "notification_settings.update"
  | "notification_settings.delete"
  | "zernio_accounts.create"
  | "zernio_accounts.update"
  | "zernio_accounts.delete"
  | "admin.user_create"
  | "admin.user_role_change"
  | "admin.user_deactivate"
  | "admin.user_reactivate"
  | "admin.user_password_reset"
  | "admin.user_welcome_resent"
  | "admin.user_delete"
  | "whatsapp.test_send"
  | "site_banner.create"
  | "site_banner.update"
  | "site_banner.delete"
  | "fran_recomenda.create"
  | "fran_recomenda.update"
  | "fran_recomenda.delete"
  | "campanha.create"
  | "campanha.update"
  | "campanha.delete"
  | "campanha.produtos_clear"
  | "campanha.produtos_upsert"
  | "campanha_produtos.clear"
  | "campanha_produtos.upsert";

export type AuditEntity =
  | "product"
  | "order"
  | "refund"
  | "coupon"
  | "affiliate"
  | "store_settings"
  | "shipping_settings"
  | "payment_settings"
  | "nfe_settings"
  | "notification_settings"
  | "zernio_accounts"
  | "admin"
  | "settings"
  | "site_banner"
  | "fran_recomenda"
  | "campanha";

export type AuditLogEntry = {
  user_id: string;
  action: AuditAction;
  entity_type: AuditEntity;
  entity_id: string | null;
  before_data: Json | null;
  after_data: Json | null;
  metadata: Json | null;
};

/**
 * Gera um batch_id (UUID) para correlacionar múltiplas linhas de log que
 * vieram de uma única operação em lote.
 */
export function newAuditBatchId(): string {
  return crypto.randomUUID();
}

/**
 * Registra uma ou mais ações administrativas em public.admin_action_logs.
 * Nunca deve derrubar a operação principal: erros são apenas logados no console.
 */
export function logAdminAction(
  admin: AdminUser,
  action: AuditAction,
  entityType: AuditEntity,
  entityId: string | null,
  before: Json | null,
  after: Json | null,
  metadata?: Record<string, unknown>,
): void {
  void (async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("admin_action_logs").insert({
        user_id: admin.userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        before_data: before,
        after_data: after,
        metadata: (metadata ?? null) as Json,
      });
      if (error) {
        console.error("[admin-audit] insert failed:", error.message);
      }
    } catch (err) {
      console.error("[admin-audit] unexpected error:", err);
    }
  })();
}

/**
 * Registra várias ações administrativas em um único INSERT em massa.
 * Todas as linhas recebem o mesmo batch_id dentro de metadata.
 */
export function logAdminActionBatch(
  admin: AdminUser,
  action: AuditAction,
  entityType: AuditEntity,
  items: Array<{
    entityId: string;
    before: Json | null;
    after: Json | null;
  }>,
  baseMetadata?: Record<string, unknown>,
): void {
  if (items.length === 0) return;
  const batchId = newAuditBatchId();
  const rows: AuditLogEntry[] = items.map((item) => ({
    user_id: admin.userId,
    action,
    entity_type: entityType,
    entity_id: item.entityId,
    before_data: item.before,
    after_data: item.after,
    metadata: { ...baseMetadata, batch_id: batchId },
  }));

  void (async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("admin_action_logs").insert(rows);
      if (error) {
        console.error("[admin-audit] batch insert failed:", error.message);
      }
    } catch (err) {
      console.error("[admin-audit] batch unexpected error:", err);
    }
  })();
}

/**
 * Retorna um snapshot seguro para logs de tabelas de configuração sensível.
 * Em vez dos valores, guarda apenas a lista de campos que mudaram (e seus
 * valores anteriores/posteriores mascarados como "***REDACTED***").
 */
export function redactedFieldDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> | null {
  const changed: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed[key] = {
        before: before[key] === undefined ? null : "***REDACTED***",
        after: after[key] === undefined ? null : "***REDACTED***",
      };
    }
  }
  return Object.keys(changed).length > 0 ? changed : null;
}

/**
 * Compara dois snapshots e retorna só os campos cujo valor efetivamente mudou,
 * em dois objetos separados (before/after) para passar direto a logAdminAction.
 * Valores são comparados por JSON.stringify, então arrays/JSON são comparados
 * por conteúdo, não por referência. Campos ausentes em uma das pontas viram
 * `null` no log.
 *
 * Se nenhum campo mudou (update sem alteração), retorna `null` — quem chama
 * deve pular o log.
 */
export function diffSnapshots(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { before: Json; after: Json } | null {
  const beforeNormalized = before ?? {};
  const afterNormalized = after ?? {};
  const allKeys = new Set([...Object.keys(beforeNormalized), ...Object.keys(afterNormalized)]);

  const beforeDiff: Record<string, unknown> = {};
  const afterDiff: Record<string, unknown> = {};
  let hasDiff = false;

  for (const key of allKeys) {
    const b = beforeNormalized[key] ?? null;
    const a = afterNormalized[key] ?? null;
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      beforeDiff[key] = b;
      afterDiff[key] = a;
      hasDiff = true;
    }
  }

  return hasDiff ? { before: beforeDiff as Json, after: afterDiff as Json } : null;
}

// ---------- Tipos para a tela de logs ----------

export type AuditLogRow = {
  id: number;
  user_id: string;
  admin_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Json | null;
  after_data: Json | null;
  metadata: Json | null;
  created_at: string;
};

export type ListAuditLogsInput = {
  page: number;
  pageSize: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ListAuditLogsResult = {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
};

// ---------- Server function: listar logs ----------

export const listAdminActionLogs = createServerFn({ method: "GET" })
  .validator((d: unknown) => (d ?? {}) as ListAuditLogsInput)
  .handler(async ({ data }) => {
    try {
      const { requireRole } = await import("@/lib/admin-auth");
      const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
      await requireRole(ADMIN_AREA_ROLES.auditLogs);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const page = Math.max(1, data.page);
      const pageSize = Math.min(100, Math.max(1, data.pageSize || 50));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Query base: admin_action_logs
      let query = db
        .from("admin_action_logs")
        .select(
          "id, user_id, action, entity_type, entity_id, before_data, after_data, metadata, created_at",
          { count: "exact" },
        );

      if (data.action) {
        query = query.eq("action", data.action);
      }
      if (data.dateFrom) {
        query = query.gte("created_at", data.dateFrom);
      }
      if (data.dateTo) {
        // Inclui o dia inteiro
        query = query.lte("created_at", data.dateTo + "T23:59:59.999Z");
      }

      const {
        data: rows,
        error,
        count,
      } = await query.order("created_at", { ascending: false }).range(from, to);

      if (error) {
        return { success: false as const, error: error.message };
      }

      // Busca emails dos admins envolvidos (lote único)
      const userIds = [
        ...new Set((rows ?? []).map((r: Record<string, unknown>) => r.user_id as string)),
      ];
      const { data: adminRows } = await db
        .from("admins")
        .select("user_id, email")
        .in("user_id", userIds);
      const emailMap = new Map(
        (adminRows ?? []).map((a: Record<string, unknown>) => [
          a.user_id as string,
          a.email as string | null,
        ]),
      );

      const mapped: AuditLogRow[] = (rows ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as number,
        user_id: r.user_id as string,
        admin_email: emailMap.get(r.user_id as string) ?? null,
        action: r.action as string,
        entity_type: r.entity_type as string,
        entity_id: r.entity_id as string | null,
        before_data: r.before_data as Json | null,
        after_data: r.after_data as Json | null,
        metadata: r.metadata as Json | null,
        created_at: r.created_at as string,
      }));

      return {
        success: true as const,
        data: {
          rows: mapped,
          total: count ?? 0,
          page,
          pageSize,
        } as ListAuditLogsResult,
      };
    } catch (e: unknown) {
      const status =
        typeof e === "object" && e !== null ? (e as { status?: number }).status : undefined;
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      if (status === 401 || status === 403) {
        return { success: false as const, error: "Não autorizado" };
      }
      return { success: false as const, error: message };
    }
  });
