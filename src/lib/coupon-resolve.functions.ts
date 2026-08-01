import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  FREE_SHIPPING_THRESHOLD,
  qualifiesForFreeShipping,
  type CouponType,
  type CouponRejection,
  type ResolvedCoupon,
} from "./commerce-config";

// Resolve um cupom pelo CÓDIGO contra public.coupons, valida as restrições no
// SERVIDOR e devolve o cupom já resolvido (tipo + valor) ou o motivo tipado da
// recusa. É a fonte única do C14: tanto o applyCoupon do cliente quanto o
// createPayment chamam esta função — o cliente para dar feedback, o servidor
// para recalcular o desconto na hora de cobrar.
//
// SEGURANÇA: o cliente manda só `code`. Tipo, valor e todas as regras vêm da
// tabela. O valor do desconto NUNCA vem do cliente — é por isso que a forja
// (mandar discount inflado) não funciona: createPayment recalcula a partir do
// que ESTA função devolve, não do que o cliente informou.
//
// Pública de propósito (sem requireAdmin): o checkout de convidado precisa
// validar cupom. Usa supabaseAdmin só para bypassar a RLS da tabela (que é
// fechada a anon/authenticated); não expõe nada além de tipo/valor do cupom.

export type CouponResolution =
  | {
      valid: true;
      coupon: ResolvedCoupon;
      // Descrição curta para a UI ("10% de desconto", "R$ 20 de desconto",
      // "Frete grátis"). O cálculo em reais é feito por couponDiscountAmount
      // no client/server, não aqui.
      label: string;
    }
  | { valid: false; reason: CouponRejection };

const inputSchema = z.object({
  code: z.string().min(1).max(64),
  // Contexto necessário para validar valor mínimo e a redundância de frete
  // grátis. Vêm do carrinho; o servidor os revalida em createPayment com o
  // subtotal recalculado, então aqui são só para o feedback ao aplicar.
  subtotal: z.number().nonnegative().default(0),
  // true se o pedido JÁ tem frete grátis por atingir o threshold de valor.
  // Opcional: quando ausente, derivamos do subtotal.
  alreadyFreeShipping: z.boolean().optional(),
});

type CouponRow = {
  code: string;
  discount_type: string;
  discount_value: number | string;
  minimum_order_value: number | string | null;
  usage_limit: number | null;
  usage_count: number | null;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
};

function labelFor(type: CouponType, value: number): string {
  if (type === "percentage") return `${value}% de desconto`;
  if (type === "fixed_amount")
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de desconto`;
  return "Frete grátis";
}

// Núcleo puro, testável sem banco: recebe a row e o contexto, devolve a
// resolução. resolveCoupon (a server fn) só busca a row e delega para cá.
export function evaluateCoupon(
  row: CouponRow | null,
  ctx: { subtotal: number; alreadyFreeShipping: boolean },
  now: Date = new Date(),
): CouponResolution {
  if (!row) return { valid: false, reason: "not_found" };
  if (!row.is_active) return { valid: false, reason: "inactive" };

  if (row.starts_at && new Date(row.starts_at) > now) {
    // Ainda não começou — para o cliente é indistinguível de expirado.
    return { valid: false, reason: "expired" };
  }
  if (row.expires_at && new Date(row.expires_at) <= now) {
    return { valid: false, reason: "expired" };
  }

  if (
    row.usage_limit != null &&
    row.usage_count != null &&
    row.usage_count >= row.usage_limit
  ) {
    return { valid: false, reason: "usage_exceeded" };
  }

  const min = row.minimum_order_value == null ? 0 : Number(row.minimum_order_value);
  if (min > 0 && ctx.subtotal < min) {
    return { valid: false, reason: "below_minimum" };
  }

  const type = row.discount_type as CouponType;
  const value = Number(row.discount_value);

  // Frete grátis num pedido que já tem frete grátis por valor não agrega nada.
  // Decisão do Edu (C14): recusar com mensagem, em vez de dizer "aplicado" e
  // não mudar o total.
  if (type === "free_shipping" && ctx.alreadyFreeShipping) {
    return { valid: false, reason: "free_shipping_redundant" };
  }

  return {
    valid: true,
    coupon: { code: row.code, type, value },
    label: labelFor(type, value),
  };
}

export const resolveCoupon = createServerFn({ method: "GET" })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<CouponResolution> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const code = data.code.trim().toUpperCase();
      const { data: row, error } = await db
        .from("coupons")
        .select(
          "code, discount_type, discount_value, minimum_order_value, usage_limit, usage_count, is_active, starts_at, expires_at",
        )
        .eq("code", code)
        .maybeSingle();

      if (error) {
        console.error("[resolveCoupon] erro ao ler coupons:", error.message);
        // Falha de leitura vira not_found para o cliente — nunca aplica um
        // desconto que não conseguimos validar.
        return { valid: false, reason: "not_found" };
      }

      const alreadyFree =
        data.alreadyFreeShipping ??
        qualifiesForFreeShipping(data.subtotal, FREE_SHIPPING_THRESHOLD);

      return evaluateCoupon(row as CouponRow | null, {
        subtotal: data.subtotal,
        alreadyFreeShipping: alreadyFree,
      });
    } catch (e: any) {
      console.error("[resolveCoupon] exceção:", e?.message || e);
      return { valid: false, reason: "not_found" };
    }
  });
