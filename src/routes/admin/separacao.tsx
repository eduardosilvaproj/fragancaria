import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Package,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Printer,
  FileText,
  Loader2,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listPickingOrders,
  startPicking,
  finishPicking,
  getShipmentLabel,
  getShipmentDeclaration,
  updateShipmentStatus,
  buildTrackingUrl,
} from "@/lib/logistics.functions";
import { LocalLabelModal } from "@/components/admin/LocalLabelModal";

export const Route = createFileRoute("/admin/separacao")({
  component: AdminSeparacao,
});

function AdminSeparacao() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, Set<number>>>({});
  const [showLocalLabelModal, setShowLocalLabelModal] = useState(false);
  const [localLabelData, setLocalLabelData] = useState<any>(null);

  const queryClient = useQueryClient();

  // Server functions
  const listFn = useServerFn(listPickingOrders);
  const startPickingFn = useServerFn(startPicking);
  const finishPickingFn = useServerFn(finishPicking);
  const getLabelFn = useServerFn(getShipmentLabel);
  const getDeclarationFn = useServerFn(getShipmentDeclaration);
  const updateStatusFn = useServerFn(updateShipmentStatus);

  // Queries
  const ordersQuery = useQuery({
    queryKey: ["picking-orders"],
    queryFn: () => listFn({}),
    refetchOnWindowFocus: false,
  });
  const orders = ordersQuery.data?.success ? ordersQuery.data.data : [];
  const isLoading = ordersQuery.isLoading;

  // Mutations
  const startPickingMutation = useMutation({
    mutationFn: async (orderId: string) => startPickingFn({ data: { orderId } }),
    onSuccess: (result) => {
      if (result?.success) {
        toast.success("Separação iniciada!");
        queryClient.invalidateQueries({ queryKey: ["picking-orders"] });
      } else {
        toast.error(result?.error || "Erro ao iniciar separação");
      }
    },
  });

  const finishPickingMutation = useMutation({
    mutationFn: async (orderId: string) => finishPickingFn({ data: { orderId } }),
    onSuccess: (result) => {
      if (result?.success) {
        toast.success("Pedido despachado!");
        setExpandedOrder(null);
        queryClient.invalidateQueries({ queryKey: ["picking-orders"] });
      } else {
        toast.error(result?.error || "Erro ao finalizar separação");
      }
    },
  });

  const getLabelMutation = useMutation({
    mutationFn: async (id: string) => getLabelFn({ data: { id } }),
    onSuccess: (result) => {
      if (result?.success) {
        if (result.data?.type === "external" && result.data?.url) {
          window.open(result.data.url, "_blank");
          toast.success("Etiqueta aberta");
        } else if (result.data?.type === "local") {
          setLocalLabelData(result.data);
          setShowLocalLabelModal(true);
        } else {
          toast.success("Etiqueta disponível");
        }
      } else {
        toast.error(result?.error || "Erro ao buscar etiqueta");
      }
    },
  });

  const declarationMutation = useMutation({
    mutationFn: async (id: string) => getDeclarationFn({ data: { id } }),
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
      } else {
        toast.error(result?.error || "Erro ao gerar declaração");
      }
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      updateStatusFn({ data: { id, status } }),
    onSuccess: (result) => {
      if (result?.success) {
        toast.success("Status atualizado");
        queryClient.invalidateQueries({ queryKey: ["picking-orders"] });
      } else {
        toast.error(result?.error || "Erro ao atualizar status");
      }
    },
  });

  // Filtro
  const filteredOrders = useMemo(() => {
    return orders.filter((o: any) => {
      const q = searchQuery.toLowerCase();
      return (
        String(o.order_number || "").includes(q) ||
        (o.customer_name || "").toLowerCase().includes(q) ||
        (o.tracking_code || "").toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery]);

  // Toggle item checked
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

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const formatPrice = (v: number) =>
    v != null ? `R$ ${Number(v).toFixed(2)}` : "—";

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      paid: { label: "Aguardando Separação", color: "bg-amber-100 text-amber-700" },
      processing: { label: "Em Separação", color: "bg-blue-100 text-blue-700" },
    };
    const c = config[status] || { label: status, color: "bg-gray-100 text-gray-700" };
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded", c.color)}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Logística
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Separação</h1>
          <p className="text-sm text-[#51635F] mt-1">
            {orders.length} pedido(s) aguardando ou em separação
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["picking-orders"] })}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
          <input
            type="text"
            placeholder="Buscar por pedido, cliente ou código de rastreio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
          />
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#B07B1E]" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-[#E9E1D2] p-12 text-center">
          <ClipboardList className="h-12 w-12 text-[#E9E1D2] mx-auto mb-4" />
          <p className="text-[#51635F]">Nenhum pedido pendente de separação</p>
          <p className="text-sm text-[#8A938E] mt-1">
            Pedidos com status "Pago" ou "Em Separação" aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: any) => {
            const isExpanded = expandedOrder === order.id;
            const items = order.items || [];
            const checked = checkedItems[order.id] || new Set();
            const allOk = allChecked(order);
            const shipment = order.shipment;

            return (
              <div
                key={order.id}
                className={cn(
                  "bg-white border border-[#E9E1D2] transition-all",
                  order.status === "processing" && "border-l-4 border-l-blue-500"
                )}
              >
                {/* Card resumo */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Package className="h-5 w-5 text-[#B07B1E]" />
                        <span className="font-medium text-[#0F3A3E]">
                          Pedido #{order.order_number ?? order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm text-[#51635F] mb-2">
                        {order.customer_name || "—"}
                      </p>
                      <p className="text-sm text-[#8A938E]">
                        {order.customer_email || "—"}
                      </p>
                      <p className="text-xs text-[#8A938E] mt-1">
                        Criado: {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div className="flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                        Total
                      </p>
                      <p className="text-lg font-semibold text-[#0F3A3E]">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-[#8A938E] mt-1">
                        {items.length} item(ns)
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2">
                      {order.status === "paid" && (
                        <button
                          onClick={() => startPickingMutation.mutate(order.id)}
                          disabled={startPickingMutation.isPending}
                          className="px-4 py-2 text-xs bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {startPickingMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ClipboardList className="h-3 w-3" />
                          )}
                          Iniciar Separação
                        </button>
                      )}
                      {order.status === "processing" && (
                        <>
                          <button
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                            className="px-4 py-2 text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                          >
                            <Package className="h-3 w-3" />
                            {isExpanded ? "Recolher Itens" : "Conferir Itens"}
                          </button>
                          <button
                            onClick={() => finishPickingMutation.mutate(order.id)}
                            disabled={finishPickingMutation.isPending || !allOk}
                            className="px-4 py-2 text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {finishPickingMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Truck className="h-3 w-3" />
                            )}
                            Finalizar e Despachar
                          </button>
                        </>
                      )}
                      {shipment?.id && (
                        <>
                          <button
                            onClick={() => getLabelMutation.mutate(shipment.id)}
                            disabled={getLabelMutation.isPending}
                            className="px-4 py-2 text-xs border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors flex items-center gap-1"
                          >
                            {getLabelMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Printer className="h-3 w-3" />
                            )}
                            Imprimir
                          </button>
                          <button
                            onClick={() => declarationMutation.mutate(shipment.id)}
                            disabled={declarationMutation.isPending}
                            className="px-4 py-2 text-xs border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors flex items-center gap-1"
                          >
                            {declarationMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <FileText className="h-3 w-3" />
                            )}
                            Declaração
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card expandido de itens */}
                {isExpanded && (
                  <div className="border-t border-[#E9E1D2] bg-[#F8F4EA] p-6">
                    <h3 className="text-sm font-semibold text-[#0F3A3E] mb-4 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Conferência de Itens
                    </h3>
                    <div className="space-y-2">
                      {items.map((item: any, i: number) => (
                        <label
                          key={i}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors",
                            checked.has(i)
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-white border-[#E9E1D2] hover:border-[#B07B1E]"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked.has(i)}
                            onChange={() => toggleItem(order.id, i)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0F3A3E] truncate">
                              {item.title || item.name || "Produto"}
                            </p>
                            <p className="text-xs text-[#8A938E]">
                              Qtd: {item.quantity || 1} × {formatPrice(item.price || 0)}
                            </p>
                          </div>
                          {checked.has(i) && (
                            <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                          )}
                        </label>
                      ))}
                      {items.length === 0 && (
                        <p className="text-sm text-[#8A938E] italic">
                          Nenhum item encontrado neste pedido.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E9E1D2]">
                      <span className="text-sm text-[#51635F]">
                        {checked.size} de {items.length} itens conferidos
                      </span>
                      {allOk && items.length > 0 && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Todos conferidos
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Info do shipment */}
                {shipment && (
                  <div className="border-t border-[#E9E1D2] px-6 py-3 flex flex-wrap items-center gap-4 text-xs text-[#8A938E]">
                    {shipment.tracking_code && (
                      <span className="font-mono">{shipment.tracking_code}</span>
                    )}
                    <span>{shipment.carrier || "—"}</span>
                    <span>{shipment.service || "—"}</span>
                    {shipment.weight_grams && <span>{shipment.weight_grams}g</span>}
                    <span className={cn(
                      "px-2 py-0.5 rounded",
                      shipment.status === "pending" ? "bg-amber-50 text-amber-600" :
                      shipment.status === "paid" ? "bg-blue-50 text-blue-600" :
                      shipment.status === "shipped" ? "bg-emerald-50 text-emerald-600" :
                      "bg-gray-50 text-gray-600"
                    )}>
                      Envio: {shipment.status}
                    </span>
                    <select
                      value={shipment.status}
                      onChange={(e) => updateStatusMutation.mutate({ id: shipment.id, status: e.target.value })}
                      disabled={updateStatusMutation.isPending}
                      className="ml-auto px-2 py-1 text-xs border border-[#E9E1D2] focus:outline-none focus:border-[#B07B1E] disabled:opacity-50"
                    >
                      <option value="pending">Aguardando</option>
                      <option value="paid">Pago</option>
                      <option value="shipped">Enviado</option>
                      <option value="in_transit">Em trânsito</option>
                      <option value="out_for_delivery">Saiu p/ entrega</option>
                      <option value="delivered">Entregue</option>
                      <option value="exception">Ocorrência</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de etiqueta local */}
      {showLocalLabelModal && localLabelData && (
        <LocalLabelModal
          data={localLabelData}
          onClose={() => {
            setShowLocalLabelModal(false);
            setLocalLabelData(null);
          }}
        />
      )}
    </div>
  );
}

export default AdminSeparacao;