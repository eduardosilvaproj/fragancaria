// Máquina de estados de pedidos. Fonte única das transições válidas de
// `orders.status`. Antes, tanto o admin quanto o webhook do MP gravavam
// qualquer string em status, permitindo estados impossíveis (ex.: um pedido
// "delivered" regredir para "paid" por causa de um webhook atrasado, ou o
// admin pular de "pending" direto para "delivered" sem pagamento).
//
// Os 6 status abaixo são os únicos que o código realmente escreve/lê hoje
// (confirmado em createPayment, mp-webhook e refund.functions).

export const ORDER_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

const ALL: OrderStatus[] = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

// Transições permitidas a partir de cada status. `cancelled` e `refunded`
// são terminais (nenhuma saída). Um chargeback/estorno (refunded) pode
// acontecer mesmo depois de shipped/delivered — por isso está listado lá.
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ALL as string[]).includes(v);
}

// Transição válida? Idempotência (from === to) é permitida — o webhook do MP
// reentrega a mesma notificação e não deve falhar por isso.
export function canTransition(from: string, to: string): boolean {
  if (!isOrderStatus(from) || !isOrderStatus(to)) return false;
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

export function allowedNextStatuses(from: string): OrderStatus[] {
  if (!isOrderStatus(from)) return [];
  return TRANSITIONS[from];
}
