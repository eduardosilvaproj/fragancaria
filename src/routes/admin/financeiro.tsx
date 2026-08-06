import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Calendar,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/utils";
import {
  getFinanceiro,
  type FinanceiroResult,
} from "@/lib/financeiro.functions";

export const Route = createFileRoute("/admin/financeiro")({
  component: AdminFinanceiro,
});

function AdminFinanceiro() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchFn = useServerFn(getFinanceiro as any);

  const { data: result, isFetching, error } = useQuery({
    queryKey: ["admin-financeiro", dateFrom, dateTo],
    queryFn: () =>
      fetchFn({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      } as any),
    refetchOnWindowFocus: false,
  });

  const financeiro: FinanceiroResult | null = result ?? null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Financeiro
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">
            Dashboard Financeiro
          </h1>
          <p className="text-sm text-[#51635F] mt-1">
            Margem bruta sobre vendas realizadas
          </p>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="bg-white border border-[#E9E1D2] p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#8A938E]" />
            <span className="text-xs text-[#51635F] font-medium">De</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#51635F] font-medium">Até</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {isFetching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#B07B1E]" />
        </div>
      )}

      {/* Error */}
      {error && !isFetching && (
        <div className="bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          Erro ao carregar dados: {error.message}
        </div>
      )}

      {/* Conteúdo */}
      {financeiro && !isFetching && (
        <>
          {/* Avisos */}
          <div className="space-y-2">
            {financeiro.avisos.map((aviso, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 p-3 text-sm border",
                  i === 0 && financeiro.itensSemCusto > 0
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-blue-50 border-blue-200 text-blue-800",
                )}
              >
                {i === 0 && financeiro.itensSemCusto > 0 ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>{aviso}</span>
              </div>
            ))}
          </div>

          {/* Cards de métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receita */}
            <div className="bg-white border border-[#E9E1D2] p-5">
              <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
                Receita de Produtos
              </p>
              <p className="font-serif text-2xl text-[#0F3A3E]">
                {formatBRL(financeiro.receita)}
              </p>
            </div>

            {/* Custo */}
            <div className="bg-white border border-[#E9E1D2] p-5">
              <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
                CPV (Custo)
              </p>
              <p className="font-serif text-2xl text-[#0F3A3E]">
                {formatBRL(financeiro.custo)}
              </p>
            </div>

            {/* Margem Bruta */}
            <div className="bg-white border border-[#E9E1D2] p-5">
              <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
                Margem Bruta
              </p>
              <p className="font-serif text-2xl text-[#0F3A3E]">
                {formatBRL(financeiro.margemBruta)}
              </p>
              {financeiro.margemPercentual != null && (
                <div className="flex items-center gap-1 mt-1">
                  {financeiro.margemPercentual >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium",
                      financeiro.margemPercentual >= 0
                        ? "text-emerald-600"
                        : "text-red-500",
                    )}
                  >
                    {financeiro.margemPercentual.toFixed(1)}%
                  </span>
                </div>
              )}
              {financeiro.margemPercentual == null && (
                <p className="text-xs text-[#8A938E] mt-1">
                  Nenhum item com custo
                </p>
              )}
            </div>

            {/* Pedidos / Ticket */}
            <div className="bg-white border border-[#E9E1D2] p-5">
              <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
                Pedidos / Ticket Médio
              </p>
              <p className="font-serif text-2xl text-[#0F3A3E]">
                {financeiro.totalPedidos}
              </p>
              <p className="text-xs text-[#51635F] mt-1">
                Ticket médio: {formatBRL(financeiro.ticketMedio)}
              </p>
            </div>
          </div>

          {/* Ranking de produtos */}
          <div className="bg-white border border-[#E9E1D2] overflow-hidden">
            <div className="p-4 border-b border-[#E9E1D2] flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#0F3A3E]">
                Produtos Mais Vendidos
              </h3>
              <span className="text-xs text-[#8A938E]">
                {financeiro.ranking.length} produtos
              </span>
            </div>

            {financeiro.ranking.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#8A938E]">
                <ShoppingCart className="h-10 w-10 mb-3" />
                <p className="text-sm">Nenhum produto vendido no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E9E1D2] bg-[#F5F3EE]">
                      <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-[#51635F] font-medium w-8">
                        #
                      </th>
                      <th className="text-left px-4 py-2 text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
                        Produto
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
                        Qtd
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
                        Receita
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
                        Custo
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
                        Margem
                      </th>
                      <th className="text-right px-4 py-2 text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E9E1D2]">
                    {financeiro.ranking.map((prod, i) => (
                      <tr
                        key={prod.id}
                        className="hover:bg-[#F3EEE3]/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-[#8A938E] text-xs">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 text-[#0F3A3E] max-w-[250px] truncate">
                          {prod.title}
                        </td>
                        <td className="px-4 py-3 text-right text-[#51635F]">
                          {prod.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-[#0F3A3E]">
                          {formatBRL(prod.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-[#51635F]">
                          {prod.cost != null
                            ? formatBRL(prod.cost)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {prod.margin != null ? (
                            <span
                              className={
                                prod.margin >= 0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }
                            >
                              {formatBRL(prod.margin)}
                            </span>
                          ) : (
                            <span className="text-[#8A938E]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {prod.marginPercent != null ? (
                            <span
                              className={cn(
                                "text-xs font-medium",
                                prod.marginPercent >= 0
                                  ? "text-emerald-600"
                                  : "text-red-500",
                              )}
                            >
                              {prod.marginPercent.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-[#8A938E] text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default AdminFinanceiro;
