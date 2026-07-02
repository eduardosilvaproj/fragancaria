import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AdminSession = { userId: string; email: string } | null;

export const loginAdmin = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
    const parsed = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .safeParse(data);
    if (!parsed.success) {
      return { success: false as const, error: "DADOS_INVALIDOS" };
    }
    const { loginAdmin: doLogin } = await import("./admin-auth");
    try {
      const admin = await doLogin(parsed.data.email, parsed.data.password);
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