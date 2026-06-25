import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle,
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  XCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pedido/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acompanhar Pedido | Fragranciaria" },
      { name: "description", content: "Acompanhe o status do seu pedido." },
    ],
  }),
  component: OrderTrackingPage,
  errorComponent: ({ error }) => (
    <ErrorState message={error.message || "Erro ao carregar pedido."} />
  ),
  notFoundComponent: () => <ErrorState message="Pedido não encontrado." />,
});

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: any }
> = {
  pending: { label: "Aguardando Pagamento", color: "#B07B1E", icon: Clock },
  paid: { label: "Pagamento Confirmado", color: "#1C6B4A", icon: CheckCircle },
  processing: { label: "Em Separação", color: "#0F3A3E", icon: Package },
  shipped: { label: "Enviado", color: "#0F3A3E", icon: Truck },
  out_for_delivery: { label: "Saiu para Entrega", color: "#0F3A3E", icon: MapPin },
  delivered: { label: "Entregue", color: "#1C6B4A", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "#DC2626", icon: XCircle },
};

const FLOW: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const BRL = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v ?? 0),
  );

const formatDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

function mapMpStatus(s?: string | null): OrderStatus {
  switch (s) {
    case "approved":
      return "paid";
    case "in_process":
    case "pending":
      return "pending";
    case "rejected":
    case "cancelled":
      return "cancelled";
    default:
      return (s as OrderStatus) ?? "pending";
  }
}

function OrderTrackingPage() {
  const { id } = Route.useParams();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      // Primeiro tenta buscar por UUID (id do Supabase)
      let result = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      // Se não encontrou, tenta buscar por payment_id (id do Mercado Pago)
      if (!result.data && !result.error) {
        result = await supabase
          .from("orders")
          .select("*")
          .eq("payment_id", id)
          .maybeSingle();
      }

      if (result.error) throw result.error;
      return result.data;
    },
  });

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <header className="bg-white border-b border-[#E9E1D2]">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-[#51635F] hover:text-[#0F3A3E]"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <nav className="text-[12px] text-[#51635F] ml-auto">
            <Link to="/" className="hover:text-[#0F3A3E]">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/rastrear-pedido" className="hover:text-[#0F3A3E]">
              Meus Pedidos
            </Link>
            <span className="mx-2">/</span>
            <span className="text-[#0F3A3E]">Pedido #{String(id).slice(0, 8)}</span>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {isLoading && <LoadingSkeleton />}

        {!isLoading && !order && (
          <ErrorState message="Pedido não encontrado." />
        )}

        {!isLoading && order && (
          <OrderContent order={order} />
        )}

        {error && (
          <p className="text-sm text-red-600">{(error as Error).message}</p>
        )}
      </main>
    </div>
  );
}

function OrderContent({ order }: { order: any }) {
  const currentStatus = mapMpStatus(order.status);
  const history: Array<{ status: OrderStatus; date: string }> = Array.isArray(
    order.status_history,
  )
    ? order.status_history
    : [];

  const historyMap = new Map(history.map((h) => [h.status, h.date]));
  const currentIndex = FLOW.indexOf(currentStatus);
  const cancelled = currentStatus === "cancelled";

  const cfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  const address = order.shipping_address as
    | {
        street?: string;
        number?: string;
        complement?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        zip?: string;
      }
    | null;

  const items = (order.items ?? []) as Array<{
    title: string;
    quantity: number;
    price: number;
  }>;

  return (
    <>
      {/* Status header */}
      <section className="bg-white border border-[#E9E1D2] p-6">
        <div className="flex items-center gap-3 mb-2">
          <StatusIcon className="w-6 h-6" style={{ color: cfg.color }} />
          <span
            className="px-3 py-1 text-[11px] uppercase tracking-[0.18em] font-semibold"
            style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>
        <h1 className="font-serif text-2xl text-[#0F3A3E]">
          Pedido #{String(order.id).slice(0, 8).toUpperCase()}
        </h1>
        <p className="text-sm text-[#51635F] mt-1">
          Realizado em {formatDate(order.created_at)}
        </p>
      </section>

      {/* Timeline */}
      <section className="bg-white border border-[#E9E1D2] p-6">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-5">
          Acompanhamento
        </h2>
        {cancelled ? (
          <div className="flex items-center gap-3 text-red-600">
            <XCircle className="w-5 h-5" />
            <span>Este pedido foi cancelado.</span>
          </div>
        ) : (
          <ol className="relative">
            {FLOW.map((status, index) => {
              const completed = index < currentIndex;
              const current = index === currentIndex;
              const c = STATUS_CONFIG[status];
              const Icon = c.icon;
              const date = historyMap.get(status);
              return (
                <li key={status} className="flex gap-4 pb-6 last:pb-0 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center border-2"
                      style={{
                        backgroundColor:
                          completed || current ? c.color : "#fff",
                        borderColor:
                          completed || current ? c.color : "#E9E1D2",
                        color: completed || current ? "#fff" : "#9AA39F",
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {index < FLOW.length - 1 && (
                      <div
                        className="w-0.5 flex-1 mt-1"
                        style={{
                          backgroundColor: completed ? c.color : "#E9E1D2",
                          minHeight: "32px",
                        }}
                      />
                    )}
                  </div>
                  <div className="pt-1.5 flex-1">
                    <div
                      className="text-sm font-semibold"
                      style={{
                        color:
                          completed || current ? "#0F3A3E" : "#9AA39F",
                      }}
                    >
                      {c.label}
                    </div>
                    <div className="text-xs text-[#51635F] mt-0.5">
                      {date ? formatDate(date) : current ? "Em andamento" : "Aguardando"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping */}
        <section className="bg-white border border-[#E9E1D2] p-6">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
            Dados da Entrega
          </h2>
          <div className="text-sm text-[#0F3A3E] space-y-1">
            <p className="font-semibold">{order.customer_name || "—"}</p>
            {address ? (
              <>
                <p>
                  {address.street}, {address.number}
                  {address.complement ? ` — ${address.complement}` : ""}
                </p>
                <p>{address.neighborhood}</p>
                <p>
                  {address.city} - {address.state}
                </p>
                <p>{address.zip}</p>
              </>
            ) : (
              <p className="text-[#51635F]">Endereço não informado.</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#E9E1D2] text-sm text-[#0F3A3E]">
            <p>
              <span className="text-[#51635F]">Frete:</span>{" "}
              {order.shipping_method || "—"}
            </p>
            {order.estimated_delivery && (
              <p>
                <span className="text-[#51635F]">Previsão:</span>{" "}
                {new Date(order.estimated_delivery).toLocaleDateString("pt-BR")}
              </p>
            )}
            {order.tracking_code && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#51635F]">
                  Código de rastreio
                </div>
                <div className="font-mono text-sm">{order.tracking_code}</div>
                <a
                  href={`https://rastreamento.correios.com.br/app/index.php?objetos=${order.tracking_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-[12px] uppercase tracking-[0.18em] font-semibold text-[#B07B1E] hover:underline"
                >
                  Rastrear envio <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Summary */}
        <section className="bg-white border border-[#E9E1D2] p-6">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
            Resumo do Pedido
          </h2>
          <div className="space-y-2 text-sm">
            {items.length > 0 ? (
              items.map((it, i) => (
                <div key={i} className="flex justify-between text-[#0F3A3E]">
                  <span>
                    {it.quantity}x {it.title}
                  </span>
                  <span>{BRL(it.price * it.quantity)}</span>
                </div>
              ))
            ) : (
              <p className="text-[#51635F]">Sem itens.</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-[#E9E1D2] space-y-1.5 text-sm">
            <Row label="Subtotal" value={BRL(order.subtotal)} />
            <Row label="Frete" value={BRL(order.shipping_price)} />
            {order.discount ? (
              <Row label="Desconto" value={`- ${BRL(order.discount)}`} />
            ) : null}
            <div className="flex justify-between font-serif text-lg text-[#0F3A3E] pt-2 border-t border-[#E9E1D2] mt-2">
              <span>Total</span>
              <span>{BRL(order.total ?? order.amount)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Payment */}
      <section className="bg-white border border-[#E9E1D2] p-6">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-3">
          Pagamento
        </h2>
        <div className="flex flex-wrap gap-4 items-center justify-between text-sm text-[#0F3A3E]">
          <div>
            <p className="font-semibold uppercase">
              {order.payment_method || "—"}{" "}
              <span style={{ color: cfg.color }}>· {cfg.label}</span>
            </p>
            {order.payment_id && (
              <p className="text-xs text-[#51635F] mt-1">
                ID: {order.payment_id}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#51635F]">
      <span>{label}</span>
      <span className="text-[#0F3A3E]">{value}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white border border-[#E9E1D2] p-6 h-32" />
      <div className="bg-white border border-[#E9E1D2] p-6 h-80" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E9E1D2] p-6 h-60" />
        <div className="bg-white border border-[#E9E1D2] p-6 h-60" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="max-w-md mx-auto text-center bg-white border border-[#E9E1D2] p-8">
      <XCircle className="w-12 h-12 text-[#B07B1E] mx-auto mb-4" />
      <h2 className="font-serif text-2xl text-[#0F3A3E] mb-2">Ops!</h2>
      <p className="text-sm text-[#51635F] mb-6">{message}</p>
      <Link
        to="/rastrear-pedido"
        className="inline-block bg-[#0F3A3E] text-white px-6 py-3 text-[12px] uppercase tracking-[0.18em] font-semibold hover:bg-[#16504F]"
      >
        Rastrear outro pedido
      </Link>
    </div>
  );
}