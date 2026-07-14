import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Devoluções e trocas. Distinto de refund.functions (só reembolso): aqui o
// cliente escolhe a resolução (reembolso, troca ou vale-compra) e o fluxo
// cobre logística reversa. Segue o mesmo padrão de refund.functions para
// identidade: valida o Bearer token server-side e escopa por user.id, usando
// supabaseAdmin (service role) após o check de posse em JS.

async function verifyUser(): Promise<{ userId: string; userEmail: string }> {
  const header = getRequestHeader("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("UNAUTHENTICATED");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("UNAUTHENTICATED");
  return { userId: data.user.id, userEmail: (data.user.email ?? "").toLowerCase() };
}

const returnItemSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative().optional(),
});

const requestSchema = z
  .object({
    orderId: z.string().uuid(),
    reason: z.enum(["arrependimento", "defeito", "produto_errado", "avaria_transporte", "outro"]),
    resolution: z.enum(["reembolso", "troca", "vale_compra"]).default("reembolso"),
    items: z.array(returnItemSchema).min(1),
    description: z.string().trim().max(1000).optional(),
  })
  .strict();

export type RequestReturnResult =
  | { success: true; returnRequestId: string }
  | { success: false; error: string; code?: "not_authorized" | "not_found" | "ineligible" | "duplicate" };

export const requestReturn = createServerFn({ method: "POST" })
  .validator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }): Promise<RequestReturnResult> => {
    let userId = "";
    let userEmail = "";
    try {
      const ctx = await verifyUser();
      userId = ctx.userId;
      userEmail = ctx.userEmail;
    } catch {
      return { success: false, code: "not_authorized", error: "Sessão expirada. Faça login e tente novamente." };
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, auth_user_id, customer_email, status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (orderErr || !order) return { success: false, code: "not_found", error: "Pedido não encontrado" };
    const o = order as unknown as { auth_user_id: string | null; customer_email: string | null; status: string };

    const owns =
      (o.auth_user_id != null && o.auth_user_id === userId) ||
      (o.auth_user_id == null && !!o.customer_email && o.customer_email.toLowerCase() === userEmail);
    if (!owns) return { success: false, code: "not_authorized", error: "Pedido não encontrado" };

    // Devolução só faz sentido depois de enviado/entregue.
    if (o.status !== "shipped" && o.status !== "delivered") {
      return { success: false, code: "ineligible", error: "Este pedido ainda não pode ser devolvido." };
    }

    const { data: existing } = await supabaseAdmin
      .from("return_requests" as never)
      .select("id, status")
      .eq("order_id", data.orderId)
      .in("status", ["requested", "approved", "awaiting_return", "received"])
      .maybeSingle();
    if (existing) {
      return { success: false, code: "duplicate", error: "Já existe uma devolução em andamento para este pedido." };
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("return_requests" as never)
      .insert({
        order_id: data.orderId,
        user_id: userId,
        reason: data.reason,
        resolution: data.resolution,
        items: data.items,
        description: data.description ?? null,
        status: "requested",
      } as never)
      .select("id")
      .maybeSingle();
    if (insErr || !inserted) {
      return { success: false, error: insErr?.message || "Falha ao registrar devolução." };
    }
    return { success: true, returnRequestId: (inserted as { id: string }).id };
  });

export type MyReturn = {
  id: string;
  orderId: string;
  reason: string;
  resolution: string;
  status: string;
  createdAt: string;
};

export const listMyReturns = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ success: boolean; data: MyReturn[]; error?: string }> => {
    let userId = "";
    try {
      userId = (await verifyUser()).userId;
    } catch {
      return { success: false, data: [], error: "not_authorized" };
    }
    const { data, error } = await supabaseAdmin
      .from("return_requests" as never)
      .select("id, order_id, reason, resolution, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return { success: false, data: [], error: error.message };
    const mapped: MyReturn[] = ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      orderId: r.order_id,
      reason: r.reason,
      resolution: r.resolution,
      status: r.status,
      createdAt: r.created_at ?? "",
    }));
    return { success: true, data: mapped };
  },
);

// ADMIN: lista as devoluções, juntando dados do pedido para a tela de gestão.
export type AdminReturnRow = {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  resolution: string;
  status: string;
  description: string | null;
  adminNotes: string | null;
  createdAt: string;
  orderTotal: number;
  customerName: string;
  customerEmail: string;
};

