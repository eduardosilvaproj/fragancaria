import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server functions do painel admin. loginAdmin/logoutAdmin/getAdminSession
// delegam para src/lib/admin-auth.ts (server-only). O cookie httpOnly é a
// fonte de verdade da sessão — o cliente nunca vê os tokens.

export type AdminSession = { userId: string; email: string } | null;

export const loginAdmin = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    // createServerFn transporta os argumentos sob `data`. Aceitar tanto o
    // formato envelopado (`{ data: { email, password } }`) quanto o flat
    // (`{ email, password }`), normalizando para o handler receber
    // `{ email, password }` direto.
    const inner = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });
    const wrapped = z
      .object({ data: inner })
      .transform((v) => v.data);
    const flat = inner;
    return z.union([wrapped, flat]).parse(d);
  })
  .handler(async ({ data }) => {
    const { loginAdmin: doLogin } = await import("./admin-auth");
    try {
      const admin = await doLogin(data.email, data.password);
      return { success: true as const, email: admin.email };
    } catch (err: any) {
      return { success: false as const, error: err?.message || "ERRO" };
    }
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(
  async () => {
    const { logoutAdmin: doLogout } = await import("./admin-auth");
    doLogout();
    return { success: true as const };
  },
);

export const getAdminSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSession> => {
    const { resolveAdmin } = await import("./admin-auth");
    const admin = await resolveAdmin();
    return admin ? { userId: admin.userId, email: admin.email } : null;
  },
);
