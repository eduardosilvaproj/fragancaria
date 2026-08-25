import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  Download,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  X,
  Copy,
  ShoppingBag,
  FileText,
  Printer,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllOrdersForAdmin,
  getStuckApprovedOrders,
  reconcileApprovedOrderForAdmin,
  updateOrderForAdmin,
} from "@/lib/orders-admin.functions";
import type { AdminOrderList, AdminOrderRow } from "@/lib/orders-admin.functions";
import { generateOrderLabel } from "@/lib/logistics.functions";
import { emitNFe, getDanfePdf, getNfePreview } from "@/lib/nfe.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({
  component: PedidosPage,
});

type Order = AdminOrderRow;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-50", icon: Clock },
  paid: { label: "Aprovado", color: "text-green-700", bg: "bg-green-50", icon: CheckCircle },
  processing: { label: "Processando", color: "text-blue-700", bg: "bg-blue-50", icon: Package },
  shipped: { label: "Enviado", color: "text-purple-700", bg: "bg-purple-50", icon: Truck },
  delivered: { label: "Entregue", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "text-red-700", bg: "bg-red-50", icon: XCircle },
  refunded: { label: "Reembolsado", color: "text-gray-700", bg: "bg-gray-50", icon: RefreshCw },
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão de Crédito",
  boleto: "Boleto",
};

const SNAPSHOT_FIELD_LABELS: Record<string, string> = {
  shipping_address: "endereço de entrega",
  customer_phone: "telefone",
  customer_cpf: "CPF",
  payment_id: "ID do pagamento",
};

