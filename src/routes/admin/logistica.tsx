import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Truck,
  Search,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Printer,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/logistica")({
  component: AdminLogistica,
});

// Mock data
const MOCK_SHIPMENTS = [
  {
    id: "1",
    order_number: 1001,
    customer_name: "Maria Silva",
    tracking_code: "BR123456789BR",
    carrier: "Correios",
    service: "SEDEX",
    status: "in_transit",
    shipped_at: "2024-01-14T10:00:00",
    estimated_delivery: "2024-01-17",
    destination: {
      city: "São Paulo",
      state: "SP",
    },
    last_event: "Objeto em trânsito - por favor aguarde",
    last_event_date: "2024-01-15T14:30:00",
  },
  {
    id: "2",
    order_number: 1002,
    customer_name: "João Santos",
    tracking_code: "BR987654321BR",
    carrier: "Correios",
    service: "PAC",
    status: "delivered",
    shipped_at: "2024-01-10T09:00:00",
    estimated_delivery: "2024-01-15",
    destination: {
      city: "Rio de Janeiro",
      state: "RJ",
    },
    last_event: "Objeto entregue ao destinatário",
    last_event_date: "2024-01-14T16:45:00",
  },
  {
    id: "3",
    order_number: 1003,
    customer_name: "Ana Oliveira",
    tracking_code: null,
    carrier: null,
    service: null,
    status: "pending",
    shipped_at: null,
    estimated_delivery: null,
    destination: {
      city: "Belo Horizonte",
      state: "MG",
    },
    last_event: "Aguardando postagem",
    last_event_date: null,
  },
  {
    id: "4",
    order_number: 1004,
    customer_name: "Carlos Mendes",
    tracking_code: "JD123456789",
    carrier: "Jadlog",
    service: ".Package",
    status: "out_for_delivery",
    shipped_at: "2024-01-13T11:00:00",
    estimated_delivery: "2024-01-15",
    destination: {
      city: "Curitiba",
      state: "PR",
    },
    last_event: "Mercadoria saiu para entrega ao destinatário",
    last_event_date: "2024-01-15T08:00:00",
  },
  {
    id: "5",
    order_number: 1005,
    customer_name: "Fernanda Costa",
    tracking_code: "BR111222333BR",
    carrier: "Correios",
    service: "SEDEX",
    status: "exception",
    shipped_at: "2024-01-12T14:00:00",
    estimated_delivery: "2024-01-14",
    destination: {
      city: "Salvador",
      state: "BA",
    },
    last_event: "Objeto não entregue - endereço insuficiente",
    last_event_date: "2024-01-14T15:20:00",
  },
];

