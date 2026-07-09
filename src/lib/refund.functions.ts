import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Per-request Supabase client. Reads the JWT the attachSupabaseAuth
// middleware attached to the request, creates a one-shot client that
// authenticates as that user, and verifies the user via
// auth.getUser(token) — that round-trip hits Supabase's JWKS so the
// returned user.id / user.email are server-verified, NOT taken from
// the request body.
//
// Returns:
//   - { user, userClient } when Authorization header is present and
//     supabase.auth.getUser(token) returns a real user
//   - throws "UNAUTHENTICATED" otherwise (handler converts to
//     code: "not_authorized")
//
// Scope: this helper exists ONLY for server fns that need to verify
// the caller's identity from the session. It does NOT do SELECT/INSERT/
// UPDATE — those happen through supabaseAdmin after the JS ownership
// check, because the RLS lockdown in 20260708b_orders_policies_lockdown
// leaves only service_role with write access on refund_requests and
// orders.refund_status.
async function getUserClient(): Promise<{
  user: User;
  userClient: SupabaseClient;
}> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // No fallback: if env is missing, fail closed.
    throw new Error("UNAUTHENTICATED");
  }

  const header = getRequestHeader("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("UNAUTHENTICATED");

  // Per-request client. anon key identifies the project; the bearer
  // token authorizes the request. supabase-js does NOT validate the
  // JWT locally here — auth.getUser(token) below does.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // The only call we make against the per-request client. Supabase
  // validates the JWT against its JWKS and returns the user record.
  // user.id and user.email are SERVER-VERIFIED.
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) throw new Error("UNAUTHENTICATED");
  return { user: data.user, userClient };
}

// P0-Security: refund flow moves server-side. INSERT into refund_requests
// and UPDATE orders.refund_status used to run in the browser. They now
// run in a createServerFn handler:
//
//   1. Authorization: getRequestHeader("Authorization") -> bearer token.
//      Token absence -> not_authorized (never defaults to anonymous).
//   2. Identity: supabase.auth.getUser(token) returns user.id and
//      user.email SERVER-VERIFIED. Identity NEVER comes from body.
//   3. Ownership (JS): order.auth_user_id == user.id OR
//      (order.auth_user_id IS NULL AND lower(order.customer_email)
//       == lower(user.email))
//   4. Eligibility: payment_status in (approved) OR status in
//      (paid, shipped, delivered).
//   5. Duplicate guard: existing refund_requests row with status in
//      (pending, approved, in_progress) is rejected.
//   6. Writes: INSERT refund_requests + UPDATE orders.refund_status via
//      supabaseAdmin (service_role, bypass RLS). Safe because (2)+(3)
//      have already established that the request is for the right user.

const uuid = z.string().uuid();

const requestSchema = z
  .object({
    orderId: uuid,
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

// Minimal row shape — refund_requests has no generated types yet
// (Database regenerated post-migration, see docs/agente-fase1.md).
// Tracked in backlog: refactor to typed once types.ts is regenerated.
type RefundRequestRow = {
  id: string;
  status: string;
  // shape above is the SELECT side. The INSERT side sets
  // order_id / auth_user_id / customer_email / reason / status.
};

export type RequestRefundResult =
  | { success: true; refundRequestId: string; refundStatus: string }
  | {
      success: false;
      error: string;
      code?: "not_authorized" | "not_found" | "ineligible" | "duplicate";
    };

export const requestRefund = createServerFn({ method: "POST" })
  .validator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }): Promise<RequestRefundResult> => {
    // (1)+(2) Identity verification. Anything thrown here is mapped to
    // not_authorized WITHOUT leaking the underlying message.
    let userId = "";
    let userEmail = "";
    try {
      const ctx = await getUserClient();
      userId = ctx.user.id;
      userEmail = (ctx.user.email ?? "").toLowerCase();
    } catch {
      return {
        success: false,
        code: "not_authorized",
        error: "Sessao expirada. Faca login e tente novamente.",
      };
    }

    // (3)+(4) ownership + eligibility in one read. Uses supabaseAdmin
    // because the SELECT involves fields the user may or may not own;
    // the JS ownership check below is the gate.
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, auth_user_id, customer_email, status, payment_status, refund_status")
      .eq("id", data.orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return {
        success: false,
        code: "not_found",
        error: "Pedido nao encontrado",
      };
    }

    const o = order as unknown as {
      auth_user_id: string | null;
      customer_email: string | null;
      status: string;
      payment_status: string;
      refund_status: string | null;
    };

    const ownsById =
      o.auth_user_id != null && o.auth_user_id === userId;
    const ownsByEmail =
      o.auth_user_id == null &&
      !!o.customer_email &&
      o.customer_email.toLowerCase() === userEmail;
    if (!ownsById && !ownsByEmail) {
      // Same response as not_found — do not differentiate "exists but
      // not yours" from "does not exist".
      return {
        success: false,
        code: "not_authorized",
        error: "Pedido nao encontrado",
      };
    }

    const paidish =
      o.payment_status === "approved" ||
      o.status === "paid" ||
      o.status === "shipped" ||
      o.status === "delivered";
    if (!paidish) {
      return {
        success: false,
        code: "ineligible",
        error: "Pedido ainda nao foi pago.",
      };
    }

    // (5) Duplicate guard. refund_requests is not in generated types
    // yet (regen post-migration, tracked in backlog). Cast keeps tsc
    // honest about the unknown shape.
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("refund_requests" as never)
      .select("id, status")
      .eq("order_id", data.orderId)
      .in("status", ["pending", "approved", "in_progress"])
      .maybeSingle();
    if (existErr) {
      return { success: false, error: "erro de leitura" };
    }
    if (existing) {
      return {
        success: false,
        code: "duplicate",
        error: "Ja existe uma solicitacao em andamento para este pedido.",
      };
    }

    // (6a) INSERT refund request. auth_user_id and customer_email come
    // from the SERVER-VERIFIED session, not from the browser payload.
    // Cast 'as never' silences tsc on the stale Database; field list
    // mirrors the refund_requests schema in the baseline.
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("refund_requests" as never)
      .insert({
        order_id: data.orderId,
        auth_user_id: userId,
        customer_email: userEmail || null,
        reason: data.reason ?? null,
        status: "pending",
      } as never)
      .select("id")
      .maybeSingle();

    if (insErr || !inserted) {
      return {
        success: false,
        error: insErr?.message || "Falha ao registrar solicitacao.",
      };
    }

    // (6b) Update orders.refund_status. If this fails, refund_requests
    // still has a pending row; admin reconciles by order_id.
    // The link back to the refund_request row lives in
    // refund_requests.order_id (already present). Adding
    // refund_request_id / refund_requested_at on orders would have
    // required extra migration columns; deferred to backlog.
    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({ refund_status: "requested" } as never)
      .eq("id", data.orderId);

    if (updErr) {
      return {
        success: false,
        error:
          "Solicitacao registrada, mas nao conseguimos atualizar o status do pedido. Tente novamente em instantes.",
      };
    }

    return {
      success: true,
      refundRequestId: (inserted as RefundRequestRow).id,
      refundStatus: "requested",
    };
  });