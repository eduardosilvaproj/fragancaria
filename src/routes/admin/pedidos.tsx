import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Search,
  Filter,
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pedidos")({
  component: PedidosPage,
});

type Order = Tables<"orders">;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-50", icon: Clock },
  approved: { label: "Aprovado", color: "text-green-700", bg: "bg-green-50", icon: CheckCircle },
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

function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Buscar pedidos do Supabase
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Inscrever para atualizações em tempo real
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new as Order, ...prev]);
            toast.success("Novo pedido recebido!");
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((o) => (o.id === payload.new.id ? (payload.new as Order) : o))
            );
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Atualizar status do pedido
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (error) throw error;
      toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);

      // Atualizar o pedido selecionado se estiver aberto
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

  // Filtrar pedidos
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.payment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Estatísticas
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    approved: orders.filter((o) => o.status === "approved").length,
    processing: orders.filter((o) => o.status === "processing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    revenue: orders
      .filter((o) => ["approved", "processing", "shipped", "delivered"].includes(o.status))
      .reduce((sum, o) => sum + (o.total || o.amount || 0), 0),
  };

  const formatPrice = (value: number | null) => {
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
                  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={order.id} className="hover:bg-[#F8F4EA]/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-mono text-sm text-[#0F3A3E]">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </div>
                        {order.payment_id && (
                          <div className="text-[10px] text-[#51635F] mt-0.5">
                            MP: {order.payment_id.slice(0, 12)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-[#0F3A3E]">
                          {order.customer_name || "Cliente"}
                        </div>
                        <div className="text-xs text-[#51635F]">
                          {order.customer_email || order.payer_email || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-[#0F3A3E]">
                          {formatDate(order.created_at)}
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
                          {PAYMENT_LABELS[order.payment_method || ""] || order.payment_method || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-serif text-[#0F3A3E]">
                          {formatPrice(order.total || order.amount)}
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
                  {formatDate(selectedOrder.created_at)}
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
                      STATUS_CONFIG[selectedOrder.status]?.bg || "bg-gray-100",
                      STATUS_CONFIG[selectedOrder.status]?.color || "text-gray-700"
                    )}
                  >
                    {(() => {
                      const Icon = STATUS_CONFIG[selectedOrder.status]?.icon || Clock;
                      return <Icon className="w-4 h-4" />;
                    })()}
                    {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.status === "approved" && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, "processing")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Processar
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
                  {!["cancelled", "refunded", "delivered"].includes(selectedOrder.status) && (
                    <button
                      onClick={() => updateOrderStatus(selectedOrder.id, "cancelled")}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  )}
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
                      {selectedOrder.customer_name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Email</span>
                    <span className="text-sm text-[#0F3A3E]">
                      {selectedOrder.customer_email || selectedOrder.payer_email || "-"}
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
                      {PAYMENT_LABELS[selectedOrder.payment_method || ""] || selectedOrder.payment_method || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">ID do Pagamento</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#0F3A3E] font-mono">
                        {selectedOrder.payment_id || "-"}
                      </span>
                      {selectedOrder.payment_id && (
                        <button
                          onClick={() => copyToClipboard(selectedOrder.payment_id)}
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
              {selectedOrder.shipping_address && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3">
                    Entrega
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#51635F]">Método</span>
                      <span className="text-sm text-[#0F3A3E]">
                        {selectedOrder.shipping_method || "-"}
                      </span>
                    </div>
                    {selectedOrder.tracking_code && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#51635F]">Rastreio</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0F3A3E] font-mono">
                            {selectedOrder.tracking_code}
                          </span>
                          <button
                            onClick={() => copyToClipboard(selectedOrder.tracking_code!)}
                            className="p-1 hover:bg-[#F8F4EA] rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="text-sm text-[#0F3A3E] p-3 bg-[#F8F4EA] rounded">
                      {(() => {
                        const addr = selectedOrder.shipping_address as any;
                        if (!addr) return "-";
                        return `${addr.street || ""}, ${addr.number || ""} ${addr.complement || ""} - ${addr.neighborhood || ""}, ${addr.city || ""}/${addr.state || ""} - CEP: ${addr.zipCode || addr.cep || ""}`;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              {selectedOrder.items && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3">
                    Itens do Pedido
                  </h3>
                  <div className="space-y-3">
                    {(selectedOrder.items as any[]).map((item: any, index: number) => (
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
                {selectedOrder.discount && selectedOrder.discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Desconto</span>
                    <span className="text-sm text-green-600">
                      -{formatPrice(selectedOrder.discount)}
                    </span>
                  </div>
                )}
                {selectedOrder.shipping_price !== null && selectedOrder.shipping_price !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#51635F]">Frete</span>
                    <span className="text-sm text-[#0F3A3E]">
                      {selectedOrder.shipping_price === 0
                        ? "Grátis"
                        : formatPrice(selectedOrder.shipping_price)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[#E9E1D2]">
                  <span className="font-semibold text-[#0F3A3E]">Total</span>
                  <span className="font-serif text-xl text-[#0F3A3E]">
                    {formatPrice(selectedOrder.total || selectedOrder.amount)}
                  </span>
                </div>
              </div>
            </div>

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
    </div>
  );
}

export default PedidosPage;