export const listReturnRequests = createServerFn({ method: "GET" })
  .validator((d: unknown) => (d ?? {}) as { status?: string })
  .handler(
    async ({ data }): Promise<{ success: true; data: AdminReturnRow[] } | { success: false; error: string }> => {
      try {
        const { requireAdmin } = await import("@/lib/admin-auth");
        await requireAdmin();

        let q = supabaseAdmin
          .from("return_requests" as never)
          .select("id, order_id, user_id, reason, resolution, status, description, admin_notes, created_at")
          .order("created_at", { ascending: false });
        if (data.status) q = q.eq("status", data.status);
        const { data: rows, error } = await q;
        if (error) return { success: false, error: error.message };

        const orderIds = [...new Set(((rows ?? []) as any[]).map((r) => r.order_id))];
        const { data: orders } = await supabaseAdmin
          .from("orders")
          .select("id, total, customer_name, customer_email")
          .in("id", orderIds.length ? orderIds : ["00000000-0000-0000-0000-000000000000"]);
        const byId = new Map(((orders ?? []) as any[]).map((o) => [o.id, o]));

        const mapped: AdminReturnRow[] = ((rows ?? []) as any[]).map((r) => {
          const o: any = byId.get(r.order_id) ?? {};
          return {
            id: r.id,
            orderId: r.order_id,
            userId: r.user_id,
            reason: r.reason,
            resolution: r.resolution,
            status: r.status,
            description: r.description ?? null,
            adminNotes: r.admin_notes ?? null,
            createdAt: r.created_at ?? "",
            orderTotal: Number(o.total ?? 0),
            customerName: o.customer_name ?? "",
            customerEmail: o.customer_email ?? "",
          };
        });
        return { success: true, data: mapped };
      } catch (e: any) {
        if (e?.status === 401 || e?.status === 403) return { success: false, error: "Não autorizado" };
        return { success: false, error: e?.message || "erro" };
      }
    },
  );

const ADMIN_RETURN_STATUS = [
  "approved",
  "rejected",
  "awaiting_return",
  "received",
  "completed",
  "cancelled",
] as const;

// ADMIN: avança o status de uma devolução. Ao concluir (completed) uma
// devolução cuja resolução é vale_compra, emite o store_credit no valor do
// pedido. Estorno em dinheiro (resolution=reembolso) é feito pelo fluxo de
// approveRefund; troca (resolution=troca) é operacional/manual.
export const resolveReturn = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        returnRequestId: z.string().uuid(),
        status: z.enum(ADMIN_RETURN_STATUS),
        adminNotes: z.string().trim().max(500).optional(),
      })
      .strict()
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();

    const { data: rr, error: rrErr } = await supabaseAdmin
      .from("return_requests" as never)
      .select("id, order_id, user_id, resolution, status")
      .eq("id", data.returnRequestId)
      .maybeSingle();
    if (rrErr || !rr) return { success: false, error: "Devolução não encontrada" };
    const r = rr as unknown as {
      id: string;
      order_id: string;
      user_id: string;
      resolution: string;
      status: string;
    };
    if (r.status === "completed" || r.status === "cancelled") {
      return { success: false, error: "Devolução já finalizada" };
    }

    const { error: updErr } = await supabaseAdmin
      .from("return_requests" as never)
      .update({ status: data.status, admin_notes: data.adminNotes ?? null, updated_at: new Date().toISOString() } as never)
      .eq("id", data.returnRequestId);
    if (updErr) return { success: false, error: updErr.message };

    // Emite vale-compra ao concluir uma devolução com resolução vale_compra.
    if (data.status === "completed" && r.resolution === "vale_compra") {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("total")
        .eq("id", r.order_id)
        .maybeSingle();
      const amount = Number((order as any)?.total ?? 0);
      if (amount > 0) {
        const { error: creditErr } = await supabaseAdmin
          .from("store_credits" as never)
          .insert({
            user_id: r.user_id,
            amount,
            balance: amount,
            origin: "return",
            return_request_id: r.id,
          } as never);
        if (creditErr) {
          return {
            success: false,
            error: "Status atualizado, mas falhou ao emitir o vale-compra. Reconcilie manualmente.",
          };
        }
      }
    }

    return { success: true };
  });
