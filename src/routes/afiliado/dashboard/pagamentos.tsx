import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useAffiliateStore } from "@/stores/affiliateStore";
import { summarizeCommissions } from "@/lib/affiliate-payout";

export const Route = createFileRoute("/afiliado/dashboard/pagamentos")({
  component: PagamentosPage,
});

type PayoutStatus = "pending" | "processing" | "paid" | "failed" | "cancelled";

const STATUS_CONFIG: Record<PayoutStatus, { label: string; color: string; icon: LucideIcon }> = {
  pending: { label: "Aguardando envio", color: "#75827E", icon: Clock },
  processing: { label: "Processando", color: "#B07B1E", icon: Clock },
  paid: { label: "Pago", color: "#1C6B4A", icon: CheckCircle },
  failed: { label: "Falhou", color: "#C4433A", icon: AlertCircle },
  cancelled: { label: "Cancelado", color: "#C4433A", icon: XCircle },
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PagamentosPage() {
  const { payouts, loadPayouts, affiliate, commissionRows, payoutSettings, loadCommissions } =
    useAffiliateStore();

  useEffect(() => {
    loadPayouts(1);
    loadCommissions();
  }, [loadPayouts, loadCommissions]);

  // Os três números são DERIVADOS das linhas de comissão + prazo
  // configurado. Nenhum deles é lido de uma coluna do banco: não existe
  // status "disponível" — é confirmed com o prazo cumprido.
  const summary = useMemo(
    () => summarizeCommissions(commissionRows, payoutSettings.releaseDelayDays),
    [commissionRows, payoutSettings.releaseDelayDays],
  );

  // Lotes já fechados cujo dinheiro ainda não saiu. A comissão vira 'paid'
  // no fechamento, mas o PIX é feito depois — sem isto o afiliado leria
  // "Pago" e esperaria o dinheiro na conta.
  const awaitingTransfer = payouts
    .filter((p) => p.status !== "paid" && p.status !== "cancelled" && p.status !== "failed")
    .reduce((sum, p) => sum + (p.amount ?? p.net_amount ?? 0), 0);

  const hasPixKey = Boolean(affiliate?.pix_key);

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E]">Pagamentos</h1>
        <p className="text-[14px] text-[#75827E] mt-1">
          Acompanhe suas comissões e o histórico de repasses
        </p>
      </div>

      {/* Três números: Pendente, Disponível, Pago */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-[#B07B1E]" />
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Pendente</p>
          </div>
          <p className="font-serif text-[28px] text-[#B07B1E]">
            {formatCurrency(summary.pendingTotal)}
          </p>
          <p className="text-[12px] text-[#8A938E] mt-2">
            {summary.pendingCount === 0
              ? `Comissões liberam ${payoutSettings.releaseDelayDays} dias após a aprovação do pagamento.`
              : `${summary.pendingCount} ${summary.pendingCount === 1 ? "venda" : "vendas"} dentro do prazo de ${payoutSettings.releaseDelayDays} dias.`}
          </p>
          {summary.nextReleaseAt && (
            <p className="text-[12px] text-[#51635F] mt-1">
              Próxima liberação em {formatDate(summary.nextReleaseAt)}.
            </p>
          )}
        </div>

        <div className="bg-[#0F3A3E] text-white p-6">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-[#E8C25A]" />
            <p className="text-[11px] uppercase tracking-[0.15em] text-white/60">Disponível</p>
          </div>
          <p className="font-serif text-[32px]">{formatCurrency(summary.availableTotal)}</p>
          <p className="text-[12px] text-white/70 mt-2">
            {summary.availableTotal >= payoutSettings.minPayoutAmount
              ? "Alcançou o mínimo. Entra no próximo fechamento."
              : `Liberado, aguardando repasse. Mínimo de ${formatCurrency(payoutSettings.minPayoutAmount)} para o repasse acontecer.`}
          </p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-[#1C6B4A]" />
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">Pago</p>
          </div>
          <p className="font-serif text-[28px] text-[#1C6B4A]">
            {formatCurrency(summary.paidTotal)}
          </p>
          <p className="text-[12px] text-[#8A938E] mt-2">
            {summary.paidCount === 0
              ? "Nenhuma comissão repassada ainda."
              : `${summary.paidCount} ${summary.paidCount === 1 ? "comissão fechada" : "comissões fechadas"} em repasse.`}
          </p>
          {awaitingTransfer > 0 && (
            <p className="text-[12px] text-[#B07B1E] mt-1">
              {formatCurrency(awaitingTransfer)} com o Pix ainda não confirmado.
            </p>
          )}
        </div>
      </div>

      {/* Chave Pix */}
      <div
        className={`border p-4 md:p-6 mb-6 ${
          hasPixKey ? "bg-[#F8F4EA] border-[#E9E1D2]" : "bg-[#FDF6E7] border-[#E8C25A]"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white border border-[#E9E1D2] flex items-center justify-center shrink-0">
            <CreditCard className="h-6 w-6 text-[#B07B1E]" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#0F3A3E]">
              {hasPixKey ? "Chave Pix cadastrada" : "Chave Pix não cadastrada"}
            </p>
            {hasPixKey ? (
              <p className="text-[13px] text-[#51635F] mt-0.5">
                {affiliate?.pix_key_type === "cpf" && "CPF: "}
                {affiliate?.pix_key_type === "email" && "E-mail: "}
                {affiliate?.pix_key_type === "phone" && "Telefone: "}
                {affiliate?.pix_key_type === "random" && "Chave: "}
                {affiliate?.pix_key_type === "cnpj" && "CNPJ: "}
                <strong>{affiliate?.pix_key}</strong>
              </p>
            ) : (
              <p className="text-[13px] text-[#51635F] mt-0.5">
                Cadastre sua chave em Configurações para receber os repasses.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-white border border-[#E9E1D2] p-6 mb-6">
        <h3 className="font-serif text-[18px] text-[#0F3A3E] mb-4">Como funciona o repasse</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0F3A3E] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              1
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Prazo de liberação</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                A comissão fica pendente por {payoutSettings.releaseDelayDays} dias corridos
                contados da aprovação do pagamento do pedido.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0F3A3E] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              2
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Valor mínimo</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                O repasse acontece quando o disponível alcança{" "}
                {formatCurrency(payoutSettings.minPayoutAmount)}. Abaixo disso, as comissões
                seguem acumulando.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#0F3A3E] text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
              3
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#0F3A3E]">Forma de pagamento</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                Exclusivamente via Pix, na chave cadastrada. Você não precisa solicitar: o
                repasse é feito pela Fragranciaria.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de repasses */}
      <div className="bg-white border border-[#E9E1D2]">
        <div className="p-4 md:p-6 border-b border-[#E9E1D2]">
          <h2 className="font-serif text-[18px] text-[#0F3A3E]">Histórico de Repasses</h2>
        </div>

        {payouts.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <DollarSign className="h-12 w-12 text-[#E0D8C7] mx-auto mb-4" />
            <p className="text-[15px] text-[#0F3A3E] font-medium">Nenhum repasse ainda</p>
            <p className="text-[13px] text-[#75827E] mt-1">
              Seus repasses aparecerão aqui quando forem fechados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Período das comissões
                  </th>
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Fechado em
                  </th>
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Pago em
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
                  const status =
                    STATUS_CONFIG[payout.status as PayoutStatus] ?? STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;

                  return (
                    <tr key={payout.id} className="border-b border-[#F3EEE3] hover:bg-[#FDFCFA]">
                      <td className="p-4">
                        <p className="text-[13px] text-[#0F3A3E]">
                          {payout.period_start && payout.period_end
                            ? `${formatDate(payout.period_start)} — ${formatDate(payout.period_end)}`
                            : "—"}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="text-[13px] text-[#51635F]">
                          {payout.created_at ? formatDate(payout.created_at) : "—"}
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
