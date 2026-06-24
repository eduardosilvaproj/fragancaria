import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Calendar,
  Filter,
  Download,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useAffiliateStore } from "@/stores/affiliateStore";

export const Route = createFileRoute("/afiliado/dashboard/vendas")({
  component: VendasPage,
});

type SaleStatus = "pending" | "confirmed" | "paid" | "cancelled";

const STATUS_CONFIG: Record<SaleStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "#75827E", icon: Clock },
  confirmed: { label: "Confirmado", color: "#B07B1E", icon: CheckCircle },
  paid: { label: "Pago", color: "#1C6B4A", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "#C4433A", icon: XCircle },
};

function VendasPage() {
  const { sales, loadSales, dashboardSummary } = useAffiliateStore();
  const [statusFilter, setStatusFilter] = useState<SaleStatus | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadSales(1);
  }, [loadSales]);

  const filteredSales = sales.filter((sale) => {
    if (statusFilter !== "all" && sale.status !== statusFilter) return false;
    if (dateFrom && new Date(sale.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(sale.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Summary stats
  const totalSales = filteredSales.reduce((sum, s) => sum + s.order_total, 0);
  const totalCommission = filteredSales.reduce((sum, s) => sum + s.commission_amount, 0);
  const confirmedCommission = filteredSales
    .filter((s) => s.status === "confirmed" || s.status === "paid")
    .reduce((sum, s) => sum + s.commission_amount, 0);

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E]">Minhas Vendas</h1>
        <p className="text-[14px] text-[#75827E] mt-1">
          Acompanhe todas as vendas realizadas através dos seus links
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4 md:p-5">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Total em Vendas</p>
          <p className="font-serif text-[22px] text-[#0F3A3E] mt-1">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4 md:p-5">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Total Comissão</p>
          <p className="font-serif text-[22px] text-[#0F3A3E] mt-1">{formatCurrency(totalCommission)}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4 md:p-5">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Comissão Confirmada</p>
          <p className="font-serif text-[22px] text-[#1C6B4A] mt-1">{formatCurrency(confirmedCommission)}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4 md:p-5">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Taxa de Conversão</p>
          <p className="font-serif text-[22px] text-[#0F3A3E] mt-1">
            {dashboardSummary?.conversion_rate
              ? (dashboardSummary.conversion_rate * 100).toFixed(1)
              : "0"}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2 text-[13px] text-[#75827E]">
            <Filter className="h-4 w-4" />
            Filtrar:
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SaleStatus | "all")}
              className="px-4 py-2 bg-[#F8F4EA] border border-[#E0D8C7] text-[13px] text-[#0F3A3E] focus:border-[#B07B1E] outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#75827E]" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-[#F8F4EA] border border-[#E0D8C7] text-[13px] text-[#0F3A3E] focus:border-[#B07B1E] outline-none"
              />
              <span className="text-[#75827E]">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-[#F8F4EA] border border-[#E0D8C7] text-[13px] text-[#0F3A3E] focus:border-[#B07B1E] outline-none"
              />
            </div>
          </div>

          {(statusFilter !== "all" || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setStatusFilter("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-[12px] text-[#B07B1E] hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-[#E9E1D2]">
        {filteredSales.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <ShoppingBag className="h-12 w-12 text-[#E0D8C7] mx-auto mb-4" />
            <p className="text-[15px] text-[#0F3A3E] font-medium">Nenhuma venda encontrada</p>
            <p className="text-[13px] text-[#75827E] mt-1">
              {statusFilter !== "all" || dateFrom || dateTo
                ? "Tente ajustar os filtros"
                : "Compartilhe seus links e comece a vender!"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Pedido
                  </th>
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Data
                  </th>
                  <th className="text-right p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Valor
                  </th>
                  <th className="text-right p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Comissão
                  </th>
                  <th className="text-center p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  const status = STATUS_CONFIG[sale.status as SaleStatus] || STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={sale.id} className="border-b border-[#F3EEE3] hover:bg-[#FDFCFA]">
                      <td className="p-4">
                        <p className="text-[13px] font-medium text-[#0F3A3E]">
                          #{sale.order_number}
                        </p>
                        {sale.link && (
                          <p className="text-[11px] text-[#75827E] mt-0.5">
                            via {sale.link.product_name || "Link Geral"}
                          </p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-[13px] text-[#51635F]">{formatDate(sale.created_at)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-[14px] text-[#0F3A3E]">{formatCurrency(sale.order_total)}</p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-[14px] font-medium" style={{ color: status.color }}>
                          {formatCurrency(sale.commission_amount)}
                        </p>
                        <p className="text-[10px] text-[#8A938E] mt-0.5">
                          {(sale.commission_rate * 100).toFixed(0)}%
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] font-medium"
                          style={{
                            backgroundColor: `${status.color}15`,
                            color: status.color,
                          }}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-[#F8F4EA] border border-[#E9E1D2] p-4 md:p-6 flex items-start gap-4">
        <AlertCircle className="h-5 w-5 text-[#B07B1E] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] text-[#0F3A3E] font-medium">Sobre os status</p>
          <ul className="text-[12px] text-[#75827E] mt-2 space-y-1">
            <li><strong>Pendente:</strong> Pedido realizado, aguardando confirmação de pagamento.</li>
            <li><strong>Confirmado:</strong> Pagamento confirmado, comissão será paga no próximo ciclo.</li>
            <li><strong>Pago:</strong> Comissão já creditada na sua conta.</li>
            <li><strong>Cancelado:</strong> Pedido cancelado ou devolvido, comissão não será paga.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
