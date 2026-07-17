// Fonte única de verdade das regras comerciais (frete, cupons, descontos,
// totais). Carrinho, checkout e o server (createPayment) consomem estas
// mesmas funções — não replicam tabelas nem limiares próprios.

export const SHIPPING_METHODS = [
  { id: "pac", name: "PAC", price: 18.9, days: "8 dias úteis" },
  { id: "sedex", name: "SEDEX", price: 32.5, days: "3 dias úteis" },
  { id: "sedex10", name: "SEDEX 10", price: 45, days: "1 dia útil" },
] as const;

export type ShippingMethodId = (typeof SHIPPING_METHODS)[number]["id"];

// Frete usado como estimativa quando ainda não há método escolhido (carrinho).
export const DEFAULT_SHIPPING_METHOD: ShippingMethodId = "pac";

export const FREE_SHIPPING_THRESHOLD = 199;
export const PIX_DISCOUNT_PERCENT = 5;
export const MAX_DISCOUNT_PERCENT = 30;

export type Coupon = { code: string; discountPercent: number };

export const COUPONS: Record<string, Coupon> = {
  BEMVINDO10: { code: "BEMVINDO10", discountPercent: 10 },
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal >= FREE_SHIPPING_THRESHOLD;
}

export function getShippingPrice(methodId: string | null | undefined): number | null {
  const method = SHIPPING_METHODS.find((s) => s.id === methodId);
  return method ? method.price : null;
}

// Retorna o frete cobrado (0 quando há frete grátis) ou null se o método
// for inválido/ausente — quem chama decide o fallback de exibição.
export function calculateShipping(
  subtotal: number,
  methodId: string | null | undefined,
): number | null {
  const shippingPrice = getShippingPrice(methodId);
  if (shippingPrice === null) return null;
  return qualifiesForFreeShipping(subtotal) ? 0 : shippingPrice;
}

export function getCoupon(code: string | null | undefined): Coupon | null {
  if (!code) return null;
  return COUPONS[code.trim().toUpperCase()] ?? null;
}

export function couponDiscountPercent(code: string | null | undefined): number {
  return getCoupon(code)?.discountPercent ?? 0;
}

export function calculateDiscountFromPercent(
  subtotal: number,
  discountPercent: number,
): number {
  const raw = (subtotal * discountPercent) / 100;
  const cap = (subtotal * MAX_DISCOUNT_PERCENT) / 100;
  return round2(Math.min(raw, cap));
}

// Desconto total (cupom + PIX) limitado ao teto de MAX_DISCOUNT_PERCENT do
// subtotal. É a mesma função que o server usa para recalcular o desconto.
export function calculateDiscount(
  subtotal: number,
  opts: { couponCode?: string | null; paymentMethod?: string | null },
): number {
  const discountPercent =
    couponDiscountPercent(opts.couponCode) +
    (opts.paymentMethod === "pix" ? PIX_DISCOUNT_PERCENT : 0);
  return calculateDiscountFromPercent(subtotal, discountPercent);
}

export function calculateOrderTotal(input: {
  subtotal: number;
  shipping: number;
  discount: number;
}): number {
  return Math.max(0, round2(input.subtotal - input.discount + input.shipping));
}