function AdminLogistica() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredShipments = MOCK_SHIPMENTS.filter((shipment) => {
    const matchesSearch =
      shipment.order_number.toString().includes(searchQuery) ||
      shipment.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shipment.tracking_code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    const matchesStatus =
      selectedStatus === "all" || shipment.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: "Aguardando", color: "bg-amber-100 text-amber-700", icon: Clock },
      in_transit: { label: "Em Trânsito", color: "bg-blue-100 text-blue-700", icon: Truck },
      out_for_delivery: { label: "Saiu p/ Entrega", color: "bg-indigo-100 text-indigo-700", icon: MapPin },
      delivered: { label: "Entregue", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      exception: { label: "Ocorrência", color: "bg-red-100 text-red-700", icon: AlertCircle },
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stats = {
    pending: MOCK_SHIPMENTS.filter((s) => s.status === "pending").length,
    inTransit: MOCK_SHIPMENTS.filter((s) => s.status === "in_transit").length,
    delivered: MOCK_SHIPMENTS.filter((s) => s.status === "delivered").length,
    exceptions: MOCK_SHIPMENTS.filter((s) => s.status === "exception").length,
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Truck className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Envios
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Logística</h1>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors">
            <RefreshCw className="h-4 w-4" />
            Atualizar Rastreios
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors">
            <Printer className="h-4 w-4" />
            Imprimir Etiquetas
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Aguardando Envio
          </p>
          <p className="font-serif text-2xl text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Em Trânsito
          </p>
          <p className="font-serif text-2xl text-blue-600">{stats.inTransit}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Entregues (mês)
          </p>
          <p className="font-serif text-2xl text-emerald-600">{stats.delivered}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ocorrências
          </p>
          <p className="font-serif text-2xl text-red-600">{stats.exceptions}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar por pedido, cliente ou código de rastreio..."
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
            <option value="pending">Aguardando envio</option>
            <option value="in_transit">Em trânsito</option>
            <option value="out_for_delivery">Saiu para entrega</option>
            <option value="delivered">Entregue</option>
            <option value="exception">Ocorrência</option>
          </select>
        </div>
      </div>

      {/* Shipments List */}
      <div className="space-y-4">
        {filteredShipments.map((shipment) => (
          <div
            key={shipment.id}
            className={cn(
              "bg-white border border-[#E9E1D2] p-6",
              shipment.status === "exception" && "border-l-4 border-l-red-500"
            )}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              {/* Left: Order Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Package className="h-5 w-5 text-[#B07B1E]" />
                  <span className="font-medium text-[#0F3A3E]">
                    Pedido #{shipment.order_number}
                  </span>
                  {getStatusBadge(shipment.status)}
                </div>

                <p className="text-sm text-[#51635F] mb-2">
                  {shipment.customer_name}
                </p>

                <div className="flex items-center gap-2 text-sm text-[#8A938E]">
                  <MapPin className="h-4 w-4" />
                  {shipment.destination.city}, {shipment.destination.state}
                </div>
              </div>

              {/* Middle: Tracking Info */}
              <div className="flex-1">
                {shipment.tracking_code ? (
                  <>
                    <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                      Código de Rastreio
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <code className="font-mono text-sm bg-[#F8F4EA] px-2 py-1">
                        {shipment.tracking_code}
                      </code>
                      <a
                        href={`https://www.linkcorreto.com.br/sistemas/rastreamento/?objeto=${shipment.tracking_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B07B1E] hover:text-[#8A5A0E]"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="text-sm">
                      <span className="text-[#8A938E]">{shipment.carrier}</span>
                      <span className="mx-2">•</span>
                      <span className="text-[#51635F]">{shipment.service}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-amber-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Aguardando postagem
                  </div>
                )}
              </div>

              {/* Right: Last Event */}
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                  Último Evento
                </p>
                <p className="text-sm text-[#0F3A3E] mb-1">{shipment.last_event}</p>
                {shipment.last_event_date && (
                  <p className="text-xs text-[#8A938E]">
                    {formatDateTime(shipment.last_event_date)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {shipment.status === "pending" && (
                  <button className="px-4 py-2 text-xs bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors">
                    Gerar Etiqueta
                  </button>
                )}
                {shipment.status === "exception" && (
                  <button className="px-4 py-2 text-xs bg-red-500 text-white hover:bg-red-600 transition-colors">
                    Resolver
                  </button>
                )}
                <button className="px-4 py-2 text-xs border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors">
                  Ver Detalhes
                </button>
              </div>
            </div>

            {/* Timeline - for orders with tracking */}
            {shipment.tracking_code && (
              <div className="mt-4 pt-4 border-t border-[#E9E1D2]">
                <div className="flex items-center justify-between text-xs text-[#8A938E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Postado: {formatDate(shipment.shipped_at)}
                  </div>
                  <div className="flex-1 mx-4 h-[2px] bg-[#E9E1D2]">
                    <div
                      className={cn(
                        "h-full bg-[#B07B1E]",
                        shipment.status === "delivered" ? "w-full" :
                        shipment.status === "out_for_delivery" ? "w-3/4" :
                        shipment.status === "in_transit" ? "w-1/2" :
                        "w-1/4"
                      )}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      shipment.status === "delivered" ? "bg-emerald-500" : "bg-[#E9E1D2]"
                    )}></span>
                    Previsão: {formatDate(shipment.estimated_delivery)}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredShipments.length === 0 && (
        <div className="bg-white border border-[#E9E1D2] p-12 text-center">
          <Package className="h-12 w-12 text-[#E9E1D2] mx-auto mb-4" />
          <p className="text-[#51635F]">Nenhum envio encontrado</p>
        </div>
      )}
    </div>
  );
}

export default AdminLogistica;
