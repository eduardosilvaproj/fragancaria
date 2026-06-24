import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  DollarSign,
  Calendar,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { useAffiliateStore } from "@/stores/affiliateStore";

export const Route = createFileRoute("/afiliado/dashboard/pagamentos")({
  component: PagamentosPage,
});

type PayoutStatus = "pending" | "processing" | "paid" | "failed";

const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "#75827E", icon: Clock },
  processing: { label: "Processando", color: "#B07B1E", icon: Clock },
  paid: { label: "Pago", color: "#1C6B4A", icon: CheckCircle },
  failed: { label: "Falhou", color: "#C4433A", icon: AlertCircle },
};

function PagamentosPage() {
  const { payouts, loadPayouts, dashboardSummary, affiliate } = useAffiliateStore();

  useEffect(() => {
    loadPayouts(1);
  }, [loadPayouts]);

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

  // Summary
  const pendingAmount = dashboardSummary?.pending_commission || 0;
  const availableAmount = dashboardSummary?.available_commission || 0;
  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount ?? p.net_amount ?? 0), 0);

  const canRequestPayout = availableAmount >= 100;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E]">Pagamentos</h1>
        <p className="text-[14px] text-[#75827E] mt-1">
          Acompanhe suas comissões e histórico de pagamentos
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0F3A3E] text-white p-6">
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/60">Disponível para Saque</p>
          <p className="font-serif text-[32px] mt-2">{formatCurrency(availableAmount)}</p>
          <div className="mt-4">
            <button
              disabled={!canRequestPayout}
              className={`w-full flex items-center justify-center gap-2 py-3 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors ${
                canRequestPayout
                  ? "bg-[#E8C25A] hover:bg-[#F0D06A] text-[#0F3A3E]"
                  : "bg-white/20 text-white/50 cursor-not-allowed"
              }`}
            >
              Solicitar Saque
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-6">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Pendente de Confirmação</p>
          <p className="font-serif text-[28px] text-[#B07B1E] mt-2">{formatCurrency(pendingAmount)}</p>
          <p className="text-[12px] text-[#8A938E] mt-2">
            Vendas aguardando prazo de devolução
          </p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-6">
          <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Total Pago</p>
          <p className="font-serif text-[28px] text-[#1C6B4A] mt-2">{formatCurrency(totalPaid)}</p>
          <p className="text-[12px] text-[#8A938E] mt-2">
            Desde que você se tornou afiliado
          </p>
        </div>
      </div>

      {/* Pix Info */}
      <div className="bg-[#F8F4EA] border border-[#E9E1D2] p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white border border-[#E9E1D2] flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-[#B07B1E]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Chave Pix Cadastrada</p>
              <p className="text-[13px] text-[#51635F] mt-0.5">
                {affiliate?.pix_key_type === "cpf" && "CPF: "}
                {affiliate?.pix_key_type === "email" && "E-mail: "}
                {affiliate?.pix_key_type === "phone" && "Telefone: "}
                {affiliate?.pix_key_type === "random" && "Chave: "}
                {affiliate?.pix_key_type === "cnpj" && "CNPJ: "}
                <strong>{affiliate?.pix_key}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payout Rules */}
      <div className="bg-white border border-[#E9E1D2] p-6 mb-6">
        <h3 className="font-serif text-[18px] text-[#0F3A3E] mb-4">Regras de Pagamento</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0F3A3E] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Valor Mínimo</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                O saque mínimo é de R$100,00 em comissões disponíveis.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0F3A3E] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Prazo de Confirmação</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                As vendas ficam pendentes por 30 dias (prazo de devolução).
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0F3A3E] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Data de Pagamento</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                Pagamentos são feitos até o dia 15 de cada mês.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0F3A3E] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              4
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Forma de Pagamento</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                Exclusivamente via Pix, na chave cadastrada.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payouts History */}
      <div className="bg-white border border-[#E9E1D2]">
        <div className="p-4 md:p-6 border-b border-[#E9E1D2]">
          <h2 className="font-serif text-[18px] text-[#0F3A3E]">Histórico de Pagamentos</h2>
        </div>

        {payouts.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <DollarSign className="h-12 w-12 text-[#E0D8C7] mx-auto mb-4" />
            <p className="text-[15px] text-[#0F3A3E] font-medium">Nenhum pagamento ainda</p>
            <p className="text-[13px] text-[#75827E] mt-1">
              Seus pagamentos aparecerão aqui quando forem processados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Período
                  </th>
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Data do Pagamento
                  </th>
                  <th className="text-right p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Valor
                  </th>
                  <th className="text-center p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => {
                  const status = STATUS_CONFIG[payout.status as PayoutStatus] || STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={payout.id} className="border-b border-[#F3EEE3] hover:bg-[#FDFCFA]">
                      <td className="p-4">
                        <p className="text-[13px] text-[#0F3A3E]">
                          {payout.period_start && payout.period_end
                            ? `${formatDate(payout.period_start)} - ${formatDate(payout.period_end)}`
                            : "—"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-[13px] text-[#51635F]">
                          {payout.paid_at ? formatDate(payout.paid_at) : "—"}
                        </p>
                      </td>
                      <td className="p-4 text-right">
                        <p className="text-[15px] font-medium text-[#0F3A3E]">
                          {formatCurrency(payout.amount ?? payout.net_amount ?? 0)}
                        </p>
                      </td>
                      <td className="p-4">
                        <span
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] font-medium mx-auto"
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
    </div>
  );
}
