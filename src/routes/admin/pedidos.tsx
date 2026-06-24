import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Truck,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  Printer,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/pedidos")({
  component: AdminPedidos,
});

// Mock data
const MOCK_ORDERS = [
  {
    id: "1",
    order_number: 1001,
    customer_name: "Maria Silva",
    customer_email: "maria@email.com",
    status: "processing",
    payment_status: "paid",
    fulfillment_status: "unfulfilled",
    total: 459.80,
    items_count: 3,
    created_at: "2024-01-15T14:30:00",
    payment_method: "credit_card",
  },
  {
    id: "2",
    order_number: 1002,
    customer_name: "João Santos",
    customer_email: "joao@email.com",
    status: "shipped",
    payment_status: "paid",
    fulfillment_status: "fulfilled",
    total: 289.90,
    items_count: 1,
    created_at: "2024-01-15T10:15:00",
    payment_method: "pix",
    tracking_code: "BR123456789",
  },
  {
    id: "3",
    order_number: 1003,
    customer_name: "Ana Oliveira",
    customer_email: "ana@email.com",
    status: "pending",
    payment_status: "pending",
    fulfillment_status: "unfulfilled",
    total: 199.90,
    items_count: 2,
    created_at: "2024-01-15T09:00:00",
    payment_method: "boleto",
  },
  {
    id: "4",
    order_number: 1004,
    customer_name: "Carlos Mendes",
    customer_email: "carlos@email.com",
    status: "delivered",
    payment_status: "paid",
    fulfillment_status: "fulfilled",
    total: 749.70,
    items_count: 5,
    created_at: "2024-01-14T16:45:00",
    payment_method: "credit_card",
    tracking_code: "BR987654321",
  },
  {
    id: "5",
    order_number: 1005,
    customer_name: "Fernanda Costa",
    customer_email: "fernanda@email.com",
    status: "cancelled",
    payment_status: "refunded",
    fulfillment_status: "unfulfilled",
    total: 159.90,
    items_count: 1,
    created_at: "2024-01-14T11:20:00",
    payment_method: "pix",
  },
];

function AdminPedidos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredOrders = MOCK_ORDERS.filter((order) => {
    const matchesSearch =
      order.order_number.toString().includes(searchQuery) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: Clock },
      payment_pending: { label: "Aguardando Pagamento", color: "bg-yellow-100 text-yellow-700", icon: AlertCircle },
      processing: { label: "Processando", color: "bg-blue-100 text-blue-700", icon: Package },
      shipped: { label: "Enviado", color: "bg-indigo-100 text-indigo-700", icon: Truck },
      delivered: { label: "Entregue", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      cancelled: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
      refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-700", icon: RefreshCw },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      pending: { label: "Pendente", color: "text-amber-600" },
      processing: { label: "Processando", color: "text-blue-600" },
      paid: { label: "Pago", color: "text-emerald-600" },
      failed: { label: "Falhou", color: "text-red-600" },
      refunded: { label: "Reembolsado", color: "text-gray-600" },
    };

    const { label, color } = config[status] || config.pending;
    return <span className={cn("text-xs font-medium", color)}>{label}</span>;
  };

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

  const stats = {
    total: MOCK_ORDERS.length,
    pending: MOCK_ORDERS.filter((o) => o.status === "pending" || o.status === "payment_pending").length,
    processing: MOCK_ORDERS.filter((o) => o.status === "processing").length,
    shipped: MOCK_ORDERS.filter((o) => o.status === "shipped").length,
    revenue: MOCK_ORDERS.filter((o) => o.payment_status === "paid").reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Vendas
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Pedidos</h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total Pedidos
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pendentes
          </p>
          <p className="font-serif text-2xl text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Processando
          </p>
          <p className="font-serif text-2xl text-blue-600">{stats.processing}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Enviados
          </p>
          <p className="font-serif text-2xl text-indigo-600">{stats.shipped}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4 md:col-span-1 col-span-2">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Receita
          </p>
          <p className="font-serif text-2xl text-emerald-600">
            {formatPrice(stats.revenue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar por número, cliente ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="processing">Processando</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregue</option>
            <option value="cancelled">Cancelado</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border text-sm transition-colors",
              showFilters
                ? "border-[#B07B1E] text-[#B07B1E]"
                : "border-[#E9E1D2] hover:border-[#B07B1E]"
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[#E9E1D2] grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Data inicial</label>
              <input type="date" className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" />
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Data final</label>
              <input type="date" className="w-full px-3 py-2 border border-[#E9E1D2] text-sm" />
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Pagamento</label>
              <select className="w-full px-3 py-2 border border-[#E9E1D2] text-sm">
                <option>Todos</option>
                <option>Pix</option>
                <option>Cartão</option>
                <option>Boleto</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Valor mín.</label>
              <input
                type="number"
                placeholder="R$ 0"
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E9E1D2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Pedido
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Cliente
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Status
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Pagamento
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Total
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Data
                </th>
                <th className="p-4 text-center text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#E9E1D2] hover:bg-[#F8F4EA]/50 transition-colors"
                >
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">
                        #{order.order_number}
                      </p>
                      <p className="text-xs text-[#8A938E]">
                        {order.items_count} {order.items_count === 1 ? "item" : "itens"}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-[#0F3A3E]">{order.customer_name}</p>
                      <p className="text-xs text-[#8A938E]">{order.customer_email}</p>
                    </div>
                  </td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4">
                    <div>
                      {getPaymentBadge(order.payment_status)}
                      <p className="text-xs text-[#8A938E] capitalize">
                        {order.payment_method === "credit_card" ? "Cartão" : order.payment_method}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-serif text-[#0F3A3E]">
                      {formatPrice(order.total)}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-[#51635F]">
                      {formatDate(order.created_at)}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        to="/admin/pedidos/$id"
                        params={{ id: order.id }}
                        className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
                      >
                        <Eye className="h-4 w-4 text-[#51635F]" />
                      </Link>
                      <button className="p-2 hover:bg-[#F3EEE3] rounded transition-colors">
                        <Printer className="h-4 w-4 text-[#51635F]" />
                      </button>
                      {order.status === "processing" && (
                        <button className="p-2 hover:bg-[#F3EEE3] rounded transition-colors">
                          <Truck className="h-4 w-4 text-[#B07B1E]" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#E9E1D2] flex items-center justify-between">
          <p className="text-sm text-[#51635F]">
            Mostrando {filteredOrders.length} de {MOCK_ORDERS.length} pedidos
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] disabled:opacity-50">
              Anterior
            </button>
            <button className="px-3 py-1 bg-[#0F3A3E] text-white text-sm">1</button>
            <button className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3]">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPedidos;
