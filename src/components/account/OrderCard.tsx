import { Link } from "@tanstack/react-router";
import { Package, ExternalLink, RotateCcw } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em preparacao",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-200 text-green-900",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-gray-200 text-gray-800",
};

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function OrderCard({
  order,
  showActions = true,
}: {
  order: {
    id: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    refundStatus: string | null;
    total: number;
    trackingUrl: string | null;
    items: Array<{ title: string; quantity: number; price: number; variationName?: string }>;
  };
  showActions?: boolean;
}) {
  const c = STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-700";
  const sl = STATUS_LABEL[order.status] ?? order.status;
  return (
    <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[#51635F]">
            Pedido {order.id.slice(0, 8).toUpperCase()} &middot;{" "}
            {formatDate(order.createdAt)}
          </p>
          <h3 className="text-base font-semibold text-[#0F3A3E] mt-1">
            {formatBRL(order.total)}
          </h3>
        </div>
        <span
          className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${c}`}
        >
          {sl}
        </span>
      </div>

      {order.items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-[#51635F] border-t border-[#E9E1D2] pt-3">
          {order.items.slice(0, 3).map((it, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {it.quantity}x {it.title}
                {it.variationName && (
                  <span className="text-[#75827E]"> — {it.variationName}</span>
                )}
              </span>
              <span>{formatBRL(it.price)}</span>
            </li>
          ))}
          {order.items.length > 3 && (
            <li className="text-xs italic">
              + {order.items.length - 3} outros itens
            </li>
          )}
        </ul>
      )}

      {showActions && (
        <div className="mt-4 flex gap-2 flex-wrap">
          <Link
            to="/minha-conta/pedidos/$orderId"
            params={{ orderId: order.id }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5F3EE] text-[#0F3A3E] text-xs font-medium hover:bg-[#F3EEE3]"
          >
            <Package className="h-3.5 w-3.5" />
            Detalhes
          </Link>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9E1D2] text-[#0F3A3E] text-xs font-medium hover:bg-[#F5F3EE]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Rastrear
            </a>
          )}
          {!["cancelled", "refunded", "delivered"].includes(order.status) &&
            !order.refundStatus && (
              <Link
                to="/minha-conta/cancelamentos"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Cancelar
              </Link>
            )}
        </div>
      )}
    </div>
  );
}

export default OrderCard;