function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stuckOrders, setStuckOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [generatingLabel, setGeneratingLabel] = useState(false);
  const [emittingNfe, setEmittingNfe] = useState(false);
  const [printingDanfe, setPrintingDanfe] = useState(false);

  // Estados para o Modal de Prévia Fiscal (Fase 2)
  const [nfeModalOpen, setNfeModalOpen] = useState(false);
  const [nfeTipoOp, setNfeTipoOp] = useState<"venda" | "devolucao">("venda");
  const [nfeLoadingPreview, setNfeLoadingPreview] = useState(false);
  const [nfePreviewData, setNfePreviewData] = useState<any>(null);
  const [nfeEditItems, setNfeEditItems] = useState<any[]>([]);
  const [nfeReducaoBase, setNfeReducaoBase] = useState<string>("");
  const [nfeIndicadorIe, setNfeIndicadorIe] = useState<number>(9);
  const [nfeConsumidorFinal, setNfeConsumidorFinal] = useState<number>(1);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliation, setReconciliation] = useState({
    phone: "",
    cpf: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    cep: "",
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [result, stuckResult] = await Promise.all([
        getAllOrdersForAdmin({ data: {} }) as Promise<
          | { success: true; data: AdminOrderList }
          | { success: false; error: string }
        >,
        getStuckApprovedOrders() as Promise<
          | { success: true; data: AdminOrderRow[] }
          | { success: false; error: string }
        >,
      ]);
      if (result.success) {
        setOrders(result.data.orders);
      } else {
        toast.error("Erro ao carregar pedidos: " + result.error);
        setOrders([]);
      }
      setStuckOrders(stuckResult.success ? stuckResult.data : []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
      setOrders([]);
      setStuckOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Atualizar status do pedido
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const result = await updateOrderForAdmin({
        data: { orderId, patch: { status: newStatus } },
      });
      if (!result.success) {
        toast.error("Erro ao atualizar status: " + result.error);
        return;
      }
      toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openReconciliation = (order: Order) => {
    const address = (order.shippingAddress || {}) as Record<string, string>;
    setReconciliation({
      phone: order.customerPhone || "",
      cpf: order.customerCpf || "",
      street: address.street || "",
      number: address.number || "",
      complement: address.complement || "",
      neighborhood: address.neighborhood || "",
      city: address.city || "",
      state: address.state || "",
      cep: address.cep || address.zipCode || "",
    });
    setReconciliationOpen(true);
  };

  const reconcileOrder = async () => {
    if (!selectedOrder) return;
    setReconciling(true);
    try {
      const result = await reconcileApprovedOrderForAdmin({
        data: {
          orderId: selectedOrder.id,
          patch: {
            customerPhone: reconciliation.phone,
            customerCpf: reconciliation.cpf,
            shippingAddress: {
              street: reconciliation.street,
              number: reconciliation.number,
              complement: reconciliation.complement,
              neighborhood: reconciliation.neighborhood,
              city: reconciliation.city,
              state: reconciliation.state,
              cep: reconciliation.cep,
              zipCode: reconciliation.cep,
            },
          },
        },
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Dados completos. Pedido marcado como pago.");
      setReconciliationOpen(false);
      setSelectedOrder(null);
      await fetchOrders();
    } catch {
      toast.error("Erro ao reconciliar pedido");
    } finally {
      setReconciling(false);
    }
  };

  // Filtrar pedidos
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.paymentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const revenueStatuses = ["approved", "paid", "processing", "shipped", "delivered"];
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    approved: orders.filter((o) => o.status === "approved" || o.status === "paid").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    revenue: orders
      .filter((o) => revenueStatuses.includes(o.status || ""))
      .reduce((sum, o) => sum + Number(o.total ?? 0), 0),
  };

  const formatPrice = (value: number | null | undefined) => {
    if (!value) return "R$ 0,00";
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const openLabelModal = (order: Order) => {
    setLabelOrder(order);
    setLabelModalOpen(true);
  };

  const handleGenerateLabel = async () => {
    if (!labelOrder) return;
    setGeneratingLabel(true);
    try {
      const result = await generateOrderLabel({
        data: {
          orderId: labelOrder.id,
        },
      });
      if (result.success && result.data) {
        if (result.data.tracking_code) {
          toast.success(`Etiqueta gerada! Código: ${result.data.tracking_code}`);
        } else {
          toast.success("Envio criado! Código de rastreio pendente. Imprima a etiqueta local.");
        }
        setLabelModalOpen(false);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error((!result.success && (result as any).error) || "Erro ao gerar etiqueta");
      }
    } catch (e) {
      toast.error("Erro ao gerar etiqueta");
    } finally {
      setGeneratingLabel(false);
    }
  };

  const openNfeModal = async (tipoOp: "venda" | "devolucao") => {
    if (!selectedOrder) return;
    setNfeTipoOp(tipoOp);
    setNfeModalOpen(true);
    setNfeLoadingPreview(true);
    setNfePreviewData(null);
    setNfeEditItems([]);
    setNfeReducaoBase("");
    try {
      const result = await getNfePreview({ data: { orderId: selectedOrder.id, tipoOperacao: tipoOp } });
      if (result.success && result.data) {
        setNfePreviewData(result.data);
        setNfeEditItems(result.data.items || []);
        if (result.data.indicadorIE !== undefined) setNfeIndicadorIe(result.data.indicadorIE);
        if (result.data.consumidorFinal !== undefined) setNfeConsumidorFinal(result.data.consumidorFinal);
        if (tipoOp === "devolucao") {
          toast.info("Prévia de devolução carregada.");
        }
      } else {
        setNfeModalOpen(false);
        toast.error(result.error || "Erro ao montar prévia da NF-e");
      }
    } catch (e) {
      setNfeModalOpen(false);
      toast.error("Erro ao montar prévia da NF-e");
    } finally {
      setNfeLoadingPreview(false);
    }
  };

  const confirmEmitNfe = async () => {
    if (!selectedOrder || !nfePreviewData) return;

    // Validações de formato e obrigatoriedade de IBS/CBS nos itens editados antes de transmitir
    for (let i = 0; i < nfeEditItems.length; i++) {
      const item = nfeEditItems[i];
      const itemName = item.descricao || `Item #${i + 1}`;

      // Valida CST IBS/CBS
      if (!item.cstIbscbs) {
        toast.error(`CST IBS/CBS é obrigatório para o item "${itemName}" (Vigente desde 03/08/2026).`, { duration: 6000 });
        return;
      }
      const cstClean = String(item.cstIbscbs).trim();
      if (!/^\d{3}$/.test(cstClean)) {
        toast.error(`CST IBS/CBS do item "${itemName}" deve ter exatamente 3 dígitos numéricos (ex: 000).`, { duration: 6000 });
        return;
      }

      // Valida Enquadramento / cClassTrib
      if (!item.cClassTrib) {
        toast.error(`Código de Enquadramento IBS/CBS é obrigatório para o item "${itemName}".`, { duration: 6000 });
        return;
      }
      const classClean = String(item.cClassTrib).trim();
      if (!/^\d{6}$/.test(classClean)) {
        toast.error(`Código de Enquadramento do item "${itemName}" deve ter exatamente 6 dígitos numéricos (ex: 000001).`, { duration: 6000 });
        return;
      }

      // Valida Alíquotas de IBS/CBS
      if (item.aliquotaIbsEstadual === undefined || item.aliquotaIbsEstadual === null || isNaN(Number(item.aliquotaIbsEstadual))) {
        toast.error(`Alíquota IBS Estadual é obrigatória para o item "${itemName}".`, { duration: 6000 });
        return;
      }
      if (item.aliquotaCbs === undefined || item.aliquotaCbs === null || isNaN(Number(item.aliquotaCbs))) {
        toast.error(`Alíquota CBS é obrigatória para o item "${itemName}".`, { duration: 6000 });
        return;
      }
    }

    setEmittingNfe(true);
    try {
      const result = await emitNFe({
        data: {
          orderId: selectedOrder.id,
          tipoOperacao: nfeTipoOp,
          itensEditados: nfeEditItems,
          reducaoBaseIcms: nfeReducaoBase ? Number(nfeReducaoBase) : undefined,
          indicadorIE: Number(nfeIndicadorIe),
          consumidorFinal: Number(nfeConsumidorFinal),
        },
      });
      if (result.success && result.data) {
        toast.success(`NF-e emitida! Chave: ${result.data.nfeKey.slice(0, 20)}...`, { duration: 8000 });
        setNfeModalOpen(false);
        fetchOrders();
      } else {
        toast.error(result.error || "Erro ao emitir NF-e");
      }
    } catch (e) {
      toast.error("Erro ao emitir NF-e");
    } finally {
      setEmittingNfe(false);
    }
  };

  const handlePrintDanfe = async (orderId: string) => {
    setPrintingDanfe(true);
    // Abre a aba antes do await para contornar bloqueador de popup
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.document.write("Carregando PDF da DANFE...");
    try {
      const result = await getDanfePdf({ data: { orderId } });
      if (result.success && result.data?.base64) {
        // Converte base64 para Uint8Array para criar o Blob binário correto
        const byteCharacters = atob(result.data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        if (popup) {
          popup.location.href = url;
        } else {
          // Fallback se bloqueado
          window.open(url, "_blank");
        }
      } else {
        if (popup) popup.close();
        toast.error(result.error || "Erro ao buscar DANFE");
      }
    } catch (error) {
      if (popup) popup.close();
      toast.error("Erro ao processar PDF");
    } finally {
      setPrintingDanfe(false);
    }
  };

  const resolveStatusConfig = (status?: string) =>
    STATUS_CONFIG[status || "pending"] || STATUS_CONFIG.pending;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Vendas
            </span>
          </div>
          <h1 className="text-2xl font-serif text-[#0F3A3E]">Pedidos</h1>
          <p className="text-sm text-[#51635F] mt-1">
            {stats.total} pedidos • {formatPrice(stats.revenue)} em vendas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F8F4EA] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Atualizar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F8F4EA] transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: "Total", value: stats.total, color: "bg-gray-100" },
          { label: "Pendentes", value: stats.pending, color: "bg-yellow-50" },
          { label: "Aprovados", value: stats.approved, color: "bg-green-50" },
          { label: "Processando", value: stats.processing, color: "bg-blue-50" },
          { label: "Enviados", value: stats.shipped, color: "bg-purple-50" },
          { label: "Entregues", value: stats.delivered, color: "bg-emerald-50" },
        ].map((stat) => (
          <div key={stat.label} className={cn("p-4 rounded-lg", stat.color)}>
            <div className="text-2xl font-serif text-[#0F3A3E]">{stat.value}</div>
            <div className="text-xs text-[#51635F] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {stuckOrders.length > 0 && (
        <section className="border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-900">
                {stuckOrders.length} pagamento{stuckOrders.length === 1 ? "" : "s"} confirmado{stuckOrders.length === 1 ? "" : "s"} aguardando dados
              </h2>
              <p className="mt-1 text-xs text-amber-800">
                Não envie para logística até completar os dados faltantes.
              </p>
              <ul className="mt-3 space-y-2">
                {stuckOrders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center gap-2 text-xs text-amber-900">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="font-mono font-semibold underline hover:no-underline"
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </button>
                    <span>{order.customerName || order.customerEmail || "Cliente"}</span>
                    <span className="text-amber-700">Faltando: {order.snapshotMissingFields.map((field) => SNAPSHOT_FIELD_LABELS[field] || field).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#51635F]" />
          <input
            type="text"
            placeholder="Buscar por ID, cliente ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E] bg-white min-w-[160px]"
          >
            <option value="all">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#51635F] pointer-events-none" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E9E1D2] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-[#B07B1E] animate-spin mx-auto mb-4" />
            <p className="text-[#51635F]">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-[#C4BBA8] mx-auto mb-4" />
            <p className="text-[#51635F]">
              {orders.length === 0
                ? "Nenhum pedido ainda. As vendas aparecerão aqui."
                : "Nenhum pedido encontrado com esses filtros."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F4EA] border-b border-[#E9E1D2]">
                <tr>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">
                    Pedido
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">
                    Data
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">
                    Pagamento
                  </th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E1D2]">
                {filteredOrders.map((order) => {
                  const statusConfig = resolveStatusConfig(order.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={order.id} className="hover:bg-[#F8F4EA]/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-mono text-sm text-[#0F3A3E]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        {order.paymentId && (
                          <div className="text-[10px] text-[#51635F] mt-0.5">
                            MP: {order.paymentId.slice(0, 12)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-[#0F3A3E]">
                          {order.customerName || "Cliente"}
                        </div>
                        <div className="text-xs text-[#51635F]">
                          {order.customerEmail || order.payerEmail || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-[#0F3A3E]">
                          {formatDate(order.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full",
                            statusConfig.bg,
                            statusConfig.color
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-[#0F3A3E]">
                          {PAYMENT_LABELS[order.paymentMethod || ""] || order.paymentMethod || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-serif text-[#0F3A3E]">
                          {formatPrice(order.total)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 hover:bg-[#E9E1D2] rounded transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4 text-[#51635F]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#E9E1D2] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-[#0F3A3E]">
                  Pedido #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-sm text-[#51635F]">
                  {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-[#F8F4EA] rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-[#F8F4EA] rounded-lg">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1">
                    Status Atual
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full",
                      resolveStatusConfig(selectedOrder.status).bg,
                      resolveStatusConfig(selectedOrder.status).color
                    )}
                  >
                    {(() => {
                      const Icon = resolveStatusConfig(selectedOrder.status).icon;
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {resolveStatusConfig(selectedOrder.status).label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedOrder.status === "approved" || selectedOrder.status === "paid" || selectedOrder.status === "pending") && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, "processing")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Package className="w-3 h-3" />
                      Enviar para Logística
                    </button>
                  )}
                  {selectedOrder.status === "processing" && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, "shipped")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      Marcar Enviado
                    </button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, "delivered")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Marcar Entregue
                    </button>
                  )}
                  {!["cancelled", "refunded", "delivered"].includes(selectedOrder.status || "") && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
                  {selectedOrder.status === "pending" &&
                    selectedOrder.paymentStatus === "approved" &&
                    (selectedOrder.snapshotMissingFields?.length ?? 0) > 0 && (
                      <button
                        onClick={() => openReconciliation(selectedOrder)}
                        className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-1.5"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Completar dados e marcar como pago
                      </button>
                    )}
                  {/* NF-e Badge & Button */}
                  {selectedOrder.nfeKey ? (
                    <span className="px-3 py-1.5 text-xs bg-blue-100 text-blue-800 rounded border border-blue-200 flex items-center gap-1.5">
                      <FileText className="w-3 h-3" />
                      NF-e {selectedOrder.nfeNumber ? `#${selectedOrder.nfeNumber}` : ""} — {selectedOrder.nfeStatus}
                    </span>
                  ) : !["cancelled", "refunded"].includes(selectedOrder.status || "") && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openNfeModal("venda")}
                        disabled={emittingNfe}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        Emitir NF-e (Venda)
                      </button>
                      <button
                        onClick={() => openNfeModal("devolucao")}
                        disabled={emittingNfe}
                        className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5 font-medium"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Emitir Devolução
                      </button>
                    </div>
                  )}

                  {selectedOrder.nfeKey && selectedOrder.nfeDanfeUrl && (
                    <button
                      onClick={() => handlePrintDanfe(selectedOrder.id)}
                      disabled={printingDanfe}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {printingDanfe ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Printer className="w-3 h-3" />
                      )}
                      Imprimir 2ª via DANFE
                    </button>
                  )}

                  {selectedOrder.trackingCode ? (
                    <a
                      href={`https://www.linkcorreto.com.br/sistemas/rastreamento/?objeto=${selectedOrder.trackingCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 text-xs bg-[#0F3A3E] text-white rounded hover:bg-[#1a5054] flex items-center gap-1.5"
                    >
                      <Truck className="w-3 h-3" />
                      Rastrear
                    </a>
                  ) : (
                    (selectedOrder.status === "approved" || selectedOrder.status === "paid") && (
                      <button
                        onClick={() => openLabelModal(selectedOrder)}
                        className="px-3 py-1.5 text-xs bg-[#B07B1E] text-white rounded hover:bg-[#8a5e10] flex items-center gap-1.5"
                      >
                        <Package className="w-3 h-3" />
                        Gerar Etiqueta
                      </button>
                    )
                  )}
                </div>
                {/* Dropdown de status do pedido */}
                <div className="mt-3 pt-3 border-t border-[#E9E1D2] flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#8A938E] font-semibold">
                    Status:
                  </span>
                  <select
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 text-xs border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] disabled:opacity-50 rounded"
                  >
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="processing">Em Separação</option>
                    <option value="shipped">Enviado</option>
                    <option value="delivered">Entregue</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3">
                  Cliente
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Nome</span>
                    <span className="text-sm text-[#0F3A3E]">
                      {selectedOrder.customerName || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Email</span>
                    <span className="text-sm text-[#0F3A3E]">
                      {selectedOrder.customerEmail || selectedOrder.payerEmail || "-"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3">
                  Pagamento
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Método</span>
                    <span className="text-sm text-[#0F3A3E]">
                      {PAYMENT_LABELS[selectedOrder.paymentMethod || ""] || selectedOrder.paymentMethod || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">ID do Pagamento</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#0F3A3E] font-mono">
                        {selectedOrder.paymentId || "-"}
                      </span>
                      {selectedOrder.paymentId && (
                        <button
                          onClick={() => copyToClipboard(selectedOrder.paymentId!)}
                          className="p-1 hover:bg-[#F8F4EA] rounded"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Info */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3">
                    Entrega
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.shippingMethod && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#51635F]">Método</span>
                        <span className="text-sm text-[#0F3A3E]">
                          {selectedOrder.shippingMethod}
                        </span>
                      </div>
                    )}
                    {selectedOrder.trackingCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#51635F]">Rastreio</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0F3A3E] font-mono">
                            {selectedOrder.trackingCode}
                          </span>
                          <button
                            onClick={() => copyToClipboard(selectedOrder.trackingCode!)}
                            className="p-1 hover:bg-[#F8F4EA] rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-[#0F3A3E] p-3 bg-[#F8F4EA] rounded">
                      {(() => {
                        const addr = selectedOrder.shippingAddress as Record<string, string>;
                        if (!addr) return "-";
                        return `${addr.street || ""}, ${addr.number || ""} ${addr.complement || ""} - ${addr.neighborhood || ""}, ${addr.city || ""}/${addr.state || ""} - CEP: ${addr.zipCode || addr.cep || ""}`;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3">
                    Itens do Pedido
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 bg-[#F8F4EA] rounded"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.title || item.name}
                            className="w-12 h-12 object-contain bg-white rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[#0F3A3E] truncate">
                            {item.title || item.name}
                          </div>
                          {item.variationName && (
                            <div className="text-xs text-[#B07B1E]">
                              Variação: {item.variationName}
                            </div>
                          )}
                          <div className="text-xs text-[#51635F]">
                            Qtd: {item.quantity} × {formatPrice(item.price)}
                          </div>
                        </div>
                        <div className="font-serif text-[#0F3A3E]">
                          {formatPrice((item.price || 0) * (item.quantity || 1))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-[#E9E1D2] pt-4 space-y-2">
                {selectedOrder.subtotal && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Subtotal</span>
                    <span className="text-sm text-[#0F3A3E]">
                      {formatPrice(selectedOrder.subtotal)}
                    </span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Desconto</span>
                    <span className="text-sm text-green-600">
                      -{formatPrice(selectedOrder.discount)}
                    </span>
                  </div>
                )}
                {selectedOrder.shippingPrice !== null && selectedOrder.shippingPrice !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Frete</span>
                    <span className="text-sm text-[#0F3A3E]">
                      {selectedOrder.shippingPrice === 0
                        ? "Grátis"
                        : formatPrice(selectedOrder.shippingPrice)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[#E9E1D2]">
                  <span className="font-semibold text-[#0F3A3E]">Total</span>
                  <span className="font-serif text-xl text-[#0F3A3E]">
                    {formatPrice(selectedOrder.total)}
                  </span>
                </div>
              </div>
            </div>

            {reconciliationOpen &&
              selectedOrder.status === "pending" &&
              selectedOrder.paymentStatus === "approved" && (
                <div className="border border-amber-300 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-900 mb-3">
                    Completar dados para liberar o pedido
                  </h3>
                  <p className="text-xs text-amber-800 mb-4">
                    Faltando: {selectedOrder.snapshotMissingFields.map((field) => SNAPSHOT_FIELD_LABELS[field] || field).join(", ")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={reconciliation.phone}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Telefone"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                    <input
                      value={reconciliation.cpf}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, cpf: e.target.value }))}
                      placeholder="CPF"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                    <input
                      value={reconciliation.street}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, street: e.target.value }))}
                      placeholder="Rua"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E] md:col-span-2"
                    />
                    <input
                      value={reconciliation.number}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, number: e.target.value }))}
                      placeholder="Número"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                    <input
                      value={reconciliation.complement}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, complement: e.target.value }))}
                      placeholder="Complemento"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                    <input
                      value={reconciliation.neighborhood}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, neighborhood: e.target.value }))}
                      placeholder="Bairro"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                    <input
                      value={reconciliation.city}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="Cidade"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                    <input
                      value={reconciliation.state}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="UF"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                    <input
                      value={reconciliation.cep}
                      onChange={(e) => setReconciliation((prev) => ({ ...prev, cep: e.target.value }))}
                      placeholder="CEP"
                      className="px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                    />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setReconciliationOpen(false)}
                      className="px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F8F4EA] transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={reconcileOrder}
                      disabled={reconciling}
                      className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {reconciling ? "Salvando..." : "Salvar e marcar como pago"}
                    </button>
                  </div>
                </div>
              )}

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-[#E9E1D2] px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F8F4EA] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {nfeModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl flex flex-col">
            <div className="px-6 py-4 border-b border-[#E9E1D2] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl text-[#0F3A3E]">Prévia da NF-e</h3>
                <p className="text-xs text-[#51635F]">
                  {nfeTipoOp === "devolucao" ? "Devolução" : "Venda"} para o pedido #{selectedOrder.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button onClick={() => setNfeModalOpen(false)} className="p-1 hover:bg-[#F8F4EA] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {nfeLoadingPreview ? (
                <div className="text-sm text-[#51635F]">Montando prévia fiscal...</div>
              ) : nfePreviewData ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="border border-[#E9E1D2] p-3 rounded">
                      <div className="text-[10px] uppercase text-[#8A938E] mb-1">Destino</div>
                      <div className="text-[#0F3A3E] font-medium">{nfePreviewData.destName}</div>
                      <div className="text-[#51635F]">{nfePreviewData.isCNPJ ? "CNPJ" : "CPF"}</div>
                    </div>
                    <div className="border border-[#E9E1D2] p-3 rounded">
                      <div className="text-[10px] uppercase text-[#8A938E] mb-1">CFOP / UF</div>
                      <div className="text-[#0F3A3E] font-medium">{nfePreviewData.destUf} x {nfePreviewData.emitUf}</div>
                      <div className="text-[#51635F]">{nfeTipoOp}</div>
                    </div>
                    <div className="border border-[#E9E1D2] p-3 rounded">
                      <div className="text-[10px] uppercase text-[#8A938E] mb-1">Frete</div>
                      <div className="text-[#0F3A3E] font-medium">{nfePreviewData.shippingPrice?.toFixed(2)}</div>
                      <div className="text-[#51635F]">Desconto {nfePreviewData.discount?.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nfePreviewData.isCNPJ && (
                      <div className="border border-[#E9E1D2] rounded p-4 bg-[#F8F4EA]">
                        <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1.5">
                          Redução de base do ICMS (%)
                        </label>
                        <input
                          value={nfeReducaoBase}
                          onChange={(e) => setNfeReducaoBase(e.target.value)}
                          type="number"
                          step="0.01"
                          className="w-full max-w-xs px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
                          placeholder="0.00"
                        />
                        <p className="mt-2 text-xs text-[#51635F]">
                          TODO: este valor ainda não é enviado para a notaas.
                        </p>
                      </div>
                    )}

                    <div className="border border-[#E9E1D2] rounded p-4 bg-[#F8F4EA] space-y-3 md:col-span-2">
                      <div className="text-xs font-semibold text-[#0F3A3E] uppercase tracking-wider">Parâmetros de Cabeçalho (Editáveis)</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1">
                            Indicador IE (destinatário)
                          </label>
                          <select
                            value={nfeIndicadorIe}
                            onChange={(e) => setNfeIndicadorIe(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
                          >
                            <option value={1}>1 - Contribuinte ICMS</option>
                            <option value={2}>2 - Contribuinte Isento</option>
                            <option value={9}>9 - Não Contribuinte</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1">
                            Consumidor Final
                          </label>
                          <select
                            value={nfeConsumidorFinal}
                            onChange={(e) => setNfeConsumidorFinal(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
                          >
                            <option value={0}>0 - Não (Revenda / Produção)</option>
                            <option value={1}>1 - Sim (Consumidor Final)</option>
                          </select>
                        </div>
                      </div>
                      <p className="text-[11px] text-[#51635F]">
                        Nota: CNPJ assume revenda por padrão (consumidorFinal = 0, indicadorIE = 1). Caso seja compra para uso/consumo interno, ajuste acima.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {nfeEditItems.map((item, idx) => {
                      // Determinar CFOP resolvido pelo cenário
                      const cfopResolvido = item.cfop_resolvido || "";
                      // Verificar se o CFOP veio do cadastro do produto (definido via cenário)
                      const cfopDoCadastro = item.cfop_origem === "cadastro";
                      // Flag de alteração manual
                      const cfopAlteradoManualmente = item.cfop_origem === "manual";

                      return (
                        <div key={item.id || idx} className="border border-[#E9E1D2] rounded p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Descrição</label>
                            <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.descricao || ""} onChange={(e) => {
                              const next = [...nfeEditItems];
                              next[idx] = { ...next[idx], descricao: e.target.value };
                              setNfeEditItems(next);
                            }} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">CFOP</label>
                            {/* Mostrar CFOP resolvido se vier do cadastro e não foi alterado */}
                            {cfopDoCadastro && !cfopAlteradoManualmente && (
                              <span className="w-full px-3 py-2 border border-[#E9E1D2] text-sm text-[#51635F] bg-[#F7F9FA] readonly>
                                {cfopResolvido || ""}
                              </span>
                            )}
                            {/* Campo editável se não vier do cadastro ou foi alterado */}
                            {!cfopDoCadastro || cfopAlteradoManualmente ? (
                              <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.cfop || ""} onChange={(e) => {
                                const next = [...nfeEditItems];
                                next[idx] = { ...next[idx], cfop: e.target.value, cfop_origem: "manual" };
                                setNfeEditItems(next);
                              }} />
                            ) : null}
                            {/* Indicador visual de CFOP não resolvido */}
                            {!cfopResolvido && !cfopAlteradoManualmente && (
                              <span className="text-xs text-red-600 block mt-1">CFOP não resolvido — operação × tipo destinatário × UF</span>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">NCM</label>
                            <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.ncm || ""} onChange={(e) => {
                              const next = [...nfeEditItems];
                              next[idx] = { ...next[idx], ncm: e.target.value };
                              setNfeEditItems(next);
                            }} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Qtd</label>
                            <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="1" value={item.quantidade || 1} onChange={(e) => {
                              const next = [...nfeEditItems];
                              next[idx] = { ...next[idx], quantidade: Number(e.target.value) };
                              setNfeEditItems(next);
                            }} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Valor unitário</label>
                            <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="0.01" value={item.valorUnitario || 0} onChange={(e) => {
                              const next = [...nfeEditItems];
                              next[idx] = { ...next[idx], valorUnitario: Number(e.target.value) };
                              setNfeEditItems(next);
                            }} />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Unidade</label>
                            <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.unidade || ""} onChange={(e) => {
                              const next = [...nfeEditItems];
                              next[idx] = { ...next[idx], unidade: e.target.value };
                              setNfeEditItems(next);
                            }} />
                          </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">CST/CSOSN</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.cst || ""} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], cst: e.target.value };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Origem</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="1" value={item.origem ?? 0} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], origem: Number(e.target.value) };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Aliq. ICMS</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="0.01" value={item.aliquotaIcms ?? 0} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], aliquotaIcms: Number(e.target.value) };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Aliq. PIS</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="0.01" value={item.aliquotaPis ?? 0} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], aliquotaPis: Number(e.target.value) };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Aliq. COFINS</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="0.01" value={item.aliquotaCofins ?? 0} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], aliquotaCofins: Number(e.target.value) };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#B07B1E] mb-1">CST IBS/CBS</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.cstIbscbs || ""} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], cstIbscbs: e.target.value };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#B07B1E] mb-1">Enquadramento</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.cClassTrib || ""} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], cClassTrib: e.target.value };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#B07B1E] mb-1">Aliq. IBS Est.</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="0.01" value={item.aliquotaIbsEstadual ?? 0} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], aliquotaIbsEstadual: Number(e.target.value) };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#B07B1E] mb-1">Aliq. IBS Mun.</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="0.01" value={item.aliquotaIbsMunicipal ?? 0} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], aliquotaIbsMunicipal: Number(e.target.value) };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#B07B1E] mb-1">Aliq. CBS</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" type="number" step="0.01" value={item.aliquotaCbs ?? 0} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], aliquotaCbs: Number(e.target.value) };
                            setNfeEditItems(next);
                          }} />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#B07B1E] mb-1">Cód. Benefício</label>
                          <input className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" value={item.codigoBeneficioFiscal || ""} onChange={(e) => {
                            const next = [...nfeEditItems];
                            next[idx] = { ...next[idx], codigoBeneficioFiscal: e.target.value };
                            setNfeEditItems(next);
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <div className="px-6 py-4 border-t border-[#E9E1D2] flex items-center justify-end gap-3 bg-[#FAF8F4]">
              <button
                onClick={() => setNfeModalOpen(false)}
                className="px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F8F4EA] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmEmitNfe}
                disabled={emittingNfe || nfeLoadingPreview || !nfePreviewData}
                className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {emittingNfe && <RefreshCw className="w-3 h-3 animate-spin" />}
                Confirmar e emitir
              </button>
            </div>
          </div>
        </div>
      )}

    {/* Etiqueta Modal */}
      {labelModalOpen && labelOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg">
            <div className="px-6 py-4 border-b border-[#E9E1D2] flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#0F3A3E]">Gerar Etiqueta</h3>
              <button onClick={() => setLabelModalOpen(false)} className="p-1 hover:bg-[#F8F4EA] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#51635F]">
                Pedido <strong>#{labelOrder.id.slice(0, 8).toUpperCase()}</strong> —{" "}
                {labelOrder.customerName || "Cliente"}
              </p>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1.5">
                  Serviço vinculado ao pedido
                </label>
                <div className="rounded border border-[#E9E1D2] bg-[#F8F4EA] px-3 py-2 text-sm text-[#0F3A3E]">
                  {labelOrder.shippingServiceName ||
                    (labelOrder.shippingServiceId != null
                      ? `Serviço #${labelOrder.shippingServiceId}`
                      : "Pedido sem serviço de frete vinculado")}
                </div>
                {labelOrder.shippingServiceId == null && (
                  <p className="mt-2 text-xs text-red-700">
                    Este pedido não tem serviço de frete gravado. Não é possível gerar etiqueta automática.
                  </p>
                )}
              </div>
              <div className="rounded border border-[#E9E1D2] bg-[#F8F4EA] px-3 py-3 text-sm text-[#51635F]">
                Peso e dimensões serão recalculados a partir dos produtos do pedido, usando os mesmos dados canônicos da cotação de frete.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E9E1D2] flex justify-end gap-3">
              <button
                onClick={() => setLabelModalOpen(false)}
                className="px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F8F4EA] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateLabel}
                disabled={generatingLabel || labelOrder.shippingServiceId == null}
                className="px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#1a5054] disabled:opacity-50 flex items-center gap-2"
              >
                {generatingLabel && <RefreshCw className="w-4 h-4 animate-spin" />}
                Gerar Etiqueta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PedidosPage;