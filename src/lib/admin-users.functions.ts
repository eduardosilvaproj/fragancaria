// Server fns para o painel /admin/usuarios.
// Mesmo padrao das outras areas admin: requireRole(ADMIN_AREA_ROLES.adminUsers)
// + supabaseAdmin (service role, bypassa RLS) + validator Zod.
//
// Seguranca: criar/alterar/desativar usuarios admin so quem tem papel 'total'.
// Nunca deletamos de auth.users nem removemos a linha de admins: o log de
// auditoria referencia user_id e apagar quebraria o historico. Desativar e
// marcar admins.is_active = false.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AdminRole } from "@/lib/admin-roles";
import type { AdminUser } from "@/lib/admin-auth";

const ROLES = ["total", "social", "logistica"] as const;
const ROLE_SCHEMA = z.enum(ROLES);

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type AdminUserRow = {
  userId: string;
  email: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
};

function mapAdminRow(r: Record<string, unknown>): AdminUserRow {
  return {
    userId: String(r.user_id ?? ""),
    email: (r.email as string | null) ?? null,
    role: (r.role as AdminRole) ?? "total",
    isActive: r.is_active !== false,
    createdAt: String(r.created_at ?? ""),
  };
}

// Gera uma senha temporaria forte (sem ambiguidade visual).
function generateTempPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  const parts = [
    pick(upper),
    pick(upper),
    pick(lower),
    pick(lower),
    pick(digits),
    pick(digits),
    pick(symbols),
    pick(symbols),
  ];
  // Embaralha Fisher-Yates
  for (let i = parts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join("");
}

function audit(
  admin: AdminUser,
  action: "admin.user_create" | "admin.user_role_change" | "admin.user_deactivate",
  entityId: string,
  metadata: Record<string, unknown>,
) {
  void (async () => {
    try {
      const { logAdminAction } = await import("@/lib/admin-audit");
      logAdminAction(admin, action, "admin", entityId, null, null, metadata);
    } catch (err) {
      console.error("[admin-users] audit failed:", err);
    }
  })();
}

export type AdminUserListResult = {
  users: AdminUserRow[];
  total: number;
};

export const listAdminUsers = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z
      .object({
        search: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; data: AdminUserListResult } | { success: false; error: string }
    > => {
      try {
        const { requireRole } = await import("@/lib/admin-auth");
        const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
        await requireRole(ADMIN_AREA_ROLES.adminUsers);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = await getDb();

        let query = db
          .from("admins")
          .select("user_id, email, role, is_active, created_at", {
            count: "exact",
          })
          .order("created_at", { ascending: true });

        if (data.search && data.search.trim().length > 0) {
          const ilike = "%" + data.search.trim().replace(/[%_]/g, (c) => "\\" + c) + "%";
          query = query.or(["email.ilike." + ilike, "user_id.ilike." + ilike].join(","));
        }

        const { data: rows, error, count } = await query;
        if (error) return { success: false, error: error.message };

        return {
          success: true,
          data: {
            users: ((rows ?? []) as Array<Record<string, unknown>>).map(mapAdminRow),
            total: count ?? 0,
          },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export type CreateAdminUserResult = {
  user: AdminUserRow;
  tempPassword: string;
};

export const createAdminUser = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(254),
        role: ROLE_SCHEMA,
      })
      .parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<
      { success: true; data: CreateAdminUserResult } | { success: false; error: string }
    > => {
      try {
        const { requireRole } = await import("@/lib/admin-auth");
        const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
        const admin = await requireRole(ADMIN_AREA_ROLES.adminUsers);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = await getDb();

        const email = data.email.toLowerCase().trim();
        const tempPassword = generateTempPassword();

        // 1. Cria o usuario no Supabase Auth (email_confirm true para poder
        //    logar com a senha temporaria; nao envia email de convite para nao
        //    vazar a senha — a tela exibe uma unica vez).
        const { data: authData, error: authError } = await db.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });
        if (authError || !authData?.user) {
          return {
            success: false,
            error: authError?.message || "falha ao criar usuario no Auth",
          };
        }

        // 2. Insere em admins. Se o email ja existir em admins (outro user_id),
        //    nao duplicamos — retorna erro sem criar lixo.
        const { error: insertError } = await db.from("admins").insert({
          user_id: authData.user.id,
          email,
          role: data.role,
          is_active: true,
        });
        if (insertError) {
          // Rollback: remove o usuario criado no Auth para nao deixar lixo.
          await db.auth.admin.deleteUser(authData.user.id);
          return {
            success: false,
            error: insertError.message,
          };
        }

        audit(admin, "admin.user_create", authData.user.id, {
          email,
          role: data.role,
        });

        return {
          success: true,
          data: {
            user: {
              userId: authData.user.id,
              email,
              role: data.role,
              isActive: true,
              createdAt: new Date().toISOString(),
            },
            tempPassword,
          },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const updateAdminUserRole = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: ROLE_SCHEMA,
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const { requireRole } = await import("@/lib/admin-auth");
      const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
      const admin = await requireRole(ADMIN_AREA_ROLES.adminUsers);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = await getDb();

      // Previne o proprio admin de tirar o proprio acesso (evita se trancar).
      if (data.userId === admin.userId && data.role !== admin.role) {
        return {
          success: false,
          error: "Você não pode alterar seu próprio papel.",
        };
      }

      const { data: before, error: fetchErr } = await db
        .from("admins")
        .select("user_id, email, role, is_active")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (fetchErr || !before) {
        return { success: false, error: "Usuário não encontrado" };
      }

      const { error } = await db
        .from("admins")
        .update({ role: data.role })
        .eq("user_id", data.userId);
      if (error) return { success: false, error: error.message };

      audit(admin, "admin.user_role_change", data.userId, {
        email: before.email,
        from: before.role,
        to: data.role,
      });

      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  });

export const setAdminUserActive = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        isActive: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const { requireRole } = await import("@/lib/admin-auth");
      const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
      const admin = await requireRole(ADMIN_AREA_ROLES.adminUsers);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = await getDb();

      // Nunca deixa o proprio admin se desativar (evita se trancar).
      if (data.userId === admin.userId && !data.isActive) {
        return {
          success: false,
          error: "Você não pode desativar o próprio acesso.",
        };
      }

      const { data: before, error: fetchErr } = await db
        .from("admins")
        .select("user_id, email, role, is_active")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (fetchErr || !before) {
        return { success: false, error: "Usuário não encontrado" };
      }

      const { error } = await db
        .from("admins")
        .update({ is_active: data.isActive })
        .eq("user_id", data.userId);
      if (error) return { success: false, error: error.message };

      // Desativar nao apaga nada (auth.users e admins ficam intactos). O
      // resolveAdmin passa a negar sessao na proxima requisicao.
      if (!data.isActive) {
        audit(admin, "admin.user_deactivate", data.userId, {
          email: before.email,
          role: before.role,
        });
      }

      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  });
