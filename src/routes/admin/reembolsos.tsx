import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RotateCcw, RefreshCcw, RefreshCw, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listRefundRequests,
  approveRefund,
  rejectRefund,
  type AdminRefundRow,
} from "@/lib/refund.functions";
import {
  listReturnRequests,
  resolveReturn,
  type AdminReturnRow,
} from "@/lib/returns.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reembolsos")({
  component: ReembolsosPage,
});

function formatPrice(v: number) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const REFUND_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "bg-yellow-50 text-yellow-700" },
  approved: { label: "Aprovado", cls: "bg-green-50 text-green-700" },
  rejected: { label: "Recusado", cls: "bg-red-50 text-red-700" },
};

const RETURN_STATUS: Record<string, { label: string; cls: string }> = {
  requested: { label: "Solicitada", cls: "bg-yellow-50 text-yellow-700" },
  approved: { label: "Aprovada", cls: "bg-blue-50 text-blue-700" },
  rejected: { label: "Recusada", cls: "bg-red-50 text-red-700" },
  awaiting_return: { label: "Aguardando envio", cls: "bg-purple-50 text-purple-700" },
  received: { label: "Recebida", cls: "bg-indigo-50 text-indigo-700" },
  completed: { label: "Concluída", cls: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelada", cls: "bg-gray-100 text-gray-600" },
};

const REASON_LABEL: Record<string, string> = {
  arrependimento: "Arrependimento",
  defeito: "Defeito",
  produto_errado: "Produto errado",
  avaria_transporte: "Avaria no transporte",
  outro: "Outro",
};
const RESOLUTION_LABEL: Record<string, string> = {
  reembolso: "Reembolso",
  troca: "Troca",
  vale_compra: "Vale-compra",
};

function ReembolsosPage() {
  const [tab, setTab] = useState<"refunds" | "returns">("refunds");
  const [refunds, setRefunds] = useState<AdminRefundRow[]>([]);
  const [returns, setReturns] = useState<AdminReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        listRefundRequests({ data: {} }),
        listReturnRequests({ data: {} }),
      ]);
      if (r1.success) setRefunds(r1.data);
      else toast.error(r1.error);
      if (r2.success) setReturns(r2.data);
      else toast.error(r2.error);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doApprove = async (id: string) => {
    setBusyId(id);
    try {
      const res = await approveRefund({ data: { refundRequestId: id } });
      if (res.success) {
        toast.success(`Estorno processado (${res.orderStatus})`);
        load();
      } else {
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (id: string) => {
    setBusyId(id);
    try {
      const res = await rejectRefund({ data: { refundRequestId: id } });
      if (res.success) {
        toast.success("Solicitação recusada");
        load();
      } else {
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setBusyId(null);
    }
  };

  const advanceReturn = async (id: string, status: string) => {
    setBusyId(id);
    try {
      const res = await resolveReturn({ data: { returnRequestId: id, status: status as any } });
      if (res.success) {
        toast.success("Devolução atualizada");
        load();
      } else {
        toast.error(res.error);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <RotateCcw className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Pós-venda
          </span>
        </div>
        <h1 className="text-2xl font-serif text-[#0F3A3E]">Reembolsos e Devoluções</h1>
      </div>

      <div className="flex items-center gap-2 border-b border-[#E9E1D2]">
        <button
          onClick={() => setTab("refunds")}
          className={cn(
            "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
            tab === "refunds"
              ? "border-[#0F3A3E] text-[#0F3A3E] font-medium"
              : "border-transparent text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          Reembolsos ({refunds.length})
        </button>
        <button
          onClick={() => setTab("returns")}
          className={cn(
            "px-4 py-2 text-sm border-b-2 -mb-px transition-colors",
            tab === "returns"
              ? "border-[#0F3A3E] text-[#0F3A3E] font-medium"
              : "border-transparent text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          Devoluções ({returns.length})
        </button>
        <div className="flex-1" />
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-[#E9E1D2] hover:bg-[#F8F4EA] disabled:opacity-50 mb-1"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <RefreshCw className="w-8 h-8 text-[#B07B1E] animate-spin mx-auto mb-4" />
          <p className="text-[#51635F]">Carregando...</p>
        </div>
      ) : tab === "refunds" ? (
        refunds.length === 0 ? (
          <p className="text-sm text-[#51635F] p-8 text-center bg-white border border-[#E9E1D2]">
            Nenhuma solicitação de reembolso.
          </p>
        ) : (
          <div className="bg-white border border-[#E9E1D2] divide-y divide-[#E9E1D2]">
            {refunds.map((r) => {
              const st = REFUND_STATUS[r.status] ?? { label: r.status, cls: "bg-gray-100 text-gray-600" };
              return (
                <div key={r.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-[#0F3A3E]">
                        #{r.orderId.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", st.cls)}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-sm text-[#0F3A3E] mt-1">{r.customerName || r.customerEmail}</p>
                    <p className="text-sm text-[#51635F] mt-1">{r.reason}</p>
                    <p className="text-xs text-[#8A938E] mt-1">
                      {formatDate(r.createdAt)} · {formatPrice(r.orderTotal)} ·{" "}
                      {r.paymentStatus === "approved" ? "pago (estorno)" : "pendente (cancelamento)"}
                    </p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => doApprove(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {busyId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        Aprovar e estornar
                      </button>
                      <button
                        onClick={() => doReject(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : returns.length === 0 ? (
        <p className="text-sm text-[#51635F] p-8 text-center bg-white border border-[#E9E1D2]">
          Nenhuma solicitação de devolução.
        </p>
      ) : (
        <div className="bg-white border border-[#E9E1D2] divide-y divide-[#E9E1D2]">
          {returns.map((r) => {
            const st = RETURN_STATUS[r.status] ?? { label: r.status, cls: "bg-gray-100 text-gray-600" };
            const terminal = r.status === "completed" || r.status === "cancelled";
            return (
              <div key={r.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[#0F3A3E]">
                      #{r.orderId.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium", st.cls)}>
                      {st.label}
                    </span>
                    <RefreshCcw className="w-3 h-3 text-[#8A938E]" />
                  </div>
                  <p className="text-sm text-[#0F3A3E] mt-1">{r.customerName || r.customerEmail}</p>
                  <p className="text-sm text-[#51635F] mt-1">
                    {REASON_LABEL[r.reason] ?? r.reason} · {RESOLUTION_LABEL[r.resolution] ?? r.resolution}
                    {r.resolution === "vale_compra" && r.status !== "completed" && (
                      <span className="text-[#B07B1E]"> · vale de {formatPrice(r.orderTotal)} ao concluir</span>
                    )}
                  </p>
                  {r.description && <p className="text-xs text-[#8A938E] mt-1">{r.description}</p>}
                  <p className="text-xs text-[#8A938E] mt-1">{formatDate(r.createdAt)}</p>
                </div>
                {!terminal && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      defaultValue=""
                      disabled={busyId === r.id}
                      onChange={(e) => {
                        if (e.target.value) advanceReturn(r.id, e.target.value);
                      }}
                      className="text-xs border border-[#E9E1D2] rounded px-2 py-1.5 bg-white disabled:opacity-50"
                    >
                      <option value="">Alterar status...</option>
                      <option value="approved">Aprovar</option>
                      <option value="awaiting_return">Aguardando envio</option>
                      <option value="received">Recebida</option>
                      <option value="completed">Concluir</option>
                      <option value="rejected">Recusar</option>
                      <option value="cancelled">Cancelar</option>
                    </select>
                    {busyId === r.id && <Loader2 className="w-4 h-4 animate-spin text-[#8A938E]" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReembolsosPage;
