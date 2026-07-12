import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  QrCode,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Settings,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listPaymentTransactions,
  getPaymentStats,
  getPaymentSettings,
  savePaymentSettings,
  type PaymentTransaction,
  type PaymentSettings,
} from "@/lib/payments.functions";

export const Route = createFileRoute("/admin/pagamentos")({
  component: AdminPagamentos,
});

function AdminPagamentos() {
  const [selectedTab, setSelectedTab] = useState<"transactions" | "config">("transactions");

  // Query: transações
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactionsQuery = useQuery<any>({
    queryKey: ["admin-payment-transactions"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => listPaymentTransactions({} as any),
    refetchOnWindowFocus: false,
  });
  const transactions: PaymentTransaction[] = transactionsQuery.data?.success
    ? transactionsQuery.data.data
    : [];
  const isLoadingTx = transactionsQuery.isLoading;

  // Query: estatísticas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statsQuery = useQuery<any>({
    queryKey: ["admin-payment-stats"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => getPaymentStats({} as any),
    refetchOnWindowFocus: false,
  });
  const stats = statsQuery.data?.success ? statsQuery.data.data : null;

  const formatPrice = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: Clock },
      approved: { label: "Aprovado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      rejected: { label: "Recusado", color: "bg-red-100 text-red-700", icon: XCircle },
      refunded: { label: "Estornado", color: "bg-gray-100 text-gray-600", icon: RefreshCw },
      processing: { label: "Processando", color: "bg-blue-100 text-blue-700", icon: Clock },
    };
    const { label, color, icon: Icon } = config[status] || config.pending;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded", color)}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string | null) => {
    switch (method) {
      case "credit_card": return <CreditCard className="h-4 w-4" />;
      case "pix": return <QrCode className="h-4 w-4" />;
      case "boleto": return <FileText className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string | null, brand?: string | null) => {
    switch (method) {
      case "credit_card": return brand || "Cartão de Crédito";
      case "pix": return "Pix";
      case "boleto": return "Boleto";
      default: return method || "—";
    }
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
            {stats ? formatPrice(stats.totalApproved) : "—"}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pendentes
          </p>
          <p className="font-serif text-2xl text-amber-600">
            {stats ? formatPrice(stats.totalPending) : "—"}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Taxa de Aprovação
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">
            {stats ? `${stats.approvalRate}%` : "—"}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pagamentos Pix
          </p>
          <p className="font-serif text-2xl text-[#B07B1E]">
            {stats ? `${stats.pixRate}%` : "—"}
          </p>
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
          {isLoadingTx ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#B07B1E]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-[#8A938E]">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Nenhuma transação encontrada</p>
            </div>
          ) : (
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
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-[#E9E1D2] hover:bg-[#F8F4EA]/50 transition-colors"
                    >
                      <td className="p-4">
                        <code className="text-xs font-mono text-[#51635F]">
                          {tx.gateway_transaction_id || tx.gateway_transaction_id || "—"}
                        </code>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-[#0F3A3E]">
                          #{tx.order_number ?? "—"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-[#51635F]">
                          {tx.customer_name || "—"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(tx.payment_method)}
                          <div>
                            <p className="text-sm text-[#0F3A3E]">
                              {getPaymentMethodLabel(tx.payment_method, tx.card_brand)}
                            </p>
                            {tx.installments > 1 && (
                              <p className="text-xs text-[#8A938E]">{tx.installments}x</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-serif text-[#0F3A3E]">
                          {formatPrice(tx.amount)}
                        </span>
                      </td>
                      <td className="p-4">{getStatusBadge(tx.status)}</td>
                      <td className="p-4">
                        <span className="text-sm text-[#51635F]">
                          {formatDate(tx.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Config Panel */
        <PaymentSettingsPanel />
      )}
    </div>
  );
}

// Subcomponente: painel de configurações de pagamento
function PaymentSettingsPanel() {
  const [isSaving, setIsSaving] = useState(false);

  const { data: settingsResult, refetch } = useQuery({
    queryKey: ["admin-payment-settings"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => getPaymentSettings({} as any),
    refetchOnWindowFocus: false,
  });

  const settings: PaymentSettings | null = settingsResult?.success
    ? settingsResult.data
    : null;

  const [form, setForm] = useState({
    mpPublicKey: "",
    mpAccessToken: "",
    mpSandbox: true,
    minInstallments: 1,
    maxInstallments: 12,
    freeInstallments: 3,
    enabledMethods: ["pix", "credit_card", "boleto"] as string[],
  });

  // Preenche form quando settings carregam
  const [initialized, setInitialized] = useState(false);
  useMemo(() => {
    if (settings && !initialized) {
      setForm({
        mpPublicKey: settings.mp_public_key || "",
        mpAccessToken: settings.mp_access_token || "",
        mpSandbox: settings.mp_sandbox,
        minInstallments: settings.min_installments,
        maxInstallments: settings.max_installments,
        freeInstallments: settings.free_installments,
        enabledMethods: settings.enabled_methods,
      });
      setInitialized(true);
    }
  }, [settings, initialized]);

  const toggleMethod = (method: string) => {
    setForm((f) => ({
      ...f,
      enabledMethods: f.enabledMethods.includes(method)
        ? f.enabledMethods.filter((m) => m !== method)
        : [...f.enabledMethods, method],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await savePaymentSettings(form as any);
    setIsSaving(false);
    if (result?.success) {
      toast.success("Configurações salvas");
      refetch();
    } else {
      toast.error(result?.error || "Erro ao salvar");
    }
  };

  const isConnected = !!(settings?.mp_public_key && settings?.mp_access_token);

  return (
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
          <span className={cn(
            "ml-auto inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded",
            isConnected ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          )}>
            {isConnected ? (
              <><CheckCircle className="h-3 w-3" /> Conectado</>
            ) : (
              <><AlertCircle className="h-3 w-3" /> Não configurado</>
            )}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Public Key</label>
            <input
              type="text"
              placeholder="APP_USR-xxxxx..."
              value={form.mpPublicKey}
              onChange={(e) => setForm({ ...form, mpPublicKey: e.target.value })}
              className="w-full px-4 py-2 border border-[#E9E1D2] text-sm font-mono focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Access Token</label>
            <input
              type="password"
              placeholder="APP_USR-xxxxx..."
              value={form.mpAccessToken}
              onChange={(e) => setForm({ ...form, mpAccessToken: e.target.value })}
              className="w-full px-4 py-2 border border-[#E9E1D2] text-sm font-mono focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!form.mpSandbox}
                onChange={() => setForm({ ...form, mpSandbox: false })}
                className="rounded border-[#E9E1D2]"
              />
              <span className="text-sm text-[#51635F]">Modo Produção</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={form.mpSandbox}
                onChange={() => setForm({ ...form, mpSandbox: true })}
                className="rounded border-[#E9E1D2]"
              />
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
          {(["credit_card", "pix", "boleto"] as const).map((method) => (
            <label
              key={method}
              className="flex items-center justify-between p-4 border border-[#E9E1D2] cursor-pointer hover:bg-[#F8F4EA] transition-colors"
            >
              <div className="flex items-center gap-3">
                {getMethodIcon(method)}
                <div>
                  <p className="font-medium text-[#0F3A3E]">{getMethodLabel(method)}</p>
                  <p className="text-xs text-[#8A938E]">{getMethodDesc(method)}</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.enabledMethods.includes(method)}
                onChange={() => toggleMethod(method)}
                className="rounded border-[#E9E1D2]"
              />
            </label>
          ))}
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
            <select
              value={form.maxInstallments}
              onChange={(e) => setForm({ ...form, maxInstallments: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            >
              {[3, 6, 10, 12].map((n) => (
                <option key={n} value={n}>{n}x sem juros</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#8A938E] mb-1">
              Parcelas sem Juros
            </label>
            <select
              value={form.freeInstallments}
              onChange={(e) => setForm({ ...form, freeInstallments: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            >
              {[1, 2, 3, 6].map((n) => (
                <option key={n} value={n}>{n}x sem juros</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}

function getMethodIcon(method: string) {
  switch (method) {
    case "credit_card": return <CreditCard className="h-5 w-5 text-[#B07B1E]" />;
    case "pix": return <QrCode className="h-5 w-5 text-[#B07B1E]" />;
    case "boleto": return <FileText className="h-5 w-5 text-[#B07B1E]" />;
    default: return null;
  }
}

function getMethodLabel(method: string) {
  switch (method) {
    case "credit_card": return "Cartão de Crédito";
    case "pix": return "Pix";
    case "boleto": return "Boleto Bancário";
    default: return method;
  }
}

function getMethodDesc(method: string) {
  switch (method) {
    case "credit_card": return "Visa, Mastercard, Elo, Amex, Hipercard";
    case "pix": return "Pagamento instantâneo";
    case "boleto": return "Vencimento em 3 dias úteis";
    default: return "";
  }
}

export default AdminPagamentos;