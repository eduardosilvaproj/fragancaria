import { randomUUID } from "node:crypto";
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
  | "nfe_settings.update";

export type AuditEntity =
  | "product"
  | "order"
  | "refund"
  | "coupon"
  | "affiliate"
  | "store_settings"
  | "shipping_settings"
  | "payment_settings"
  | "nfe_settings";

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
  return randomUUID();
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
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
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
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
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
  const allKeys = new Set([
    ...Object.keys(beforeNormalized),
    ...Object.keys(afterNormalized),
  ]);

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

  return hasDiff
    ? { before: beforeDiff as Json, after: afterDiff as Json }
    : null;
}

/**
 * @deprecated Use diffSnapshots(before, after) para gravar só campos que
 * realmente mudaram. pickChangedFields não compara valores e grava tudo.
 */
export function pickChangedFields(
  row: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    picked[key] = row[key] ?? null;
  }
  return picked;
}
