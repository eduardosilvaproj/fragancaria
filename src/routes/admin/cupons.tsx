import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Calendar,
  Users,
  Percent,
  DollarSign,
  Truck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  type Coupon,
} from "@/lib/coupons.functions";

export const Route = createFileRoute("/admin/cupons")({
  component: AdminCupons,
});

function AdminCupons() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Partial<Coupon> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Query: lista de cupons
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listCouponsFn = useServerFn(listCoupons as any);
  const { data: queryResult, refetch } = useQuery({
    queryKey: ["admin-coupons"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => listCouponsFn({ activeOnly: false } as any),
    refetchOnWindowFocus: false,
  });

  const coupons: Coupon[] = queryResult?.success ? queryResult.data : [];
  const isLoading = queryResult === undefined;

  // Mutation: criar / atualizar
  const saveMutation = useServerFn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (args: any) =>
      args.data?.id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? updateCoupon(args as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : createCoupon(args as any)
  );

  // Mutation: desativar
  const deactivateMutation = useServerFn(deactivateCoupon);

  const filteredCoupons = useMemo(
    () =>
      coupons.filter(
        (c) =>
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [coupons, searchQuery]
  );

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length;
    const totalUses = coupons.reduce((s, c) => s + c.usage_count, 0);
    return { total: coupons.length, active, totalUses };
  }, [coupons]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };

  const handleOpenCreate = () => {
    setEditingCoupon({
      discount_type: "percentage",
      discount_value: 0,
      is_active: true,
      first_purchase_only: false,
      minimum_order_value: null,
      maximum_discount: null,
      usage_limit: null,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon({ ...coupon });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await deactivateCoupon({ id } as any);
    if (result?.success) {
      toast.success("Cupom desativado");
      refetch();
    } else {
      toast.error(result?.error || "Erro ao desativar cupom");
    }
  };

  const getDiscountDisplay = (coupon: Partial<Coupon>) => {
    switch (coupon.discount_type) {
      case "percentage":
        return (
          <div className="flex items-center gap-1.5">
            <Percent className="h-4 w-4 text-[#B07B1E]" />
            <span>{coupon.discount_value}%</span>
          </div>
        );
      case "fixed_amount":
        return (
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-[#B07B1E]" />
            <span>R$ {coupon.discount_value}</span>
          </div>
        );
      case "free_shipping":
        return (
          <div className="flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-[#B07B1E]" />
            <span>Frete Grátis</span>
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const isExpired = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isSaving = false;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tag className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Promoções
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Cupons de Desconto</h1>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Cupom
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total de Cupons
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{isLoading ? "—" : stats.total}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ativos
          </p>
          <p className="font-serif text-2xl text-emerald-600">{isLoading ? "—" : stats.active}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total de Usos
          </p>
          <p className="font-serif text-2xl text-[#B07B1E]">{isLoading ? "—" : stats.totalUses}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
          <input
            type="text"
            placeholder="Buscar por código ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
          />
        </div>
      </div>

      {/* Coupons Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#B07B1E]" />
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="text-center py-16 text-[#8A938E]">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Nenhum cupom encontrado</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filteredCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className={cn(
                "bg-white border border-[#E9E1D2] p-6 relative",
                !coupon.is_active || isExpired(coupon.expires_at) ? "opacity-60" : ""
              )}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {coupon.is_active && !isExpired(coupon.expires_at) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                    <CheckCircle className="h-3 w-3" />
                    Ativo
                  </span>
                ) : isExpired(coupon.expires_at) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Expirado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                    <XCircle className="h-3 w-3" />
                    Inativo
                  </span>
                )}
              </div>

              {/* Code */}
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#F8F4EA] px-4 py-2 border-2 border-dashed border-[#E9E1D2]">
                  <code className="font-mono text-lg font-bold text-[#0F3A3E]">
                    {coupon.code}
                  </code>
                </div>
                <button
                  onClick={() => copyCode(coupon.code)}
                  className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
                  title="Copiar código"
                >
                  <Copy className="h-4 w-4 text-[#51635F]" />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-[#51635F] mb-4">{coupon.description || "—"}</p>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                    Desconto
                  </p>
                  <div className="font-medium text-[#0F3A3E]">
                    {getDiscountDisplay(coupon)}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                    Pedido mínimo
                  </p>
                  <p className="font-medium text-[#0F3A3E]">
                    {coupon.minimum_order_value
                      ? `R$ ${coupon.minimum_order_value}`
                      : "Sem mínimo"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                    Usos
                  </p>
                  <p className="font-medium text-[#0F3A3E]">
                    {coupon.usage_count}
                    {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                    Validade
                  </p>
                  <div className="flex items-center gap-1 font-medium text-[#0F3A3E]">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(coupon.expires_at)}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#E9E1D2]">
                {coupon.first_purchase_only && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[#F8F4EA] text-[#B07B1E]">
                    <Users className="h-3 w-3" />
                    Primeira compra
                  </span>
                )}
                {coupon.maximum_discount && (
                  <span className="px-2 py-1 text-xs bg-[#F8F4EA] text-[#51635F]">
                    Máx: R$ {coupon.maximum_discount}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  onClick={() => handleOpenEdit(coupon)}
                  className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
                >
                  <Edit className="h-4 w-4 text-[#51635F]" />
                </button>
                {confirmDelete === coupon.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(coupon.id)}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {showModal && editingCoupon && (
        <CouponModal
          coupon={editingCoupon}
          isSaving={isSaving}
          onSave={async (formData: Record<string, unknown>) => {
            const isEditing = !!editingCoupon.id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = isEditing
              ? await saveMutation({ data: { id: editingCoupon.id!, ...formData } })
              : await saveMutation({ data: formData });

            if (result?.success) {
              toast.success(isEditing ? "Cupom atualizado" : "Cupom criado");
              setShowModal(false);
              refetch();
            } else {
              toast.error(result?.error || "Erro ao salvar cupom");
            }
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Subcomponente: modal de formulário
function CouponModal({
  coupon,
  isSaving,
  onSave,
  onClose,
}: {
  coupon: Partial<Coupon>;
  isSaving: boolean;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    code: coupon.code || "",
    description: coupon.description || "",
    discountType: coupon.discount_type || "percentage",
    discountValue: coupon.discount_value ?? 0,
    minimumOrderValue: coupon.minimum_order_value ?? "",
    maximumDiscount: coupon.maximum_discount ?? "",
    startsAt: coupon.starts_at ? String(coupon.starts_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
    expiresAt: coupon.expires_at ? String(coupon.expires_at).slice(0, 10) : "",
    usageLimit: coupon.usage_limit ?? "",
    firstPurchaseOnly: coupon.first_purchase_only ?? false,
    isActive: coupon.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Código é obrigatório";
    if (form.discountType !== "free_shipping" && (!form.discountValue || form.discountValue <= 0)) {
      e.discountValue = "Valor do desconto é obrigatório";
    }
    if (form.discountType === "percentage" && form.discountValue > 100) {
      e.discountValue = "Porcentagem não pode ser maior que 100";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave({
      code: form.code,
      description: form.description || undefined,
      discountType: form.discountType as "percentage" | "fixed_amount" | "free_shipping",
      discountValue: form.discountValue,
      minimumOrderValue: form.minimumOrderValue ? Number(form.minimumOrderValue) : null,
      maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      firstPurchaseOnly: form.firstPurchaseOnly,
      isActive: form.isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#E9E1D2]">
          <h2 className="font-serif text-xl text-[#0F3A3E]">
            {coupon.id ? "Editar Cupom" : "Novo Cupom"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Código do Cupom</label>
            <input
              type="text"
              placeholder="Ex: DESCONTO20"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className={cn(
                "w-full px-4 py-2 border text-sm uppercase focus:outline-none focus:border-[#B07B1E]",
                errors.code ? "border-red-500" : "border-[#E9E1D2]"
              )}
            />
            {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Descrição</label>
            <input
              type="text"
              placeholder="Descrição do cupom"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Tipo de Desconto</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed_amount" | "free_shipping" })}
                className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              >
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed_amount">Valor Fixo (R$)</option>
                <option value="free_shipping">Frete Grátis</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">
                Valor do Desconto
              </label>
              <input
                type="number"
                placeholder="10"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                disabled={form.discountType === "free_shipping"}
                className={cn(
                  "w-full px-4 py-2 border text-sm focus:outline-none focus:border-[#B07B1E]",
                  errors.discountValue ? "border-red-500" : "border-[#E9E1D2]",
                  form.discountType === "free_shipping" ? "bg-gray-100" : ""
                )}
              />
              {errors.discountValue && (
                <p className="text-xs text-red-500 mt-1">{errors.discountValue}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Pedido Mínimo (R$)</label>
              <input
                type="number"
                placeholder="100"
                value={form.minimumOrderValue}
                onChange={(e) => setForm({ ...form, minimumOrderValue: e.target.value })}
                className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Desconto Máximo (R$)</label>
              <input
                type="number"
                placeholder="50"
                value={form.maximumDiscount}
                onChange={(e) => setForm({ ...form, maximumDiscount: e.target.value })}
                className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Data Início</label>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Data Fim</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8A938E] mb-1">
              Limite de Usos (deixe vazio para ilimitado)
            </label>
            <input
              type="number"
              placeholder="100"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.firstPurchaseOnly}
                onChange={(e) => setForm({ ...form, firstPurchaseOnly: e.target.checked })}
                className="rounded border-[#E9E1D2]"
              />
              <span className="text-sm text-[#51635F]">Apenas para primeira compra</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-[#E9E1D2]"
              />
              <span className="text-sm text-[#51635F]">Cupom ativo</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {coupon.id ? "Salvar Alterações" : "Criar Cupom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Fim
