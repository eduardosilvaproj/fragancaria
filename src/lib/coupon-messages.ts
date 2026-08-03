import { MAX_DISCOUNT_PERCENT, type CouponRejection } from "./commerce-config";

// Mensagem ao cliente para cada motivo tipado de recusa de cupom. Separado das
// server fns de propósito: é texto de UI, importado pelo checkout e pelo
// carrinho, sem puxar nada de servidor. Acaba com o "cupom inválido" genérico —
// cada motivo diz o que de fato aconteceu (C14, item 5).
export function couponRejectionMessage(reason: CouponRejection): string {
  switch (reason) {
    case "not_found":
      return "Cupom não encontrado. Confira o código.";
    case "inactive":
      return "Este cupom não está mais ativo.";
    case "expired":
      return "Este cupom está fora do período de validade.";
    case "below_minimum":
      return "Seu pedido ainda não atingiu o valor mínimo para este cupom.";
    case "usage_exceeded":
      return "Este cupom atingiu o limite de usos.";
    case "free_shipping_redundant":
      return "Seu pedido já tem frete grátis.";
    case "above_ceiling":
      return `Este cupom excede o desconto máximo permitido (${MAX_DISCOUNT_PERCENT}%).`;
  }
}
