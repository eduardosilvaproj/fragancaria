import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { LocalLabelModal } from "@/components/admin/LocalLabelModal";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Loader2,
  X,
  Tag,
  Plus,
  Settings,
  FileText,
  Save,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listShipments,
  getShipmentStats,
  createShipment,
  refreshTracking,
  updateShipmentStatus,
  getShipmentLabel,
  getShipmentDeclaration,
  startPicking,
  finishPicking,
  buildTrackingUrl,
  type Shipment,
  type ShipmentStats,
} from "@/lib/logistics.functions";
import {
  saveSigepCredentials,
  requestSigepLabels,
  getSigepInfo,
  listSigepLabels,
  type SigepCredentials,
} from "@/lib/logistics.functions";

export const Route = createFileRoute("/admin/logistica")({
  component: AdminLogistica,
});

function AdminLogistica() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"envios" | "etiquetas">("envios");
  const [showSigepModal, setShowSigepModal] = useState(false);

  const queryClient = useQueryClient();

  // =====================================================
  // QUERIES
  // =====================================================

  // Lista de remessas unificada (baseada em pedidos)
  const listFn = useServerFn(listShipments);
  const shipmentsQuery = useQuery({
    queryKey: ["admin-shipments"],
    queryFn: () => listFn({}),
    refetchOnWindowFocus: false,
  });
  const shipments: any[] = shipmentsQuery.data?.success ? shipmentsQuery.data.data : [];
  const isLoading = shipmentsQuery.isLoading;
  const listError = shipmentsQuery.data?.success === false ? shipmentsQuery.data.error : null;

  // Estatísticas
  const statsFn = useServerFn(getShipmentStats);
  const statsQuery = useQuery({
    queryKey: ["admin-shipment-stats"],
    queryFn: () => statsFn({}),
    refetchOnWindowFocus: false,
  });
  const stats: ShipmentStats | null = statsQuery.data?.success ? statsQuery.data.data : null;

  // =====================================================
  // SIGEP LABELS QUERIES
  // =====================================================

  // Info do cliente SIGEP
  const sigepInfoFn = useServerFn(getSigepInfo);
  const sigepInfoQuery = useQuery({
    queryKey: ["sigep-info"],
    queryFn: () => sigepInfoFn({}),
    refetchOnWindowFocus: false,
  });

  // Etiquetas disponíveis
  const labelsFn = useServerFn(listSigepLabels);
  const labelsQuery = useQuery({
    queryKey: ["sigep-labels"],
    queryFn: () => labelsFn({}),
    refetchOnWindowFocus: false,
  });
  const availableLabels: Array<{ id: string; codigo: string; service: string; status: string }> =
    labelsQuery.data?.success ? labelsQuery.data.data : [];

  // =====================================================
  // MUTATIONS
  // =====================================================

  // Server functions
  const refreshFn = useServerFn(refreshTracking);
  const updateStatusFn = useServerFn(updateShipmentStatus);
  const getLabelFn = useServerFn(getShipmentLabel);
  const getDeclarationFn = useServerFn(getShipmentDeclaration);
  const startPickingFn = useServerFn(startPicking);
  const finishPickingFn = useServerFn(finishPicking);
  const requestLabelsFn = useServerFn(requestSigepLabels);

  // Atualizar rastreios
  const refreshMutation = useMutation({
    mutationFn: async (ids?: string[]) => {
      return refreshFn({ data: ids ? { ids } : {} });
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(`Rastreios atualizados: ${result.data.updated} envios`);
        queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
        queryClient.invalidateQueries({ queryKey: ["admin-shipment-stats"] });
      } else {
        console.log("Calling toast.error with:", result?.error || "Erro ao atualizar rastreios");
        toast.error(result?.error || "Erro ao atualizar rastreios");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar rastreios");
    },
  });

  // Atualizar status manual
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return updateStatusFn({ data: { id, status } });
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success("Status atualizado");
        queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
        queryClient.invalidateQueries({ queryKey: ["admin-shipment-stats"] });
      } else {
        toast.error(result?.error || "Erro ao atualizar status");
      }
    },
  });

  // Baixar etiqueta
  const getLabelMutation = useMutation({
    mutationFn: async (id: string) => {
      return getLabelFn({ data: { id } });
    },
    onSuccess: (result) => {
      if (result?.success) {
        if (result.data?.type === "external" && result.data?.url) {
          window.open(result.data.url, "_blank");
          toast.success("Etiqueta aberta");
        } else if (result.data?.type === "local") {
          // Abrir modal de impressao local
          setLocalLabelData(result.data);
          setShowLocalLabelModal(true);
        } else {
          toast.success("Etiqueta disponível");
        }
        queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
      } else {
        toast.error(result?.error || "Erro ao buscar etiqueta");
      }
    },
  });

  // Declaração de conteúdo
  const declarationMutation = useMutation({
    mutationFn: async (id: string) => {
      return getDeclarationFn({ data: { id } });
    },
    onSuccess: (result) => {
      if (result?.success && result.data?.html) {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(result.data.html);
          win.document.close();
          win.focus();
          setTimeout(() => win.print(), 300);
        } else {
          toast.error("Bloqueador de popup ativado. Permita popups para este site.");
        }
        queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
      } else {
        toast.error(result?.error || "Erro ao gerar declaração");
      }
    },
  });

  // Separação / Picking
  const [pickingOrderId, setPickingOrderId] = useState<string | null>(null);
  const [pickingOrder, setPickingOrder] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});

  const startPickingMutation = useMutation({
    mutationFn: async (orderId: string) => startPickingFn({ data: { orderId } }),
    onSuccess: (result) => {
      setPickingOrderId(null);
      if (result?.success) {
        toast.success("Separação iniciada!");
        setPickingOrder(result.data);
        queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
      } else {
        toast.error(result?.error || "Erro ao iniciar separação");
      }
    },
    onError: () => {
      setPickingOrderId(null);
      toast.error("Erro ao iniciar separação");
    },
  });

  const finishPickingMutation = useMutation({
    mutationFn: async (orderId: string) => finishPickingFn({ data: { orderId } }),
    onSuccess: (result) => {
      if (result?.success) {
        toast.success("Pedido despachado!");
        setPickingOrder(null);
        setCheckedItems((prev) => {
          const next = { ...prev };
          delete next[result.data.orderId];
          return next;
        });
        queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
        queryClient.invalidateQueries({ queryKey: ["admin-shipment-stats"] });
      } else {
        toast.error(result?.error || "Erro ao finalizar separação");
      }
    },
  });

  const toggleItem = (orderId: string, itemIndex: number) => {
    setCheckedItems((prev) => {
      const next = { ...prev };
      const set = new Set(next[orderId] || []);
      if (set.has(itemIndex)) set.delete(itemIndex);
      else set.add(itemIndex);
      next[orderId] = set;
      return next;
    });
  };

  const allChecked = (order: any) => {
    const items = order.items || [];
    if (items.length === 0) return true;
    const checked = checkedItems[order.id] || new Set();
    return items.every((_: any, i: number) => checked.has(i));
  };

  // Estado para etiqueta local
  const [showLocalLabelModal, setShowLocalLabelModal] = useState(false);
  const [localLabelData, setLocalLabelData] = useState<any>(null);

  // =====================================================
  // SIGEP MUTATIONS
  // =====================================================

  // Solicitar etiquetas
  const requestLabelsMutation = useMutation({
    mutationFn: async ({ quantidade, servico }: { quantidade: number; servico: string }) => {
      return requestLabelsFn({ data: { quantidade, servico: servico as "PAC" | "SEDEX" } });
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success(`${result.data.generated} etiquetas geradas!`);
        queryClient.invalidateQueries({ queryKey: ["sigep-labels"] });
      } else {
        toast.error(result?.error || "Erro ao solicitar etiquetas");
      }
    },
    onError: () => {
      toast.error("Erro ao solicitar etiquetas");
    },
  });

  // Salvar credenciais
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const saveSigepFn = useServerFn(saveSigepCredentials);
  const saveCredentialsMutation = useMutation({
    mutationFn: async (creds: SigepCredentials) => {
      return saveSigepFn({ data: creds });
    },
    onSuccess: (result) => {
      if (result?.success) {
        toast.success("Credenciais salvas!");
        queryClient.invalidateQueries({ queryKey: ["sigep-info"] });
        setShowSigepModal(false);
      } else {
        toast.error(result?.error || "Erro ao salvar credenciais");
      }
      setIsSavingCredentials(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao salvar credenciais");
      setIsSavingCredentials(false);
    },
  });

  const handleSaveCredentials = (creds: SigepCredentials) => {
    setIsSavingCredentials(true);
    saveCredentialsMutation.mutate(creds);
  };

  // =====================================================
  // FILTROS
  // =====================================================

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const matchesSearch =
        String(s.order_number || "").includes(searchQuery) ||
        (s.customer_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.tracking_code || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" || s.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [shipments, searchQuery, selectedStatus]);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleRefreshTracking = () => {
    refreshMutation.mutate(undefined);
  };

  const handlePrintLabels = () => {
    // Selecionar todos os pendentes/enviados que tem tracking
    const toPrint = shipments.filter(s =>
      (s.status === "pending" || s.status === "paid") && s.id
    );

    if (toPrint.length === 0) {
      toast.warning("Nenhum envio pendente para imprimir");
      return;
    }

    toast.info(`Imprimindo ${toPrint.length} etiquetas...`);
    // TODO: Implementar impressão em batch via API do Envio Fácil
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const handleGetLabel = (shipment: Shipment) => {
    if (shipment.tracking_code) {
      // Se já tem tracking code, baixar etiqueta
      getLabelMutation.mutate(shipment.id);
    } else {
      // Se não tem, abrir modal de criação
      setSelectedShipment(shipment);
      setShowCreateModal(true);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
      pending: { label: "Aguardando", color: "bg-amber-100 text-amber-700", icon: Clock },
      paid: { label: "Pago", color: "bg-blue-100 text-blue-700", icon: Clock },
      shipped: { label: "Enviado", color: "bg-blue-100 text-blue-700", icon: Truck },
      in_transit: { label: "Em Trânsito", color: "bg-indigo-100 text-indigo-700", icon: Truck },
      out_for_delivery: { label: "Saiu p/ Entrega", color: "bg-purple-100 text-purple-700", icon: MapPin },
      delivered: { label: "Entregue", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      exception: { label: "Ocorrência", color: "bg-red-100 text-red-700", icon: AlertCircle },
      cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-700", icon: X },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded", config.color)}>
        <IconComponent className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getTrackingUrl = (carrier: string | null, code: string | null) => {
    if (!code) return "#";
    return buildTrackingUrl(carrier || "correios", code);
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
          <button
            onClick={() => setShowSigepModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
          >
            <Settings className="h-4 w-4" />
            Config. SIGEP
          </button>
          <button
            onClick={handleRefreshTracking}
            disabled={refreshMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors disabled:opacity-50"
          >
            {refreshMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Atualizar Rastreios
          </button>
          <button
            onClick={handlePrintLabels}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir Etiquetas
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#E9E1D2]">
        <button
          onClick={() => setActiveTab("envios")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors",
            activeTab === "envios"
              ? "text-[#B07B1E] border-b-2 border-[#B07B1E]"
              : "text-[#8A938E] hover:text-[#0F3A3E]"
          )}
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Envios
          </div>
        </button>
        <button
          onClick={() => setActiveTab("etiquetas")}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors",
            activeTab === "etiquetas"
              ? "text-[#B07B1E] border-b-2 border-[#B07B1E]"
              : "text-[#8A938E] hover:text-[#0F3A3E]"
          )}
        >
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Etiquetas SIGEP
            {availableLabels.length > 0 && (
              <span className="bg-[#B07B1E] text-white text-xs px-2 py-0.5 rounded-full">
                {availableLabels.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "etiquetas" ? (
        <EtiquetasSIGEP
          labels={availableLabels}
          isLoading={labelsQuery.isLoading}
          sigepConfigured={sigepInfoQuery.data?.success && sigepInfoQuery.data?.data?.configured}
          onRequestLabels={(quantidade, servico) =>
            requestLabelsMutation.mutate({ quantidade, servico })
          }
          isRequesting={requestLabelsMutation.isPending}
        />
      ) : (
        <>
          {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Aguardando Envio
          </p>
          <p className="font-serif text-2xl text-amber-600">
            {stats !== null ? (stats.pending + stats.paid) : "—"}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Em Trânsito
          </p>
          <p className="font-serif text-2xl text-blue-600">
            {stats !== null ? (stats.shipped + stats.in_transit + stats.out_for_delivery) : "—"}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Entregues
          </p>
          <p className="font-serif text-2xl text-emerald-600">
            {stats !== null ? stats.delivered : "—"}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ocorrências
          </p>
          <p className="font-serif text-2xl text-red-600">
            {stats !== null ? stats.exception : "—"}
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
            <option value="paid">Pago (a enviar)</option>
            <option value="shipped">Enviado</option>
            <option value="in_transit">Em trânsito</option>
            <option value="out_for_delivery">Saiu p/ entrega</option>
            <option value="delivered">Entregue</option>
            <option value="exception">Ocorrência</option>
          </select>
        </div>
      </div>

      {/* Shipments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#B07B1E]" />
        </div>
      ) : listError ? (
        <div className="bg-white border border-[#E9E1D2] p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600 font-medium">Erro ao carregar envios</p>
          <p className="text-sm text-[#51635F] mt-2">{listError}</p>
          <button
            onClick={() => shipmentsQuery.refetch()}
            className="mt-4 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3]"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="bg-white border border-[#E9E1D2] p-12 text-center">
          <Package className="h-12 w-12 text-[#E9E1D2] mx-auto mb-4" />
          <p className="text-[#51635F]">Nenhum envio encontrado</p>
          {stats && (stats.pending + stats.paid) > 0 && (
            <p className="text-sm text-amber-600 mt-2">
              {stats.pending + stats.paid} pedido(s) aguardando envio
            </p>
          )}
        </div>
      ) : (
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
                      Pedido #{shipment.order_number ?? "—"}
                    </span>
                    {getStatusBadge(shipment.status)}
                  </div>

                  <p className="text-sm text-[#51635F] mb-2">
                    {shipment.customer_name || shipment.recipient_name || "—"}
                  </p>

                  <div className="flex items-center gap-2 text-sm text-[#8A938E]">
                    <MapPin className="h-4 w-4" />
                    {shipment.customer_email || shipment.recipient_email || "—"}
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
                          href={getTrackingUrl(shipment.carrier, shipment.tracking_code)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#B07B1E] hover:text-[#8A5A0E]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>

                      <div className="text-sm">
                        <span className="text-[#8A938E]">{shipment.carrier || "Correios"}</span>
                        {shipment.service && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-[#51635F]">{shipment.service}</span>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-amber-600 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Aguardando postagem
                    </div>
                  )}
                </div>

                {/* Right: Shipping Info */}
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                    Previsão de Entrega
                  </p>
                  <p className="text-sm text-[#0F3A3E] mb-1">
                    {shipment.estimated_days ? `${shipment.estimated_days} dias úteis` : "—"}
                  </p>
                  {shipment.shipped_at && (
                    <p className="text-xs text-[#8A938E]">
                      Enviado: {formatDate(shipment.shipped_at)}
                    </p>
                  )}
                  <p className="text-sm font-medium text-[#0F3A3E] mt-2">
                    {shipment.final_price ? `R$ ${Number(shipment.final_price).toFixed(2)}` : "—"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {/* Status: processing = separação concluída */}
                  {shipment.status === "processing" && (
                    <span className="px-4 py-2 text-xs bg-emerald-100 text-emerald-700 rounded flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Separado ✓
                    </span>
                  )}

                  {/* Separar: pedidos pagos */}
                  {shipment.status === "processing" && (
                    <button
                      onClick={() => {
                        setPickingOrderId(shipment.order_id);
                        startPickingMutation.mutate(shipment.order_id);
                      }}
                      disabled={pickingOrderId === shipment.order_id}
                      className="px-4 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      {pickingOrderId === shipment.order_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ClipboardList className="h-3 w-3" />
                      )}
                      Separar
                    </button>
                  )}

                  {/* Visualizar Itens: após separação, consultar itens conferidos */}
                  {shipment.status === "processing" && (
                    <button
                      onClick={() => {
                        setPickingOrderId(shipment.order_id);
                        startPickingMutation.mutate(shipment.order_id);
                      }}
                      className="px-4 py-2 text-xs border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors flex items-center gap-1"
                    >
                      <Package className="h-3 w-3" />
                      Visualizar Itens
                    </button>
                  )}

                  {/* Gerar Etiqueta: sem envio OU envio sem rastreio */}
                  {(!shipment.shipment_id || (shipment.shipment_id && !shipment.tracking_code)) && (shipment.status === "paid" || shipment.status === "processing") && (
                    <button
                      onClick={() => {
                        setSelectedShipment(shipment);
                        setShowCreateModal(true);
                      }}
                      className="px-4 py-2 text-xs bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
                    >
                      Gerar Etiqueta
                    </button>
                  )}

                  {/* Imprimir Etiqueta: envio existe e tem rastreio */}
                  {shipment.shipment_id && shipment.tracking_code && (
                    <button
                      onClick={() => getLabelMutation.mutate(shipment.shipment_id!)}
                      disabled={getLabelMutation.isPending}
                      className={cn(
                        "px-4 py-2 text-xs border transition-colors flex items-center gap-1",
                        shipment.label_printed_at
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      )}
                    >
                      {getLabelMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Printer className="h-3 w-3" />
                      )}
                      {shipment.label_printed_at ? "Etiqueta ✓" : "Imprimir Etiqueta"}
                    </button>
                  )}

                  {/* Declaração de conteúdo: envio existe */}
                  {shipment.shipment_id && (
                    <button
                      onClick={() => declarationMutation.mutate(shipment.shipment_id!)}
                      disabled={declarationMutation.isPending}
                      className={cn(
                        "px-4 py-2 text-xs border transition-colors flex items-center gap-1",
                        shipment.declaration_printed_at
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      )}
                      title="Declaração de Conteúdo"
                    >
                      {declarationMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      {shipment.declaration_printed_at ? "Declaração ✓" : "Declaração"}
                    </button>
                  )}

                  {/* Confirmar Despacho: só habilita se separação + etiqueta + declaração ok */}
                  {shipment.status === "processing" && (
                    <button
                      onClick={() => finishPickingMutation.mutate(shipment.order_id)}
                      disabled={
                        finishPickingMutation.isPending ||
                        !shipment.shipment_id ||
                        !shipment.label_printed_at ||
                        !shipment.declaration_printed_at
                      }
                      className="px-4 py-2 text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {finishPickingMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Truck className="h-3 w-3" />
                      )}
                      Confirmar Despacho
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {shipment.tracking_code && (
                <div className="mt-4 pt-4 border-t border-[#E9E1D2]">
                  <div className="flex items-center justify-between text-xs text-[#8A938E]">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        shipment.shipped_at ? "bg-emerald-500" : "bg-[#E9E1D2]"
                      )}></span>
                      <span>Postado: {formatDate(shipment.shipped_at)}</span>
                    </div>
                    <div className="flex-1 mx-4 h-[2px] bg-[#E9E1D2]">
                      <div
                        className={cn(
                          "h-full bg-[#B07B1E]",
                          shipment.status === "delivered" ? "w-full" :
                          shipment.status === "out_for_delivery" ? "w-3/4" :
                          shipment.status === "in_transit" || shipment.status === "shipped" ? "w-1/2" :
                          "w-1/4"
                        )}
                      ></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        shipment.status === "delivered" ? "bg-emerald-500" : "bg-[#E9E1D2]"
                      )}></span>
                      <span>Entrega: {shipment.estimated_days ? `${shipment.estimated_days} dias` : "—"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de criação de envio */}
      {showCreateModal && selectedShipment && (
        <CreateShipmentModal
          shipment={selectedShipment}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedShipment(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedShipment(null);
            queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
            queryClient.invalidateQueries({ queryKey: ["admin-shipment-stats"] });
          }}
          onGetLabel={(id) => getLabelMutation.mutate(id)}
        />
      )}
        </>
      )}

      {/* Modal de configuração SIGEP */}
      {showSigepModal && (
        <SigepConfigModal
          onClose={() => setShowSigepModal(false)}
          onSave={handleSaveCredentials}
          isSaving={isSavingCredentials}
        />
      )}

      {/* Modal de etiqueta local para impressao */}
      {showLocalLabelModal && localLabelData && (
        <LocalLabelModal
          data={localLabelData}
          onClose={() => {
            setShowLocalLabelModal(false);
            setLocalLabelData(null);
          }}
        />
      )}

      {/* Modal de separação */}
      {pickingOrder && (
        <PickingModal
          order={pickingOrder}
          checkedItems={checkedItems[pickingOrder.order?.id] || new Set()}
          onToggleItem={(itemIndex: number) => toggleItem(pickingOrder.order?.id, itemIndex)}
          allChecked={allChecked(pickingOrder.order)}
          onClose={() => {
            setPickingOrder(null);
            queryClient.invalidateQueries({ queryKey: ["admin-shipments"] });
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// MODAL: Separação / Picking
// =====================================================

function PickingModal({
  order,
  checkedItems,
  onToggleItem,
  allChecked,
  onClose,
}: {
  order: any;
  checkedItems: Set<number>;
  onToggleItem: (i: number) => void;
  allChecked: boolean;
  onClose: () => void;
}) {
  const items = order?.order?.items || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-[#0F3A3E] flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Separação — Pedido #{(order?.order?.order_number ?? order?.order?.id?.slice(0, 8)?.toUpperCase()) || ""}
          </h2>
          <button onClick={onClose} className="text-[#8A938E] hover:text-[#0F3A3E]">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Cliente */}
        <div className="bg-[#F8F4EA] p-4 rounded mb-6">
          <p className="text-sm font-medium text-[#0F3A3E]">{order?.order?.customer_name || "—"}</p>
          <p className="text-xs text-[#51635F]">{order?.order?.customer_email || "—"}</p>
          <p className="text-xs text-[#8A938E] mt-1">
            Total: R$ {Number(order?.order?.total || 0).toFixed(2)}
          </p>
        </div>

        {/* Itens para conferência */}
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Conferência de Itens
        </h3>
        <div className="space-y-2 mb-6">
          {items.map((item: any, i: number) => (
            <label
              key={i}
              className={cn(
                "flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors",
                checkedItems.has(i)
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-white border-[#E9E1D2] hover:border-[#B07B1E]"
              )}
            >
              <input
                type="checkbox"
                checked={checkedItems.has(i)}
                onChange={() => onToggleItem(i)}
                className="h-4 w-4 accent-emerald-600"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0F3A3E] truncate">
                  {item.title || item.name || "Produto"}
                </p>
                <p className="text-xs text-[#8A938E]">
                  Qtd: {item.quantity || 1} × R$ {Number(item.price || 0).toFixed(2)}
                </p>
              </div>
              {checkedItems.has(i) && (
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
              )}
            </label>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-[#8A938E] italic">Nenhum item encontrado.</p>
          )}
        </div>

        {/* Progresso */}
        <div className="flex items-center justify-between mb-6 pt-4 border-t border-[#E9E1D2]">
          <span className="text-sm text-[#51635F]">
            {checkedItems.size} de {items.length} itens conferidos
          </span>
          {allChecked && items.length > 0 && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Todos conferidos
            </span>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-[#E9E1D2]">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 ml-auto"
          >
            <CheckCircle className="h-4 w-4" />
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MODAL: Criar envio/etiqueta
// =====================================================

function CreateShipmentModal({
  shipment,
  onClose,
  onSuccess,
  onGetLabel,
}: {
  shipment: Shipment;
  onClose: () => void;
  onSuccess: () => void;
  onGetLabel: (id: string) => void;
}) {
  const [carrier, setCarrier] = useState("Correios");
  const [service, setService] = useState("PAC");
  const [serviceCode, setServiceCode] = useState("04510");
  const [price, setPrice] = useState("25.90");
  const [estimatedDays, setEstimatedDays] = useState("8");
  const [isCreating, setIsCreating] = useState(false);
  const createShipmentFn = useServerFn(createShipment);

  const createMutation = useMutation({
    mutationFn: async () => {
      return createShipmentFn({
        data: {
          orderId: shipment.order_id,
          carrier,
          service,
          serviceCode,
          price: parseFloat(price),
          estimatedDays: parseInt(estimatedDays),
          recipientName: shipment.recipient_name || shipment.customer_name || "",
          recipientEmail: shipment.recipient_email || shipment.customer_email || "",
          recipientPostalCode: shipment.recipient_postal_code || "",
          recipientAddress: {
            street: shipment.recipient_address?.street || "",
            number: shipment.recipient_address?.number || "",
            complement: shipment.recipient_address?.complement || "",
            neighborhood: shipment.recipient_address?.neighborhood || "",
            city: shipment.recipient_address?.city || "",
            state: shipment.recipient_address?.state || "",
          },
          packageWeight: 500,
          packageHeight: 10,
          packageWidth: 15,
          packageLength: 20,
          declaredValue: 0,
        },
      });
    },
    onSuccess: (result) => {
      if (result?.success) {
        if (result.data?.tracking_code) {
          toast.success("Envio criado! Código: " + result.data.tracking_code);
        } else {
          toast.success("Envio criado! Código de rastreio pendente.");
        }
        // Só abre etiqueta se tiver código de rastreio
        if (result.data?.id && result.data?.tracking_code) {
          onGetLabel(result.data.id);
        }
        onSuccess();
      } else {
        toast.error(result?.error || "Erro ao criar envio");
        setIsCreating(false);
      }
    },
    onError: () => {
      toast.error("Erro ao criar envio");
      setIsCreating(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    createMutation.mutate();
  };

  const serviceOptions = carrier === "Correios"
    ? [
        { label: "PAC", code: "03298", days: 8 },
        { label: "SEDEX", code: "03220", days: 3 },
        { label: "SEDEX 10", code: "04162", days: 1 },
      ]
    : [
        { label: "Expresso", code: "EXPRESS", days: 5 },
      ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-[#0F3A3E]">
            Gerar Etiqueta - Pedido #{shipment.order_number}
          </h2>
          <button onClick={onClose} className="text-[#8A938E] hover:text-[#0F3A3E]">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transportadora */}
          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              Transportadora
            </label>
            <select
              value={carrier}
              onChange={(e) => {
                setCarrier(e.target.value);
                const opts = e.target.value === "Correios"
                  ? [{ label: "PAC", code: "04510", days: 8 }]
                  : [{ label: "Expresso", code: "EXPRESS", days: 5 }];
                setService(opts[0].label);
                setServiceCode(opts[0].code);
                setEstimatedDays(String(opts[0].days));
              }}
              className="w-full px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
            >
              <option value="Correios">Correios</option>
              <option value="Jadlog">Jadlog</option>
              <option value="Azul">Azul Cargo</option>
              <option value="Loggi">Loggi</option>
            </select>
          </div>

          {/* Serviço */}
          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              Serviço
            </label>
            <select
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                const opt = serviceOptions.find(o => o.label === e.target.value);
                if (opt) {
                  setServiceCode(opt.code);
                  setEstimatedDays(String(opt.days));
                }
              }}
              className="w-full px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
            >
              {serviceOptions.map(opt => (
                <option key={opt.code} value={opt.label}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Preço */}
          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              Valor do Frete (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
              required
            />
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              Prazo de Entrega (dias úteis)
            </label>
            <input
              type="number"
              value={estimatedDays}
              onChange={(e) => setEstimatedDays(e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
              required
            />
          </div>

          {/* Info */}
          <div className="bg-[#F8F4EA] p-4 rounded text-sm text-[#51635F]">
            <p className="font-medium mb-2">Destinatário:</p>
            <p>{shipment.recipient_name || shipment.customer_name}</p>
            <p>{shipment.recipient_email || shipment.customer_email}</p>
            {shipment.recipient_postal_code && (
              <p>CEP: {shipment.recipient_postal_code}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="flex-1 px-4 py-2 bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  Gerar Etiqueta
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// COMPONENTE: Etiquetas SIGEP
// =====================================================

type Label = { id: string; codigo: string; service: string; status: string };

function EtiquetasSIGEP({
  labels,
  isLoading,
  sigepConfigured,
  onRequestLabels,
  isRequesting,
}: {
  labels: Label[];
  isLoading: boolean;
  sigepConfigured?: boolean;
  onRequestLabels: (quantidade: number, servico: string) => void;
  isRequesting: boolean;
}) {
  const [quantidade, setQuantidade] = useState(10);
  const [servico, setServico] = useState("PAC");

  if (!sigepConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-6 text-center">
        <Tag className="h-12 w-12 text-amber-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-amber-900 mb-2">
          Credenciais SIGEP não configuradas
        </h3>
        <p className="text-sm text-amber-700 mb-4">
          Clique em "Config. SIGEP" no canto superior para adicionar suas credenciais.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solicitar etiquetas */}
      <div className="bg-white border border-[#E9E1D2] p-6">
        <h3 className="font-serif text-lg text-[#0F3A3E] mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Solicitar Etiquetas ao SIGEP
        </h3>

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Serviço</label>
            <select
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              className="px-4 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
            >
              <option value="PAC">PAC</option>
              <option value="SEDEX">SEDEX</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Quantidade</label>
            <input
              type="number"
              min="1"
              max="100"
              value={quantidade}
              onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
              className="w-24 px-4 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <button
            onClick={() => onRequestLabels(quantidade, servico)}
            disabled={isRequesting}
            className="px-6 py-2 bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isRequesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Solicitando...
              </>
            ) : (
              <>
                <Tag className="h-4 w-4" />
                Solicitar Etiquetas
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-[#8A938E] mt-4">
          As etiquetas são geradas em lote e ficam disponíveis para uso.
          Elas são vinculadas a um pedido no momento da postagem.
        </p>
      </div>

      {/* Etiquetas disponíveis */}
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-[#0F3A3E] flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Etiquetas Disponíveis
          </h3>
          <span className="text-sm text-[#8A938E]">
            {labels.length} etiqueta(s)
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#B07B1E]" />
          </div>
        ) : labels.length === 0 ? (
          <div className="text-center py-12 text-[#8A938E]">
            <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma etiqueta disponível.</p>
            <p className="text-sm mt-1">Solicite etiquetas acima para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E9E1D2]">
                  <th className="text-left py-3 px-2 text-[#8A938E] font-medium">Código</th>
                  <th className="text-left py-3 px-2 text-[#8A938E] font-medium">Serviço</th>
                  <th className="text-left py-3 px-2 text-[#8A938E] font-medium">Status</th>
                  <th className="text-right py-3 px-2 text-[#8A938E] font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((label) => (
                  <tr key={label.id} className="border-b border-[#E9E1D2] hover:bg-[#F9F7F3]">
                    <td className="py-3 px-2 font-mono text-[#0F3A3E]">
                      {label.codigo}
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn(
                        "px-2 py-1 text-xs rounded",
                        label.service === "SEDEX"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      )}>
                        {label.service}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        Disponível
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => window.print()}
                        className="p-2 hover:bg-[#F3EEE3] transition-colors"
                        title="Imprimir etiqueta"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// MODAL: Configurar SIGEP
// =====================================================

function SigepConfigModal({
  onClose,
  onSave,
  isSaving,
}: {
  onClose: () => void;
  onSave: (creds: SigepCredentials) => void;
  isSaving: boolean;
}) {
  const [usuario, setUsuario] = useState("");
  const [codigoAcesso, setCodigoAcesso] = useState("");
  const [cartaoPostagem, setCartaoPostagem] = useState("");
  const [cepOrigem, setCepOrigem] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      usuario,
      codigoAcesso,
      cartaoPostagem,
      cepOrigem,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif text-[#0F3A3E] flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar SIGEP Web
          </h2>
          <button onClick={onClose} className="text-[#8A938E] hover:text-[#0F3A3E]">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 mb-6 text-sm">
          <p className="font-medium text-amber-900 mb-1">Credenciais da API dos Correios</p>
          <p className="text-amber-700">
            Gere o código de acesso em cws.correios.com.br (Meu Correios → Meus Serviços → API).
            Não é a senha do site. O cartão de postagem é o número do seu contrato de postagem.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              Usuário (CNPJ/contrato)
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              Código de Acesso à API
            </label>
            <input
              type="password"
              value={codigoAcesso}
              onChange={(e) => setCodigoAcesso(e.target.value)}
              placeholder="Gerado em cws.correios.com.br"
              className="w-full px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              Cartão de Postagem
            </label>
            <input
              type="text"
              value={cartaoPostagem}
              onChange={(e) => setCartaoPostagem(e.target.value)}
              placeholder="Ex: 0067599451"
              className="w-full px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#51635F] mb-1">
              CEP de Origem (Sua loja)
            </label>
            <input
              type="text"
              value={cepOrigem}
              onChange={(e) => setCepOrigem(e.target.value)}
              placeholder="Ex: 01310100"
              className="w-40 px-3 py-2 border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E]"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Credenciais
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogistica;