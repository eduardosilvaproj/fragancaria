// Ferramentas de consulta de pedido para a consultora Fran.
// Mesmo padrão de product-search.ts: client Supabase injetado, sem dependência
// de @tanstack/react-start, testável com tsx/node.
// Retorna APENAS dados seguros (sem PII) — mesma política de
// order-tracking.functions.ts.

export type AgentOrderStatus = {
  id: string;
  status: string;
  paymentStatus: string;
  trackingCode: string | null;
  createdAt: string;
  items: Array<{ title: string; quantity: number }>;
  statusHistory: Array<{ status: string; date: string }>;
};

type OrderRow = {
  id: string;
  status: string | null;
  payment_status: string | null;
  tracking_code: string | null;
  created_at: string | null;
  items: Array<Record<string, unknown>> | null;
  status_history: Array<Record<string, unknown>> | null;
  customer_email?: string | null;
};

const SAFE_COLUMNS =
  "id, status, payment_status, tracking_code, created_at, items, status_history";

function rowToDTO(r: OrderRow): AgentOrderStatus {
  return {
    id: r.id,
    status: r.status ?? "pending",
    paymentStatus: r.payment_status ?? "pending",
    trackingCode: r.tracking_code ?? null,
    createdAt: r.created_at ?? "",
    items: Array.isArray(r.items)
      ? (r.items as Array<Record<string, unknown>>).map((it) => ({
          title: String(it.title ?? it.name ?? ""),
          quantity: Number(it.quantity ?? 0),
        }))
      : [],
    statusHistory: Array.isArray(r.status_history)
      ? (r.status_history as Array<Record<string, unknown>>).map((h) => ({
          status: String(h.status ?? ""),
          date: String(h.at ?? h.date ?? h.created_at ?? ""),
        }))
      : [],
  };
}

// Modo 1: busca por tracking_token. Retorna null se não existir.
export async function getOrderByToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  token: string,
): Promise<AgentOrderStatus | null> {
  const { data, error } = await db
    .from("orders")
    .select(SAFE_COLUMNS)
    .eq("tracking_token", token)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  return rowToDTO(data as OrderRow);
}

// Modo 2: busca por orderId + email. Valida customer_email (case-insensitive,
// trim). Retorna null se não existir OU se o email não bater — mesmo erro
// genérico nos dois casos (não vaza existência do pedido).
export async function getOrderByIdAndEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  orderId: string,
  email: string,
): Promise<AgentOrderStatus | null> {
  const { data, error } = await db
    .from("orders")
    .select(SAFE_COLUMNS + ", customer_email")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  const r = data as OrderRow;
  if (!r.customer_email) return null;
  if (r.customer_email.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
  return rowToDTO(r);
}

// getPaymentStatus: mesma identificação dos 2 modos, retorna SÓ o paymentStatus.
export async function getPaymentStatusByToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  token: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("orders")
    .select("payment_status")
    .eq("tracking_token", token)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  return (data as { payment_status: string | null }).payment_status ?? "pending";
}

export async function getPaymentStatusByIdAndEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  orderId: string,
  email: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("orders")
    .select("payment_status, customer_email")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  const r = data as { payment_status: string | null; customer_email?: string | null };
  if (!r.customer_email) return null;
  if (r.customer_email.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
  return r.payment_status ?? "pending";
}
