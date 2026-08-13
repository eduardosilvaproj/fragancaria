import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireRole } from "@/lib/admin-auth";
import { ADMIN_AREA_ROLES } from "@/lib/admin-roles";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAdminAction } from "@/lib/admin-audit";

export type ZernioAccount = {
  id: number;
  platform: 'instagram' | 'whatsapp' | 'facebook' | 'telegram';
  account_id: string;
  label: string;
  phone_number: string | null;
  mode: 'cloud_api_only' | 'coexistence' | null;
  is_active: boolean;
};

export const listZernioAccounts = createServerFn({ method: "GET" }).handler(async () => {
  await requireRole(ADMIN_AREA_ROLES.integrations);
  const { data, error } = await (supabaseAdmin as any).from("zernio_accounts").select("*");
  if (error) throw error;
  return data as ZernioAccount[];
});

export const upsertZernioAccount = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.number().optional(),
    platform: z.enum(['instagram', 'whatsapp', 'facebook', 'telegram']),
    account_id: z.string(),
    label: z.string(),
    phone_number: z.string().optional().nullable(),
    mode: z.enum(['cloud_api_only', 'coexistence']).optional().nullable(),
    is_active: z.boolean().default(true),
  }))
  .handler(async ({ data }) => {
    const admin = await requireRole(ADMIN_AREA_ROLES.integrations);
    const { data: before } = await (supabaseAdmin as any).from("zernio_accounts").select("*").eq("id", data.id || 0).maybeSingle();

    const { data: result, error } = await (supabaseAdmin as any).from("zernio_accounts").upsert({
      ...data,
      id: data.id || undefined,
    }).select().single();

    if (error) throw error;

    await logAdminAction(
      admin,
      data.id ? "zernio_accounts.update" : "zernio_accounts.create",
      "zernio_accounts",
      String(result.id),
      (before ?? null) as any,
      (result ?? null) as any,
    );
    return result;
  });

export const deleteZernioAccount = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const admin = await requireRole(ADMIN_AREA_ROLES.integrations);
    const { data: before } = await (supabaseAdmin as any).from("zernio_accounts").select("*").eq("id", data.id).single();
    const { error } = await (supabaseAdmin as any).from("zernio_accounts").delete().eq("id", data.id);
    if (error) throw error;
    await logAdminAction(
      admin,
      "zernio_accounts.delete",
      "zernio_accounts",
      String(data.id),
      (before ?? null) as any,
      null,
    );
    return { success: true };
  });
