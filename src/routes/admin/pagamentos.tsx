import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CreditCard,
  QrCode,
  FileText,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Settings,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pagamentos")({
  component: AdminPagamentos,
});

// Mock data
const MOCK_TRANSACTIONS = [
  {
    id: "1",
    mp_id: "12345678901",
    order_number: 1001,
    customer_name: "Maria Silva",
    amount: 459.80,
    payment_method: "credit_card",
    payment_brand: "Visa",
    installments: 3,
    status: "approved",
    created_at: "2024-01-15T14:30:00",
  },
  {
    id: "2",
    mp_id: "12345678902",
    order_number: 1002,
    customer_name: "João Santos",
    amount: 289.90,
    payment_method: "pix",
    payment_brand: null,
    installments: 1,
    status: "approved",
    created_at: "2024-01-15T10:15:00",
  },
  {
    id: "3",
    mp_id: "12345678903",
    order_number: 1003,
    customer_name: "Ana Oliveira",
    amount: 199.90,
    payment_method: "boleto",
    payment_brand: null,
    installments: 1,
    status: "pending",
    created_at: "2024-01-15T09:00:00",
  },
  {
    id: "4",
    mp_id: "12345678904",
    order_number: 1004,
    customer_name: "Carlos Mendes",
    amount: 749.70,
    payment_method: "credit_card",
    payment_brand: "Mastercard",
    installments: 6,
    status: "approved",
    created_at: "2024-01-14T16:45:00",
  },
  {
    id: "5",
    mp_id: "12345678905",
    order_number: 1005,
    customer_name: "Fernanda Costa",
    amount: 159.90,
    payment_method: "pix",
    payment_brand: null,
    installments: 1,
    status: "refunded",
    created_at: "2024-01-14T11:20:00",
  },
  {
    id: "6",
    mp_id: "12345678906",
    order_number: 1006,
    customer_name: "Roberto Lima",
    amount: 89.90,
    payment_method: "credit_card",
    payment_brand: "Elo",
    installments: 2,
    status: "rejected",
    created_at: "2024-01-14T09:30:00",
  },
];

