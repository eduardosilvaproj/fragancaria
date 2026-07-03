import { Check, Clock, Truck, Package, Home, X } from "lucide-react";

const STEPS = [
  { key: "pending", label: "Aguardando pagamento", Icon: Clock },
  { key: "paid", label: "Pago", Icon: Check },
  { key: "processing", label: "Em preparacao", Icon: Package },
  { key: "shipped", label: "Enviado", Icon: Truck },
  { key: "delivered", label: "Entregue", Icon: Home },
];

function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrderTimeline({
  current,
  history,
}: {
  current: string;
  history: Array<{ status: string; createdAt: string; notes?: string | null }>;
}) {
  const isCancelled = current === "cancelled" || current === "refunded";
  let activeIndex = STEPS.findIndex((s) => s.key === current);
  if (activeIndex < 0) activeIndex = 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => {
          const reached = !isCancelled && i <= activeIndex;
          const Icon = s.Icon;
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                  reached
                    ? "bg-[#0F3A3E] text-white border-[#0F3A3E]"
                    : "bg-white text-[#8A938E] border-[#E9E1D2]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p
                className={`text-[10px] text-center mt-1.5 max-w-[80px] ${
                  reached ? "text-[#0F3A3E] font-medium" : "text-[#8A938E]"
                }`}
              >
                {s.label}
              </p>
              {i < STEPS.length - 1 && (
                <div
                  className={`hidden`}
                  aria-hidden
                />
              )}
            </div>
          );
        })}
      </div>
      {/* linha conectora */}
      <div className="-mt-12 px-4 hidden sm:block">
        <div className="h-0.5 bg-[#E9E1D2] relative">
          {!isCancelled && (
            <div
              className="absolute top-0 left-0 h-0.5 bg-[#0F3A3E] transition-all"
              style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
            />
          )}
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
          <X className="h-4 w-4 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Pedido cancelado</p>
            <p className="text-xs text-red-700">
              Se voce ja pagou, o reembolso foi ou sera processado.
            </p>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <ol className="space-y-3 mt-4">
          {history
            .slice()
            .reverse()
            .map((h, i) => (
              <li
                key={i}
                className="flex gap-3 items-start text-sm border-l-2 border-[#E9E1D2] pl-3"
              >
                <div>
                  <p className="font-medium text-[#0F3A3E]">
                    {STATUS_LABEL[h.status] ?? h.status}
                  </p>
                  <p className="text-xs text-[#51635F]">
                    {formatDate(h.createdAt)}
                  </p>
                  {h.notes && (
                    <p className="text-xs text-[#51635F] mt-1 italic">
                      {h.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
        </ol>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  processing: "Em preparacao",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export default OrderTimeline;
