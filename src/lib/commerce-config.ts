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

// Os três tipos de desconto que `public.coupons.discount_type` modela.
export type CouponType = "percentage" | "fixed_amount" | "free_shipping";

// Cupom já resolvido contra o banco — o que a server fn resolveCoupon entrega
// para o cálculo puro. NÃO é o que o cliente manda: o cliente manda só o
// `code`, e o servidor resolve tipo/valor a partir da tabela. Isso é o que
// impede a forja de desconto (ver createPayment).
export type ResolvedCoupon = {
  code: string;
  type: CouponType;
  value: number;
};

// Motivo tipado de recusa — a tela mapeia cada um para uma mensagem própria,
// em vez do "cupom inválido" genérico de antes.
export type CouponRejection =
  | "not_found"
  | "inactive"
  | "expired"
  | "below_minimum"
  | "usage_exceeded"
  | "free_shipping_redundant"
  | "above_ceiling";

const round2 = (n: number) => Math.round(n * 100) / 100;

export function qualifiesForFreeShipping(
  subtotal: number,
  threshold: number = FREE_SHIPPING_THRESHOLD,
): boolean {
  return subtotal >= threshold;
}

export function getShippingPrice(methodId: string | null | undefined): number | null {
  const method = SHIPPING_METHODS.find((s) => s.id === methodId);
  return method ? method.price : null;
}

// Retorna o frete cobrado (0 quando há frete grátis) ou null se o método
// for inválido/ausente — quem chama decide o fallback de exibição. O
// threshold é parametrizado para permitir que o server passe o valor lido
// de shipping_settings; quem não passar nada usa o hardcoded (client).
export function calculateShipping(
  subtotal: number,
  methodId: string | null | undefined,
  freeShippingThreshold: number = FREE_SHIPPING_THRESHOLD,
): number | null {
  const shippingPrice = getShippingPrice(methodId);
  if (shippingPrice === null) return null;
  return qualifiesForFreeShipping(subtotal, freeShippingThreshold) ? 0 : shippingPrice;
}

export function calculateDiscountFromPercent(
  subtotal: number,
  discountPercent: number,
): number {
  const raw = (subtotal * discountPercent) / 100;
  const cap = (subtotal * MAX_DISCOUNT_PERCENT) / 100;
  return round2(Math.min(raw, cap));
}

// Desconto EM REAIS de um cupom JÁ RESOLVIDO sobre o subtotal. Função pura: não
// toca banco, não decide se o cupom é válido (isso é da resolveCoupon). Só
// aplica a matemática do tipo. `free_shipping` NÃO desconta do subtotal — o
// benefício dele é no frete, tratado por applyCouponToShipping.
//
// Todos os tipos respeitam dois tetos: nunca passar do subtotal (um pedido não
// pode custar menos que zero) e nunca passar de MAX_DISCOUNT_PERCENT do
// subtotal. O segundo é o mesmo teto que já limitava os percentuais.
export function couponDiscountAmount(
  subtotal: number,
  coupon: ResolvedCoupon | null,
): number {
  if (!coupon) return 0;
  const capPercent = (subtotal * MAX_DISCOUNT_PERCENT) / 100;
  if (coupon.type === "percentage") {
    return round2(Math.min((subtotal * coupon.value) / 100, capPercent));
  }
  if (coupon.type === "fixed_amount") {
    // Valor fixo maior que a compra vira "zera o subtotal", nunca negativo.
    // Ainda respeita o teto percentual, senão um cupom de R$50 num pedido de
    // R$60 daria 83% de desconto, acima do MAX de 30%.
    return round2(Math.min(coupon.value, subtotal, capPercent));
  }
  // free_shipping: sem desconto no subtotal.
  return 0;
}

// Desconto total sobre o SUBTOTAL: cupom (resolvido) + PIX. Mantém o teto de
// MAX_DISCOUNT_PERCENT sobre a soma. É a mesma função que o server usa ao
// recalcular — o cliente nunca informa o valor, só o código, que já foi
// resolvido em `coupon`.
export function calculateDiscount(
  subtotal: number,
  opts: { coupon?: ResolvedCoupon | null; paymentMethod?: string | null },
): number {
  const couponPart = couponDiscountAmount(subtotal, opts.coupon ?? null);
  const pixPart =
    opts.paymentMethod === "pix" ? (subtotal * PIX_DISCOUNT_PERCENT) / 100 : 0;
  const capPercent = (subtotal * MAX_DISCOUNT_PERCENT) / 100;
  return round2(Math.min(couponPart + pixPart, capPercent, subtotal));
}

// Frete efetivo depois do cupom. free_shipping zera o frete. Os outros tipos
// não mexem no frete. Recebe o frete JÁ calculado (calculateShipping), então
// se o pedido já tinha frete grátis por valor, o resultado é 0 de qualquer
// forma — mas resolveCoupon recusa o cupom antes, para não dizer "aplicado"
// sem efeito (decisão do Edu, C14).
export function applyCouponToShipping(
  shipping: number,
  coupon: ResolvedCoupon | null,
): number {
  if (coupon?.type === "free_shipping") return 0;
  return shipping;
}

export function calculateOrderTotal(input: {
  subtotal: number;
  shipping: number;
  discount: number;
}): number {
  return Math.max(0, round2(input.subtotal - input.discount + input.shipping));
}
