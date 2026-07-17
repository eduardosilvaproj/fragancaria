import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Eye,
  Lock,
  Unlock,
  MessageSquare,
  ShoppingBag,
  User,
  UserX,
  X,
  Save,
  AlertTriangle,
  ClipboardList,
  Clock,
  Star,
  Award,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listCustomersForAdmin,
  getCustomerForAdmin,
  updateCustomerForAdmin,
  setCustomerBlocked,
  addCustomerNote,
  setCustomerLoyalty,
  updateOrderAddressForAdmin,
  updateCustomerAddressForAdmin,
  type AdminCustomerRow,
  type AdminCustomerOrder,
  type AdminCustomerAddress,
  type AdminCustomerNote,
} from "@/lib/customers-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/clientes")({
  component: AdminClientes,
});

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendente", color: "text-yellow-700", bg: "bg-yellow-50" },
  paid: { label: "Aprovado", color: "text-green-700", bg: "bg-green-50" },
  approved: { label: "Aprovado", color: "text-green-700", bg: "bg-green-50" },
  processing: { label: "Processando", color: "text-blue-700", bg: "bg-blue-50" },
  shipped: { label: "Enviado", color: "text-purple-700", bg: "bg-purple-50" },
  delivered: { label: "Entregue", color: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled: { label: "Cancelado", color: "text-red-700", bg: "bg-red-50" },
  refunded: { label: "Reembolsado", color: "text-gray-700", bg: "bg-gray-50" },
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  bronze: { label: "Bronze", color: "text-amber-700", bg: "bg-amber-50", icon: "🥉" },
  silver: { label: "Prata", color: "text-gray-600", bg: "bg-gray-100", icon: "🥈" },
  gold: { label: "Ouro", color: "text-yellow-600", bg: "bg-yellow-50", icon: "🥇" },
  platinum: { label: "Diamante", color: "text-purple-600", bg: "bg-purple-50", icon: "💎" },
};

const NEXT_TIER_POINTS: Record<string, number> = {
  bronze: 500,
  silver: 1500,
  gold: 3000,
  platinum: 999999,
};

function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.bronze;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.bg, cfg.color)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

type Tab = "dados" | "pedidos" | "enderecos" | "loyalty" | "notas";

