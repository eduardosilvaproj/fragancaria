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

const ROLE_LABELS: Record<string, string> = {
  total: "Total",
  social: "Social",
  logistica: "Logística",
};

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
  action:
    | "admin.user_create"
    | "admin.user_role_change"
    | "admin.user_deactivate"
    | "admin.user_reactivate"
    | "admin.user_password_reset"
    | "admin.user_welcome_resent"
    | "admin.user_delete",
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
  tempPassword: string | null;
  message?: string;
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

        // 0. Se o email ja tem acesso admin, e erro (nao duplica linha).
        const { data: existingAdmin, error: existingAdminErr } = await db
          .from("admins")
          .select("user_id, email")
          .eq("email", email)
          .maybeSingle();
        if (existingAdminErr) {
          return { success: false, error: "Falha ao verificar e-mail existente." };
        }
        if (existingAdmin) {
          return {
            success: false,
            error: "Este e-mail já tem acesso como admin.",
          };
        }

        let userId: string | null = null;
        let alreadyExisted = false;

        // 2. Tenta criar no Supabase Auth. Se o email ja estiver cadastrado
        //    (ex.: cliente que vira funcionario), o createUser recusa — nesse
        //    caso recuperamos o usuario existente e seguimos como caminho valido.
        const { data: created, error: createErr } = await db.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });
        if (createErr) {
          const { data: existingUser, error: lookupErr } = await db.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const userRecord = !lookupErr
            ? (existingUser?.users ?? []).find(
                (u: { email?: string | null }) => (u.email ?? "").toLowerCase() === email,
              )
            : undefined;
          if (userRecord?.id) {
            userId = userRecord.id;
            alreadyExisted = true;
          } else {
            return {
              success: false,
              error: "Não foi possível criar o usuário: e-mail já cadastrado e não localizável.",
            };
          }
        } else if (created?.user) {
          userId = created.user.id;
        }

        if (!userId) {
          return { success: false, error: "Falha ao criar usuário no Auth." };
        }

        // 3. Insere em admins usando o user_id (novo ou existente). Para usuário
        //    que já existia, não trocamos a senha do Auth — entra com a senha que
        //    já tem. is_active true por padrão.
        const { error: insertError } = await db.from("admins").insert({
          user_id: userId,
          email,
          role: data.role,
          is_active: true,
        });
        if (insertError) {
          // Se acabamos de criar no Auth, rollback para não deixar lixo.
          if (!alreadyExisted) {
            await db.auth.admin.deleteUser(userId);
          }
          return { success: false, error: insertError.message };
        }

        audit(admin, "admin.user_create", userId, {
          email,
          role: data.role,
          already_existed: alreadyExisted,
        });

        // Envia e-mail de boas-vindas (senha temporaria) se nao for usuario existente
        if (!alreadyExisted) {
          void (async () => {
            try {
              const { sendAdminWelcomeEmail } = await import("@/lib/email.functions");
              const base = process.env.PUBLIC_URL || "https://www.fragranciaria.com";
              const roleLabel = ROLE_LABELS[data.role] || data.role;
              await sendAdminWelcomeEmail({
                email,
                name: email.split("@")[0],
                role: roleLabel,
                tempPassword,
              });
            } catch (err) {
              console.error("[admin-users] falha ao enviar e-mail de boas-vindas", err);
            }
          })();
        }

        return {
          success: true,
          data: {
            user: {
              userId,
              email,
              role: data.role,
              isActive: true,
              createdAt: new Date().toISOString(),
            },
            tempPassword: alreadyExisted ? null : tempPassword,
            message: alreadyExisted
              ? `E-mail já existia. A pessoa entra com a senha que já tem (papel ${data.role}).`
              : undefined,
          },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

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
      } else {
        audit(admin, "admin.user_reactivate", data.userId, {
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

export const resetAdminUserPassword = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(
    async ({ data }): Promise<
      | { success: true; data: { tempPassword: string; message: string } }
      | { success: false; error: string }
    > => {
      try {
        const { requireRole } = await import("@/lib/admin-auth");
        const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
        const admin = await requireRole(ADMIN_AREA_ROLES.adminUsers);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = await getDb();

        const { data: row, error: fetchErr } = await db
          .from("admins")
          .select("user_id, email, role, is_active")
          .eq("user_id", data.userId)
          .maybeSingle();
        if (fetchErr || !row) {
          return { success: false, error: "Usuário não encontrado" };
        }

        const tempPassword = generateTempPassword();
        const { error: resetErr } = await db.auth.admin.updateUserById(data.userId, {
          password: tempPassword,
        });
        if (resetErr) {
          return { success: false, error: resetErr.message };
        }

        audit(admin, "admin.user_password_reset", data.userId, {
          email: row.email,
          role: row.role,
        });

        return {
          success: true,
          data: {
            tempPassword,
            message: row.email
              ? `Senha temporária gerada para ${row.email}. A pessoa entra com essa senha uma vez.`
              : "Senha temporária gerada.",
          },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const changeAdminPassword = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
      .parse(d),
  )
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        const { changeAdminPassword } = await import("@/lib/admin-auth");
        await changeAdminPassword(data.currentPassword, data.newPassword);
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const resendAdminWelcomeEmail = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({ userId: z.string().uuid() })
      .parse(d),
  )
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        const { requireRole } = await import("@/lib/admin-auth");
        const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
        await requireRole(ADMIN_AREA_ROLES.adminUsers);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = await getDb();

        const { data: row, error: rowErr } = await db
          .from("admins")
          .select("user_id, email, role")
          .eq("user_id", data.userId)
          .maybeSingle();
        if (rowErr || !row) {
          return { success: false, error: "Usuário não encontrado" };
        }

        const { sendAdminWelcomeEmail } = await import("@/lib/email.functions");
        const roleLabel = ROLE_LABELS[row.role] || row.role;
        const tempPassword = crypto.randomUUID().slice(0, 12);
        await sendAdminWelcomeEmail({
          email: row.email ?? "",
          name: row.email?.split("@")[0] ?? "admin",
          role: roleLabel,
          tempPassword,
        });

        audit(await requireRole(ADMIN_AREA_ROLES.adminUsers), "admin.user_welcome_resent", row.user_id, {
          email: row.email,
          role: row.role,
        });

        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );

export const deleteAdminUser = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({ userId: z.string().uuid() })
      .parse(d),
  )
  .handler(
    async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
      try {
        const { requireRole } = await import("@/lib/admin-auth");
        const { ADMIN_AREA_ROLES } = await import("@/lib/admin-roles");
        const admin = await requireRole(ADMIN_AREA_ROLES.adminUsers);
        const db = await getDb();

        // Impede o próprio usuário de se excluir (ficaria sem admin no sistema)
        if (data.userId === admin.userId) {
          return { success: false, error: "Você não pode excluir o próprio usuário." };
        }

        const { data: row, error: rowErr } = await db
          .from("admins")
          .select("user_id, email, role")
          .eq("user_id", data.userId)
          .maybeSingle();
        if (rowErr || !row) {
          return { success: false, error: "Usuário não encontrado" };
        }

        // Remove o acesso ao painel. NÃO apaga de auth.users (a conta do
        // provedor/loja continua existindo) e registra auditoria antes da
        // remoção, para preservar histórico de quem foi removido.
        audit(admin, "admin.user_delete", row.user_id, {
          email: row.email,
          role: row.role,
        });

        const { error } = await db.from("admins").delete().eq("user_id", data.userId);
        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "erro";
        return { success: false, error: msg };
      }
    },
  );