function AdminPagamentos() {
  const [selectedTab, setSelectedTab] = useState<"transactions" | "config">("transactions");

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: Clock },
      approved: { label: "Aprovado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      rejected: { label: "Recusado", color: "bg-red-100 text-red-700", icon: XCircle },
      refunded: { label: "Estornado", color: "bg-gray-100 text-gray-600", icon: RefreshCw },
      in_process: { label: "Processando", color: "bg-blue-100 text-blue-700", icon: Clock },
    };

    const { label, color, icon: Icon } = config[status] || config.pending;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded", color)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "credit_card":
        return <CreditCard className="h-4 w-4" />;
      case "pix":
        return <QrCode className="h-4 w-4" />;
      case "boleto":
        return <FileText className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string, brand?: string | null) => {
    switch (method) {
      case "credit_card":
        return brand || "Cartão de Crédito";
      case "pix":
        return "Pix";
      case "boleto":
        return "Boleto";
      default:
        return method;
    }
  };

  const stats = {
    totalApproved: MOCK_TRANSACTIONS.filter((t) => t.status === "approved").reduce((sum, t) => sum + t.amount, 0),
    totalPending: MOCK_TRANSACTIONS.filter((t) => t.status === "pending").reduce((sum, t) => sum + t.amount, 0),
    approvalRate: Math.round(
      (MOCK_TRANSACTIONS.filter((t) => t.status === "approved").length /
        MOCK_TRANSACTIONS.filter((t) => t.status !== "pending").length) *
        100
    ),
    pixRate: Math.round(
      (MOCK_TRANSACTIONS.filter((t) => t.payment_method === "pix").length / MOCK_TRANSACTIONS.length) * 100
    ),
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Financeiro
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Pagamentos</h1>
        </div>

        <a
          href="https://www.mercadopago.com.br/developers/panel"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Painel Mercado Pago
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Receita (aprovados)
          </p>
          <p className="font-serif text-2xl text-emerald-600">
            {formatPrice(stats.totalApproved)}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pendentes
          </p>
          <p className="font-serif text-2xl text-amber-600">
            {formatPrice(stats.totalPending)}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Taxa de Aprovação
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{stats.approvalRate}%</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pagamentos Pix
          </p>
          <p className="font-serif text-2xl text-[#B07B1E]">{stats.pixRate}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[#E9E1D2]">
        <button
          onClick={() => setSelectedTab("transactions")}
          className={cn(
            "pb-3 text-sm font-medium transition-colors",
            selectedTab === "transactions"
              ? "text-[#0F3A3E] border-b-2 border-[#B07B1E]"
              : "text-[#8A938E] hover:text-[#0F3A3E]"
          )}
        >
          Transações
        </button>
        <button
          onClick={() => setSelectedTab("config")}
          className={cn(
            "pb-3 text-sm font-medium transition-colors",
            selectedTab === "config"
              ? "text-[#0F3A3E] border-b-2 border-[#B07B1E]"
              : "text-[#8A938E] hover:text-[#0F3A3E]"
          )}
        >
          <Settings className="h-4 w-4 inline mr-1" />
          Configurações
        </button>
      </div>

      {selectedTab === "transactions" ? (
        /* Transactions Table */
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    ID MP
                  </th>
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Pedido
                  </th>
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Cliente
                  </th>
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Método
                  </th>
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Valor
                  </th>
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Status
                  </th>
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TRANSACTIONS.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-b border-[#E9E1D2] hover:bg-[#F8F4EA]/50 transition-colors"
                  >
                    <td className="p-4">
                      <code className="text-xs font-mono text-[#51635F]">
                        {transaction.mp_id}
                      </code>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-[#0F3A3E]">
                        #{transaction.order_number}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-[#51635F]">
                        {transaction.customer_name}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(transaction.payment_method)}
                        <div>
                          <p className="text-sm text-[#0F3A3E]">
                            {getPaymentMethodLabel(transaction.payment_method, transaction.payment_brand)}
                          </p>
                          {transaction.installments > 1 && (
                            <p className="text-xs text-[#8A938E]">
                              {transaction.installments}x
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-serif text-[#0F3A3E]">
                        {formatPrice(transaction.amount)}
                      </span>
                    </td>
                    <td className="p-4">{getStatusBadge(transaction.status)}</td>
                    <td className="p-4">
                      <span className="text-sm text-[#51635F]">
                        {formatDate(transaction.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Config Panel */
        <div className="space-y-6">
          {/* Mercado Pago Integration */}
          <div className="bg-white border border-[#E9E1D2] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#009EE3] rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">MP</span>
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#0F3A3E]">Mercado Pago</h3>
                <p className="text-sm text-[#8A938E]">Gateway de pagamento principal</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                <CheckCircle className="h-3 w-3" />
                Conectado
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Public Key
                </label>
                <input
                  type="text"
                  placeholder="APP_USR-xxxxx..."
                  className="w-full px-4 py-2 border border-[#E9E1D2] text-sm font-mono focus:outline-none focus:border-[#B07B1E]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  placeholder="APP_USR-xxxxx..."
                  className="w-full px-4 py-2 border border-[#E9E1D2] text-sm font-mono focus:outline-none focus:border-[#B07B1E]"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded border-[#E9E1D2]" />
                  <span className="text-sm text-[#51635F]">Modo Produção</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-[#E9E1D2]" />
                  <span className="text-sm text-[#51635F]">Sandbox (testes)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white border border-[#E9E1D2] p-6">
            <h3 className="font-serif text-lg text-[#0F3A3E] mb-4">
              Métodos de Pagamento Ativos
            </h3>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-[#E9E1D2] cursor-pointer hover:bg-[#F8F4EA] transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-[#B07B1E]" />
                  <div>
                    <p className="font-medium text-[#0F3A3E]">Cartão de Crédito</p>
                    <p className="text-xs text-[#8A938E]">Visa, Mastercard, Elo, Amex, Hipercard</p>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-[#E9E1D2]" />
              </label>

              <label className="flex items-center justify-between p-4 border border-[#E9E1D2] cursor-pointer hover:bg-[#F8F4EA] transition-colors">
                <div className="flex items-center gap-3">
                  <QrCode className="h-5 w-5 text-[#B07B1E]" />
                  <div>
                    <p className="font-medium text-[#0F3A3E]">Pix</p>
                    <p className="text-xs text-[#8A938E]">Pagamento instantâneo</p>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-[#E9E1D2]" />
              </label>

              <label className="flex items-center justify-between p-4 border border-[#E9E1D2] cursor-pointer hover:bg-[#F8F4EA] transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-[#B07B1E]" />
                  <div>
                    <p className="font-medium text-[#0F3A3E]">Boleto Bancário</p>
                    <p className="text-xs text-[#8A938E]">Vencimento em 3 dias úteis</p>
                  </div>
                </div>
                <input type="checkbox" defaultChecked className="rounded border-[#E9E1D2]" />
              </label>
            </div>
          </div>

          {/* Installments Config */}
          <div className="bg-white border border-[#E9E1D2] p-6">
            <h3 className="font-serif text-lg text-[#0F3A3E] mb-4">
              Parcelamento
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Máximo de Parcelas
                </label>
                <select className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]">
                  <option value="3">3x sem juros</option>
                  <option value="6">6x sem juros</option>
                  <option value="10" selected>10x sem juros</option>
                  <option value="12">12x sem juros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Valor Mínimo por Parcela
                </label>
                <input
                  type="number"
                  defaultValue={30}
                  className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button className="px-6 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors">
              Salvar Configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPagamentos;