function AdminClientes() {
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [blockedFilter, setBlockedFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomerRow | null>(null);
  const [detailData, setDetailData] = useState<{
    orders: AdminCustomerOrder[];
    addresses: AdminCustomerAddress[];
    notes: AdminCustomerNote[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dados");

  // Edição de endereço do pedido (snapshot usado em etiqueta/NF-e)
  const [editingOrderAddressId, setEditingOrderAddressId] = useState<string | null>(null);
  const [orderAddressForm, setOrderAddressForm] = useState({
    street: "", number: "", complement: "", neighborhood: "", city: "", state: "", cep: "",
  });
  const [savingOrderAddress, setSavingOrderAddress] = useState(false);

  // Edição de endereço salvo no livro de endereços da conta
  const [editingAccountAddressId, setEditingAccountAddressId] = useState<string | null>(null);
  const [accountAddressForm, setAccountAddressForm] = useState({
    recipientName: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", cep: "",
  });
  const [savingAccountAddress, setSavingAccountAddress] = useState(false);

  // Editable fields in the detail modal
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Note input
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Block confirmation
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  // Loyalty editing
  const [editPoints, setEditPoints] = useState(0);
  const [editTier, setEditTier] = useState("bronze");
  const [showLoyaltyEdit, setShowLoyaltyEdit] = useState(false);
  const [savingLoyalty, setSavingLoyalty] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCustomersForAdmin({ data: { search: searchQuery } });
      if (result.success) {
        setCustomers(result.data.customers);
      } else {
        toast.error("Erro ao carregar clientes: " + result.error);
      }
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCustomer = useCallback(async (customer: AdminCustomerRow) => {
    setSelectedCustomer(customer);
    setActiveTab("dados");
    setEditName(customer.name || "");
    setEditPhone(customer.phone || "");
    setEditCpf(customer.cpf || "");
    setEditBirthDate(customer.birthDate || "");
    setEditPoints(customer.loyaltyPoints);
    setEditTier(customer.loyaltyTier);
    setNoteText("");
    setShowBlockConfirm(false);
    setBlockReason("");
    setShowLoyaltyEdit(false);
    setDetailData(null);
    setLoadingDetail(true);
    const res = await getCustomerForAdmin({ data: { customerId: customer.id } });
    setLoadingDetail(false);
    if (res.success) {
      setDetailData({ orders: res.data.orders, addresses: res.data.addresses, notes: res.data.notes });
    } else {
      toast.error("Erro ao carregar detalhes: " + res.error);
    }
  }, []);

  const startEditOrderAddress = (order: AdminCustomerOrder) => {
    setEditingOrderAddressId(order.id);
    setOrderAddressForm({
      street: order.shippingAddress?.street ?? "",
      number: order.shippingAddress?.number ?? "",
      complement: order.shippingAddress?.complement ?? "",
      neighborhood: order.shippingAddress?.neighborhood ?? "",
      city: order.shippingAddress?.city ?? "",
      state: order.shippingAddress?.state ?? "",
      cep: order.shippingAddress?.cep ?? "",
    });
  };

  const saveOrderAddress = async () => {
    if (!editingOrderAddressId) return;
    setSavingOrderAddress(true);
    const res = await updateOrderAddressForAdmin({
      data: { orderId: editingOrderAddressId, address: orderAddressForm },
    });
    setSavingOrderAddress(false);
    if (res.success) {
      toast.success("Endereço do pedido atualizado");
      setDetailData((prev) =>
        prev
          ? {
              ...prev,
              orders: prev.orders.map((o) =>
                o.id === editingOrderAddressId
                  ? { ...o, shippingAddress: { ...orderAddressForm } }
                  : o,
              ),
            }
          : prev,
      );
      setEditingOrderAddressId(null);
    } else {
      toast.error("Erro ao salvar endereço: " + res.error);
    }
  };

  const startEditAccountAddress = (address: AdminCustomerAddress) => {
    setEditingAccountAddressId(address.id);
    setAccountAddressForm({
      recipientName: address.recipientName,
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      cep: address.cep,
    });
  };

  const saveAccountAddress = async () => {
    if (!editingAccountAddressId || !selectedCustomer) return;
    setSavingAccountAddress(true);
    const res = await updateCustomerAddressForAdmin({
      data: {
        customerId: selectedCustomer.id,
        address: { id: editingAccountAddressId, ...accountAddressForm },
      },
    });
    setSavingAccountAddress(false);
    if (res.success) {
      toast.success("Endereço da conta atualizado");
      setDetailData((prev) =>
        prev
          ? {
              ...prev,
              addresses: prev.addresses.map((a) =>
                a.id === editingAccountAddressId ? { ...a, ...accountAddressForm } : a,
              ),
            }
          : prev,
      );
      setEditingAccountAddressId(null);
    } else {
      toast.error("Erro ao salvar endereço: " + res.error);
    }
  };

  const saveProfile = async () => {
    if (!selectedCustomer) return;
    setSavingProfile(true);
    const res = await updateCustomerForAdmin({
      data: {
        customerId: selectedCustomer.id,
        patch: {
          name: editName || null,
          phone: editPhone || null,
          cpf: editCpf || null,
          birthDate: editBirthDate || null,
        },
      },
    });
    setSavingProfile(false);
    if (res.success) {
      toast.success("Dados atualizados");
      const updated = { ...selectedCustomer, name: editName || null, phone: editPhone || null, cpf: editCpf || null, birthDate: editBirthDate || null };
      setSelectedCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } else {
      toast.error("Erro ao salvar: " + res.error);
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedCustomer) return;
    setBlocking(true);
    const res = await setCustomerBlocked({
      data: {
        customerId: selectedCustomer.id,
        blocked: !selectedCustomer.blocked,
        reason: blockReason || undefined,
      },
    });
    setBlocking(false);
    if (res.success) {
      const nowBlocked = !selectedCustomer.blocked;
      toast.success(nowBlocked ? "Cliente bloqueado" : "Cliente desbloqueado");
      if (res.warning) toast.warning(res.warning);
      const updated = { ...selectedCustomer, blocked: nowBlocked };
      setSelectedCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setShowBlockConfirm(false);
    } else {
      toast.error("Erro: " + res.error);
    }
  };

  const handleAddNote = async () => {
    if (!selectedCustomer || !noteText.trim()) return;
    setSavingNote(true);
    const res = await addCustomerNote({
      data: { customerId: selectedCustomer.id, note: noteText.trim() },
    });
    setSavingNote(false);
    if (res.success) {
      toast.success("Nota adicionada");
      setDetailData((prev) =>
        prev ? { ...prev, notes: [res.data, ...prev.notes] } : null,
      );
      setNoteText("");
    } else {
      toast.error("Erro ao salvar nota: " + res.error);
    }
  };

  const handleSaveLoyalty = async () => {
    if (!selectedCustomer) return;
    setSavingLoyalty(true);
    const res = await setCustomerLoyalty({
      data: {
        customerId: selectedCustomer.id,
        points: editPoints,
        tier: editTier as "bronze" | "silver" | "gold" | "platinum",
      },
    });
    setSavingLoyalty(false);
    if (res.success) {
      toast.success("Programa de fidelidade atualizado");
      const updated = { ...selectedCustomer, loyaltyPoints: editPoints, loyaltyTier: editTier };
      setSelectedCustomer(updated);
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setShowLoyaltyEdit(false);
    } else {
      toast.error("Erro: " + res.error);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesBlocked =
      blockedFilter === "all" ||
      (blockedFilter === "blocked" && c.blocked) ||
      (blockedFilter === "active" && !c.blocked);
    return matchesBlocked;
  });

  const blockedCount = customers.filter((c) => c.blocked).length;
  const totalCount = customers.length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString("pt-BR"); }
    catch { return dateStr; }
  };

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const nextTierPoints = NEXT_TIER_POINTS[selectedCustomer?.loyaltyTier ?? "bronze"] ?? 999999;
  const pointsToNext = nextTierPoints - (selectedCustomer?.loyaltyPoints ?? 0);
  const progressPct = selectedCustomer?.loyaltyTier === "platinum"
    ? 100
    : Math.min(100, ((selectedCustomer?.loyaltyPoints ?? 0) / nextTierPoints) * 100);

  const TABS: { id: Tab; label: string }[] = [
    { id: "dados", label: "Dados" },
    { id: "pedidos", label: "Pedidos" },
    { id: "enderecos", label: "Endereços" },
    { id: "loyalty", label: "Loyalty" },
    { id: "notas", label: "Notas" },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Gestão
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">Clientes</h1>
        <p className="text-[#51635F] mt-2">
          Gerencie clientes cadastrados — edite dados, bloqueie acesso e registre
          interações de suporte.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Total</p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{totalCount}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Bloqueados</p>
          <p className="font-serif text-2xl text-red-600">{blockedCount}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Ativos</p>
          <p className="font-serif text-2xl text-emerald-600">{totalCount - blockedCount}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Taxa de Bloqueio</p>
          <p className="font-serif text-2xl text-[#0F3A3E]">
            {totalCount > 0 ? ((blockedCount / totalCount) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 bg-[#F5F3EE] rounded-lg px-4 py-2">
            <Search className="h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#51635F]">Status:</span>
            <select
              value={blockedFilter}
              onChange={(e) => setBlockedFilter(e.target.value)}
              className="bg-[#F5F3EE] rounded-lg px-4 py-2 text-sm outline-none"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="blocked">Bloqueados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E9E1D2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E9E1D2] bg-[#F9F7F3]">
                <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Cliente
                </th>
                <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium hidden md:table-cell">
                  Email
                </th>
                <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium hidden lg:table-cell">
                  Cadastro
                </th>
                <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Status
                </th>
                <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium hidden lg:table-cell">
                  Nível
                </th>
                <th className="text-right p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8A938E]">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8A938E]">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              )}
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-[#E9E1D2] last:border-b-0 hover:bg-[#F9F7F3] transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium text-sm">
                        {(customer.name || customer.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn("font-medium", customer.blocked ? "text-red-600" : "text-[#0F3A3E]")}>
                            {customer.name || "—"}
                          </p>
                          {customer.isGuest && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              Guest
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8A938E] md:hidden">{customer.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-sm text-[#51635F]">{customer.email || "—"}</span>
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className="text-sm text-[#51635F]">{formatDate(customer.createdAt)}</span>
                  </td>
                  <td className="p-4">
                    {customer.isGuest ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Guest
                      </span>
                    ) : customer.blocked ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                        <Lock className="h-3 w-3" />
                        Bloqueado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        <Unlock className="h-3 w-3" />
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <TierBadge tier={customer.loyaltyTier} />
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openCustomer(customer)}
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href="/admin/sac"
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors inline-flex"
                        title="Ir para SAC"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end">
          <div
            className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-[#E9E1D2] px-6 py-4 z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-xl text-[#0F3A3E]">
                        {selectedCustomer.name || "Cliente sem nome"}
                      </h2>
                      {selectedCustomer.isGuest && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Guest
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#8A938E]">{selectedCustomer.email || "—"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 hover:bg-[#F3EEE3] rounded-lg shrink-0"
                >
                  <X className="h-5 w-5 text-[#51635F]" />
                </button>
              </div>

              {/* Tab bar — only for registered customers */}
              {!selectedCustomer.isGuest && (
                <div className="flex gap-1 border-b border-[#E9E1D2] -mb-4">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === tab.id
                          ? "border-[#B07B1E] text-[#B07B1E]"
                          : "border-transparent text-[#8A938E] hover:text-[#51635F]",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Guest banner */}
              {selectedCustomer.isGuest && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <UserX className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Comprador sem conta</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Este cliente fez checkout como convidado. Para editar dados,
                      bloqueá-lo ou gerenciar notas, é necessário primeiro criar
                      uma conta de acesso para ele na loja.
                    </p>
                  </div>
                </div>
              )}

              {/* Block status + actions — always visible above tabs */}
              {!selectedCustomer.isGuest && (
                <div className="flex items-center justify-between p-4 bg-[#F8F4EA] rounded-lg">
                  <div className="flex items-center gap-3">
                    {selectedCustomer.blocked ? (
                      <Lock className="h-5 w-5 text-red-600" />
                    ) : (
                      <Unlock className="h-5 w-5 text-emerald-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#0F3A3E]">
                        {selectedCustomer.blocked ? "Bloqueado" : "Ativo"}
                      </p>
                      {selectedCustomer.blockedReason && (
                        <p className="text-xs text-[#8A938E]">
                          Motivo: {selectedCustomer.blockedReason}
                        </p>
                      )}
                    </div>
                  </div>
                  {!showBlockConfirm ? (
                    <button
                      onClick={() => setShowBlockConfirm(true)}
                      className={cn(
                        "px-4 py-2 text-sm rounded-lg font-medium transition-colors",
                        selectedCustomer.blocked
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-red-50 text-red-700 hover:bg-red-100",
                      )}
                    >
                      {selectedCustomer.blocked ? "Desbloquear" : "Bloquear"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setShowBlockConfirm(false); setBlockReason(""); }}
                        className="px-3 py-2 text-sm border border-[#E9E1D2] rounded-lg hover:bg-[#F3EEE3]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleToggleBlock}
                        disabled={blocking}
                        className={cn(
                          "px-3 py-2 text-sm rounded-lg font-medium transition-colors",
                          selectedCustomer.blocked
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-red-600 text-white hover:bg-red-700",
                        )}
                      >
                        {blocking ? "Aguarde..." : "Confirmar"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!showBlockConfirm && !selectedCustomer.blocked && !selectedCustomer.isGuest && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Ao bloquear, o cliente não conseguirá fazer login na loja.
                  </p>
                </div>
              )}

              {showBlockConfirm && !selectedCustomer.blocked && !selectedCustomer.isGuest && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1.5">
                    Motivo do bloqueio (opcional)
                  </label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Ex: tentativa de fraude, solicitação do cliente..."
                    rows={2}
                    className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E] resize-none"
                  />
                </div>
              )}

              {/* ── TAB: DADOS ── */}
              {selectedCustomer.isGuest ? (
                <p className="text-sm text-[#8A938E] py-4">
                  Este cliente não possui dados de cadastro na plataforma.
                </p>
              ) : activeTab === "dados" ? (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3">
                    Dados do Cliente
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Nome</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Telefone</label>
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">CPF</label>
                        <input
                          value={editCpf}
                          onChange={(e) => setEditCpf(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">Nascimento</label>
                      <input
                        type="date"
                        value={editBirthDate}
                        onChange={(e) => setEditBirthDate(e.target.value)}
                        className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E]"
                      />
                    </div>
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#1a5054] disabled:opacity-50 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      {savingProfile ? "Salvando..." : "Salvar Dados"}
                    </button>
                  </div>
                </div>
              ) : null}

              {/* ── TAB: PEDIDOS ── */}
              {activeTab === "pedidos" && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Histórico de Pedidos
                  </h3>
                  {loadingDetail ? (
                    <p className="text-sm text-[#8A938E]">Carregando...</p>
                  ) : !detailData || detailData.orders.length === 0 ? (
                    <p className="text-sm text-[#8A938E]">Nenhum pedido encontrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {detailData.orders.map((order) => {
                        const cfg = STATUS_CONFIG[order.status] ?? {
                          label: order.status,
                          color: "text-gray-700",
                          bg: "bg-gray-50",
                        };
                        const isEditingAddress = editingOrderAddressId === order.id;
                        return (
                          <div key={order.id} className="p-4 bg-[#F8F4EA] rounded-lg space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <ShoppingBag className="h-4 w-4 text-[#8A938E]" />
                                <div>
                                  <p className="text-sm font-medium text-[#0F3A3E] font-mono">
                                    #{order.id.slice(0, 8).toUpperCase()}
                                  </p>
                                  <p className="text-xs text-[#8A938E]">{formatDate(order.createdAt)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={cn("text-xs px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                                  {cfg.label}
                                </span>
                                <p className="text-sm font-medium text-[#0F3A3E] mt-1">{formatPrice(order.total)}</p>
                              </div>
                            </div>

                            <div className="text-xs text-[#51635F] space-y-1">
                              <p>{order.customerName || "—"} · {order.customerEmail || "—"}</p>
                              <p>Tel: {order.customerPhone || "—"} · CPF: {order.customerCpf || "—"}</p>
                              <p>Pagamento: {order.paymentStatus || "—"}{order.trackingCode ? ` · Rastreio: ${order.trackingCode}` : ""}</p>
                            </div>

                            <div className="border-t border-[#E9E1D2] pt-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold">Endereço do pedido</p>
                                {!isEditingAddress && (
                                  <button
                                    onClick={() => startEditOrderAddress(order)}
                                    className="text-xs text-[#B07B1E] hover:underline"
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                              {isEditingAddress ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <input value={orderAddressForm.street} onChange={(e) => setOrderAddressForm((v) => ({ ...v, street: e.target.value }))} placeholder="Rua" className="col-span-2 px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                  <input value={orderAddressForm.number} onChange={(e) => setOrderAddressForm((v) => ({ ...v, number: e.target.value }))} placeholder="Número" className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                  <input value={orderAddressForm.complement} onChange={(e) => setOrderAddressForm((v) => ({ ...v, complement: e.target.value }))} placeholder="Complemento" className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                  <input value={orderAddressForm.neighborhood} onChange={(e) => setOrderAddressForm((v) => ({ ...v, neighborhood: e.target.value }))} placeholder="Bairro" className="col-span-2 px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                  <input value={orderAddressForm.city} onChange={(e) => setOrderAddressForm((v) => ({ ...v, city: e.target.value }))} placeholder="Cidade" className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                  <input value={orderAddressForm.state} onChange={(e) => setOrderAddressForm((v) => ({ ...v, state: e.target.value.toUpperCase() }))} placeholder="UF" maxLength={2} className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                  <input value={orderAddressForm.cep} onChange={(e) => setOrderAddressForm((v) => ({ ...v, cep: e.target.value }))} placeholder="CEP" className="col-span-2 px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                  <div className="col-span-2 flex gap-2">
                                    <button onClick={saveOrderAddress} disabled={savingOrderAddress} className="px-3 py-2 bg-[#0F3A3E] text-white text-sm rounded-lg disabled:opacity-50">{savingOrderAddress ? "Salvando..." : "Salvar endereço"}</button>
                                    <button onClick={() => setEditingOrderAddressId(null)} className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg">Cancelar</button>
                                  </div>
                                </div>
                              ) : order.shippingAddress ? (
                                <p className="text-sm text-[#51635F]">
                                  {order.shippingAddress.street}, {order.shippingAddress.number}{order.shippingAddress.complement ? ` — ${order.shippingAddress.complement}` : ""}<br />
                                  {order.shippingAddress.neighborhood} — {order.shippingAddress.city}/{order.shippingAddress.state}<br />
                                  CEP {order.shippingAddress.cep}
                                </p>
                              ) : (
                                <p className="text-sm text-amber-700">Endereço não salvo nesta compra.</p>
                              )}
                            </div>

                            {order.items.length > 0 && (
                              <div className="border-t border-[#E9E1D2] pt-3">
                                <p className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-1">Itens</p>
                                {order.items.map((item, index) => (
                                  <p key={`${item.name}-${index}`} className="text-xs text-[#51635F]">{item.quantity}x {item.name} · {formatPrice(item.price)}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <a href="/admin/pedidos" className="block text-center text-xs text-[#B07B1E] hover:underline pt-1">
                        Ver todos em Pedidos →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: ENDEREÇOS ── */}
              {activeTab === "enderecos" && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereços salvos na conta
                  </h3>
                  {loadingDetail ? (
                    <p className="text-sm text-[#8A938E]">Carregando...</p>
                  ) : !detailData || detailData.addresses.length === 0 ? (
                    <p className="text-sm text-[#8A938E]">
                      Este cliente não possui endereços salvos no livro de endereços.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {detailData.addresses.map((address) => {
                        const isEditing = editingAccountAddressId === address.id;
                        return (
                          <div key={address.id} className="p-4 bg-[#F8F4EA] rounded-lg space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-[#0F3A3E]">
                                {address.label || "Endereço"}
                                {address.isDefault && (
                                  <span className="ml-2 text-[10px] uppercase tracking-wider text-[#B07B1E]">Padrão</span>
                                )}
                              </p>
                              {!isEditing && (
                                <button
                                  onClick={() => startEditAccountAddress(address)}
                                  className="text-xs text-[#B07B1E] hover:underline"
                                >
                                  Editar
                                </button>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="grid grid-cols-2 gap-2">
                                <input value={accountAddressForm.recipientName} onChange={(e) => setAccountAddressForm((v) => ({ ...v, recipientName: e.target.value }))} placeholder="Nome do destinatário" className="col-span-2 px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <input value={accountAddressForm.street} onChange={(e) => setAccountAddressForm((v) => ({ ...v, street: e.target.value }))} placeholder="Rua" className="col-span-2 px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <input value={accountAddressForm.number} onChange={(e) => setAccountAddressForm((v) => ({ ...v, number: e.target.value }))} placeholder="Número" className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <input value={accountAddressForm.complement} onChange={(e) => setAccountAddressForm((v) => ({ ...v, complement: e.target.value }))} placeholder="Complemento" className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <input value={accountAddressForm.neighborhood} onChange={(e) => setAccountAddressForm((v) => ({ ...v, neighborhood: e.target.value }))} placeholder="Bairro" className="col-span-2 px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <input value={accountAddressForm.city} onChange={(e) => setAccountAddressForm((v) => ({ ...v, city: e.target.value }))} placeholder="Cidade" className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <input value={accountAddressForm.state} onChange={(e) => setAccountAddressForm((v) => ({ ...v, state: e.target.value.toUpperCase() }))} placeholder="UF" maxLength={2} className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <input value={accountAddressForm.cep} onChange={(e) => setAccountAddressForm((v) => ({ ...v, cep: e.target.value }))} placeholder="CEP" className="col-span-2 px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg" />
                                <div className="col-span-2 flex gap-2">
                                  <button onClick={saveAccountAddress} disabled={savingAccountAddress} className="px-3 py-2 bg-[#0F3A3E] text-white text-sm rounded-lg disabled:opacity-50">{savingAccountAddress ? "Salvando..." : "Salvar endereço"}</button>
                                  <button onClick={() => setEditingAccountAddressId(null)} className="px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg">Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-[#51635F]">
                                {address.recipientName}<br />
                                {address.street}, {address.number}{address.complement ? ` — ${address.complement}` : ""}<br />
                                {address.neighborhood} — {address.city}/{address.state}<br />
                                CEP {address.cep}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: LOYALTY ── */}
              {activeTab === "loyalty" && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Programa de Fidelidade
                  </h3>

                  {/* Points + Tier summary */}
                  <div className="flex items-center gap-4 p-4 bg-[#F8F4EA] rounded-lg mb-4">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-[#B07B1E]" />
                      <div>
                        <p className="text-xs text-[#8A938E] uppercase tracking-wider">Pontos</p>
                        <p className="font-serif text-xl text-[#0F3A3E]">
                          {selectedCustomer.loyaltyPoints.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="border-l border-[#E9E1D2] pl-4">
                      <p className="text-xs text-[#8A938E] uppercase tracking-wider">Nível</p>
                      <TierBadge tier={selectedCustomer.loyaltyTier} />
                    </div>
                  </div>

                  {/* Progress bar */}
                  {selectedCustomer.loyaltyTier !== "platinum" && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[#8A938E]">
                          {selectedCustomer.loyaltyPoints} / {nextTierPoints} pontos
                        </span>
                        <span className="text-xs text-[#8A938E]">
                          Faltam {Math.max(0, pointsToNext).toLocaleString("pt-BR")} para{" "}
                          {TIER_CONFIG[selectedCustomer.loyaltyTier === "bronze" ? "silver" : selectedCustomer.loyaltyTier === "silver" ? "gold" : "platinum"]?.label}
                        </span>
                      </div>
                      <div className="h-2 bg-[#E9E1D2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B07B1E] rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Edit loyalty */}
                  {showLoyaltyEdit ? (
                    <div className="space-y-3 p-4 border border-[#E9E1D2] rounded-lg">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                          Pontos
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={editPoints}
                          onChange={(e) => setEditPoints(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                          Nível
                        </label>
                        <select
                          value={editTier}
                          onChange={(e) => setEditTier(e.target.value)}
                          className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E]"
                        >
                          <option value="bronze">Bronze</option>
                          <option value="silver">Prata</option>
                          <option value="gold">Ouro</option>
                          <option value="platinum">Diamante</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveLoyalty}
                          disabled={savingLoyalty}
                          className="flex items-center gap-2 px-4 py-2 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#1a5054] disabled:opacity-50 transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          {savingLoyalty ? "Salvando..." : "Salvar"}
                        </button>
                        <button
                          onClick={() => { setShowLoyaltyEdit(false); setEditPoints(selectedCustomer.loyaltyPoints); setEditTier(selectedCustomer.loyaltyTier); }}
                          className="px-4 py-2 border border-[#E9E1D2] text-sm rounded-lg hover:bg-[#F3EEE3]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLoyaltyEdit(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#1a5054] transition-colors"
                    >
                      <Star className="h-4 w-4" />
                      Ajustar Pontos / Nível
                    </button>
                  )}
                </div>
              )}

              {/* ── TAB: NOTAS ── */}
              {activeTab === "notas" && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-[#51635F] font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notas Internas
                  </h3>
                  <div className="mb-4">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Registre uma interação, observação ou solicitação..."
                      rows={3}
                      className="w-full px-3 py-2 border border-[#E9E1D2] text-sm rounded-lg focus:outline-none focus:border-[#B07B1E] resize-none"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={savingNote || !noteText.trim()}
                      className="mt-2 flex items-center gap-2 px-4 py-2 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#1a5054] disabled:opacity-50 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      {savingNote ? "Salvando..." : "Adicionar Nota"}
                    </button>
                  </div>
                  {loadingDetail ? null : !detailData || detailData.notes.length === 0 ? (
                    <p className="text-sm text-[#8A938E]">Nenhuma nota registrada.</p>
                  ) : (
                    <div className="space-y-3">
                      {detailData.notes.map((note) => (
                        <div key={note.id} className="p-3 bg-[#F9F7F3] border border-[#E9E1D2] rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] uppercase tracking-wider text-[#8A938E] font-medium">
                              {note.adminEmail || "Admin"}
                            </span>
                            <span className="text-[10px] text-[#8A938E] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(note.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-[#51635F] whitespace-pre-wrap">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SAC link */}
              <div>
                <a
                  href="/admin/sac"
                  className="flex items-center gap-3 p-4 border border-[#E9E1D2] rounded-lg hover:bg-[#F9F7F3] transition-colors"
                >
                  <MessageSquare className="h-5 w-5 text-[#B07B1E]" />
                  <div>
                    <p className="text-sm font-medium text-[#0F3A3E]">Abrir conversa no SAC</p>
                    <p className="text-xs text-[#8A938E]">
                      Verifique se há conversas abertas com este cliente no WhatsApp.
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClientes;