import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Clock,
  CheckCircle,
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { getOrderByTrackingToken } from "@/lib/order-tracking.functions";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";

export const Route = createFileRoute("/pedido/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acompanhar Pedido | Fragranciaria" },
      { name: "description", content: "Acompanhe o status do seu pedido." },
    ],
  }),
  component: OrderTrackingPage,
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

function mapStatus(s?: string | null): OrderStatus {
  switch (s) {
    case "approved":
    case "paid":
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

// Remove hífens/espaços do token digitado ou vindo da URL.
function normalizeToken(raw: string): string {
  return (raw || "").replace(/[\s-]/g, "").toUpperCase();
}

function OrderTrackingPage() {
  const { token } = Route.useParams();
  const getOrder = useServerFn(getOrderByTrackingToken);

  const { data: result, isLoading } = useQuery({
    queryKey: ["order-tracking", token],
    queryFn: async () => getOrder({ data: { token: normalizeToken(token) } }),
    retry: false,
  });

  const order = result?.success ? result.data : null;

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />
      <nav className="bg-white border-b border-[#E9E1D2]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2 text-[12px] text-[#51635F]">
          <Link to="/" className="hover:text-[#0F3A3E]">
            Home
          </Link>
          <span>/</span>
          <Link to="/rastrear-pedido" className="hover:text-[#0F3A3E]">
            Rastrear Pedido
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {isLoading && <LoadingSkeleton />}

        {!isLoading && !order && (
          <ErrorState message="Código não encontrado." />
        )}

        {!isLoading && order && <OrderContent order={order} />}
      </main>
    </div>
  );
}

function OrderContent({
  order,
}: {
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    trackingCode: string | null;
    createdAt: string;
    items: Array<{ title: string; quantity: number; price: number }>;
    statusHistory: Array<{ status: string; date: string }>;
  };
}) {
  const currentStatus = mapStatus(order.status);
  const historyMap = new Map(
    order.statusHistory.map((h) => [mapStatus(h.status), h.date]),
  );
  const currentIndex = FLOW.indexOf(currentStatus);
  const cancelled = currentStatus === "cancelled";

  const cfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <>
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
          Realizado em {formatDate(order.createdAt)}
        </p>
      </section>

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
                        backgroundColor: completed || current ? c.color : "#fff",
                        borderColor: completed || current ? c.color : "#E9E1D2",
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
                      style={{ color: completed || current ? "#0F3A3E" : "#9AA39F" }}
                    >
                      {c.label}
                    </div>
                    <div className="text-xs text-[#51635F] mt-0.5">
                      {date
                        ? formatDate(date)
                        : current
                        ? "Em andamento"
                        : "Aguardando"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {order.trackingCode && (
          <section className="bg-white border border-[#E9E1D2] p-6">
            <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
              Envio
            </h2>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#51635F]">
              Código de rastreio
            </div>
            <div className="font-mono text-sm text-[#0F3A3E]">
              {order.trackingCode}
            </div>
            <a
              href={`https://rastreamento.correios.com.br/app/index.php?objetos=${order.trackingCode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-[12px] uppercase tracking-[0.18em] font-semibold text-[#B07B1E] hover:underline"
            >
              Rastrear envio <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </section>
        )}

        <section className="bg-white border border-[#E9E1D2] p-6">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#B07B1E] font-semibold mb-4">
            Itens do Pedido
          </h2>
          <div className="space-y-2 text-sm">
            {order.items.length > 0 ? (
              order.items.map((it, i) => (
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
        </section>
      </div>
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-white border border-[#E9E1D2] p-6 h-32" />
      <div className="bg-white border border-[#E9E1D2] p-6 h-80" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E9E1D2] p-6 h-40" />
        <div className="bg-white border border-[#E9E1D2] p-6 h-40" />
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
