import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server functions do painel admin. loginAdmin/logoutAdmin/getAdminSession
// delegam para src/lib/admin-auth.ts (server-only). O cookie httpOnly é a
// fonte de verdade da sessão — o cliente nunca vê os tokens.

export type AdminSession = { userId: string; email: string } | null;

export const loginAdmin = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        // createServerFn wraps arguments under `data` on the wire; accept both
        // shapes so client (`loginAdmin({ data: { email, password } })`) and
        // direct callers work. Validating flat directly would Seroval-fail
        // because the thrown error can't be serialized into the typed return.
        data: z
          .object({
            email: z.string().email(),
            password: z.string().min(1),
          })
          .or(
            z.object({
              email: z.string().email(),
              password: z.string().min(1),
            }),
          ),
      })
      .parse(d).data,
  )
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
