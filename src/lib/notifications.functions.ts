import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireRole } from "@/lib/admin-auth";
import { ADMIN_AREA_ROLES } from "@/lib/admin-roles";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAdminAction } from "@/lib/admin-audit";
import { sendAdminSaleNotificationEmail } from "@/lib/email.functions";

export type NotificationEvent = 'order.approved' | 'order.shipped' | 'order.created';

export type NotificationSetting = {
  id: number;
  event: NotificationEvent;
  audience: 'customer' | 'internal';
  channel: 'email' | 'whatsapp' | 'whatsapp_group' | 'telegram';
  destination: string | null;
  enabled: boolean;
  template_ref: string | null;
};

export const listNotificationSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requireRole(ADMIN_AREA_ROLES.notifications);
  const { data, error } = await (supabaseAdmin as any).from("notification_settings").select("*");
  if (error) throw error;
  return data as NotificationSetting[];
});

export const upsertNotificationSetting = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.number().optional(),
    event: z.string(),
    audience: z.enum(['customer', 'internal']),
    channel: z.enum(['email', 'whatsapp', 'whatsapp_group', 'telegram']),
    destination: z.string().optional().nullable(),
    enabled: z.boolean(),
    template_ref: z.string().optional().nullable(),
  }))
  .handler(async ({ data }) => {
    await requireRole(ADMIN_AREA_ROLES.notifications);
    const { data: before } = await (supabaseAdmin as any).from("notification_settings").select("*").eq("id", data.id || 0).maybeSingle();

    const { data: result, error } = await (supabaseAdmin as any).from("notification_settings").upsert({
      ...data,
      id: data.id || undefined,
    }).select().single();

    if (error) throw error;

    await logAdminAction("upsert_notification_setting", { before, after: result });
    return result;
  });

export const deleteNotificationSetting = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireRole(ADMIN_AREA_ROLES.notifications);
    const { data: before } = await (supabaseAdmin as any).from("notification_settings").select("*").eq("id", data.id).single();
    const { error } = await (supabaseAdmin as any).from("notification_settings").delete().eq("id", data.id);
    if (error) throw error;
    await logAdminAction("delete_notification_setting", { before });
    return { success: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireRole(ADMIN_AREA_ROLES.notifications);
    const { data: setting, error } = await (supabaseAdmin as any)
      .from("notification_settings")
      .select("*")
      .eq("id", data.id)
      .single();

    if (error || !setting) throw new Error("Regra não encontrada");
    if (!setting.destination) throw new Error("Destino não configurado");

    // Dispara via dispatch
    if (setting.channel === 'email' && setting.audience === 'internal') {
        await sendAdminSaleNotificationEmail({
            destination: setting.destination,
            orderId: "TESTE1234 (TESTE)",
            total: 199.90,
            paymentMethod: "PIX",
            customerName: "Cliente de Teste",
            itemsCount: 2
        });
    }

    await logAdminAction("notification.test", { settingId: data.id, event: setting.event });
    return { success: true };
  });

export async function dispatchNotification(event: NotificationEvent, payload: { orderId: string }) {
  try {
    const { data: settings, error } = await (supabaseAdmin as any)
      .from("notification_settings")
      .select("*")
      .eq("event", event)
      .eq("enabled", true);

    if (error || !settings || settings.length === 0) return;

    for (const setting of settings) {
      if (setting.channel === 'email' && setting.audience === 'internal' && setting.destination) {
        // Busca dados do pedido
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, total, payment_method_id, customer_name, items")
          .eq("id", payload.orderId)
          .single();

        if (order) {
          await sendAdminSaleNotificationEmail({
            destination: setting.destination,
            orderId: order.id,
            total: order.total || 0,
            paymentMethod: order.payment_method_id || "Desconhecido",
            customerName: order.customer_name || "Cliente",
            itemsCount: Array.isArray(order.items) ? (order.items as any[]).length : 0,
          });
        }
      }
    }
  } catch (err) {
    console.error(`[dispatchNotification] falha ao disparar ${event}:`, err);
  }
}
