import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Guest order tracking (/rastrear-pedido and /pedido/$id for guest).
//
// BEFORE: pages called supabase.from("orders") with the anon key. That
// worked only because of the policy "Anyone can read orders by id"
// USING(true), a P0 leak (full PII to anyone with the UUID).
//
// NOW: zero anon policy on orders. Guests MUST present a tracking_token
// (16-char nanoid, alphabet A-Z minus I/L/O plus 2-9, ~77.5 bits of entropy).
// This server fn uses supabaseAdmin (bypass RLS), looks up the order,
// validates the token, and returns a STRIPPED payload (no CPF, no email,
// no phone, no shipping_address). Real PII stays server-side forever.
//
// The token is 77.5 bits, brute force is infeasible, but a leaked token
// would be silently valid forever.
// TODO (P1): add a per-IP window counter (e.g. 10 attempts per 15 min).
// For now we log every miss with the source IP and the bad token prefix.

const tokenSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-HJ-KM-NP-Z2-9]+$/, "tracking_token invalido");

const inputSchema = z.object({ token: tokenSchema });

// Strict allowlist. If you add a new column to public.orders, you must
// either add it here (safe) or leave it out (default safe). Easier to
// review an explicit list.
//
// B2: tracking_url was REMOVED. That column does not exist in public.orders
// and any reference would error at query time. If UI wants a tracking URL,
// build it client-side from tracking_code.
//
// A4: tracking_token is NOT in SAFE_COLUMNS. Only needed in WHERE.
export type GuestOrderDTO = {
  id: string;
  status: string;
  paymentStatus: string;
  trackingCode: string | null;
  createdAt: string;
  items: Array<{ title: string; quantity: number; price: number }>;
};

const SAFE_COLUMNS = [
  "id",
  "status",
  "payment_status",
  "tracking_code",
  "created_at",
  "items",
].join(", ");

function getClientIp(request: Request | undefined): string {
  const xff = request?.headers?.get("x-forwarded-for") || "";
  return (
    xff.split(",")[0]?.trim() ||
    request?.headers?.get("x-real-ip") ||
    "unknown"
  );
}

// A1: never leak raw error messages to the guest. Caller sees
// "codigo nao encontrado"; we log details server-side.
export const getOrderByTrackingToken = createServerFn({ method: "GET" })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const request = getRequest();
    const ip = getClientIp(request);
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: row, error } = await supabaseAdmin
        .from("orders")
        .select(SAFE_COLUMNS)
        // @ts-expect-error tracking_token added in 20260708a; generated types stale. See agente-fase1.md.
        .eq("tracking_token", data.token)
        .maybeSingle();
      if (error) {
        console.warn("[tracking] lookup error", { ip, hasError: true });
        return { success: false, error: "codigo nao encontrado" } as const;
      }
      if (!row) {
        console.warn("[tracking] miss", { ip });
        return { success: false, error: "codigo nao encontrado" } as const;
      }
      const r = row as unknown as Record<string, unknown>;
      const dataOut: GuestOrderDTO = {
        id: String(r.id),
        status: String(r.status ?? "pending"),
        paymentStatus: String(r.payment_status ?? "pending"),
        trackingCode: (r.tracking_code as string | null) ?? null,
        createdAt: String(r.created_at ?? ""),
        items: Array.isArray(r.items)
          ? (r.items as Array<Record<string, unknown>>).map((it) => ({
              title: String(it.title ?? it.name ?? ""),
              quantity: Number(it.quantity ?? 0),
              price: Number(it.price ?? 0),
            }))
          : [],
      };
      return { success: true, data: dataOut } as const;
    } catch (_e: unknown) {
      console.warn("[tracking] handler exception", { ip });
      return { success: false, error: "codigo nao encontrado" } as const;
    }
  });