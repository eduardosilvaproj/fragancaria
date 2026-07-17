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

// "approved" existe em pedidos antigos (status de pagamento MP).
// Tratamos como sinônimo de "paid" para permitir atualização.
const STATUS_ALIAS: Record<string, string> = {
  approved: "paid",
};

export function canTransition(from: string, to: string): boolean {
  const fromNorm = STATUS_ALIAS[from] ?? from;
  const toNorm = STATUS_ALIAS[to] ?? to;
  if (!isOrderStatus(fromNorm) || !isOrderStatus(toNorm)) return false;
  if (fromNorm === toNorm) return true;
  return TRANSITIONS[fromNorm].includes(toNorm);
}

export function allowedNextStatuses(from: string): OrderStatus[] {
  if (!isOrderStatus(from)) return [];
  return TRANSITIONS[from];
}
