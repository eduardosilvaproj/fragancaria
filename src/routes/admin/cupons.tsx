import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cupons")({
  component: AdminCupons,
});

// Mock data
const MOCK_COUPONS = [
  {
    id: "1",
    code: "BEMVINDO10",
    description: "10% de desconto na primeira compra",
    discount_type: "percentage",
    discount_value: 10,
    minimum_order_value: 100,
    maximum_discount: 50,
    usage_limit: null,
    usage_count: 156,
    starts_at: "2024-01-01",
    expires_at: "2024-12-31",
    is_active: true,
    first_purchase_only: true,
  },
  {
    id: "2",
    code: "FRETEGRATIS",
    description: "Frete grátis em compras acima de R$ 150",
    discount_type: "free_shipping",
    discount_value: 0,
    minimum_order_value: 150,
    maximum_discount: null,
    usage_limit: 500,
    usage_count: 234,
    starts_at: "2024-01-01",
    expires_at: "2024-06-30",
    is_active: true,
    first_purchase_only: false,
  },
  {
    id: "3",
    code: "VERAO50",
    description: "R$ 50 de desconto em compras acima de R$ 300",
    discount_type: "fixed_amount",
    discount_value: 50,
    minimum_order_value: 300,
    maximum_discount: null,
    usage_limit: 100,
    usage_count: 98,
    starts_at: "2024-01-01",
    expires_at: "2024-02-29",
    is_active: false,
    first_purchase_only: false,
  },
  {
    id: "4",
    code: "BLACK30",
    description: "30% de desconto - Black Friday",
    discount_type: "percentage",
    discount_value: 30,
    minimum_order_value: 200,
    maximum_discount: 150,
    usage_limit: 1000,
    usage_count: 0,
    starts_at: "2024-11-25",
    expires_at: "2024-11-30",
    is_active: true,
    first_purchase_only: false,
  },
];

function AdminCupons() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  const filteredCoupons = MOCK_COUPONS.filter(
    (coupon) =>
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Código ${code} copiado!`);
  };

  const getDiscountDisplay = (coupon: any) => {
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
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const stats = {
    total: MOCK_COUPONS.length,
    active: MOCK_COUPONS.filter((c) => c.is_active && !isExpired(c.expires_at)).length,
    totalUses: MOCK_COUPONS.reduce((sum, c) => sum + c.usage_count, 0),
  };

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
          onClick={() => {
            setEditingCoupon(null);
            setShowModal(true);
          }}
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
          <p className="font-serif text-2xl text-[#0F3A3E]">{stats.total}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ativos
          </p>
          <p className="font-serif text-2xl text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total de Usos
          </p>
          <p className="font-serif text-2xl text-[#B07B1E]">{stats.totalUses}</p>
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
            <p className="text-sm text-[#51635F] mb-4">{coupon.description}</p>

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
                onClick={() => {
                  setEditingCoupon(coupon);
                  setShowModal(true);
                }}
                className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
              >
                <Edit className="h-4 w-4 text-[#51635F]" />
              </button>
              <button className="p-2 hover:bg-red-50 rounded transition-colors">
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E9E1D2]">
              <h2 className="font-serif text-xl text-[#0F3A3E]">
                {editingCoupon ? "Editar Cupom" : "Novo Cupom"}
              </h2>
            </div>

            <form className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Código do Cupom
                </label>
                <input
                  type="text"
                  placeholder="Ex: DESCONTO20"
                  defaultValue={editingCoupon?.code}
                  className="w-full px-4 py-2 border border-[#E9E1D2] text-sm uppercase focus:outline-none focus:border-[#B07B1E]"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Descrição do cupom"
                  defaultValue={editingCoupon?.description}
                  className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#8A938E] mb-1">
                    Tipo de Desconto
                  </label>
                  <select
                    defaultValue={editingCoupon?.discount_type || "percentage"}
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
                    defaultValue={editingCoupon?.discount_value}
                    className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#8A938E] mb-1">
                    Pedido Mínimo (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    defaultValue={editingCoupon?.minimum_order_value}
                    className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8A938E] mb-1">
                    Desconto Máximo (R$)
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    defaultValue={editingCoupon?.maximum_discount}
                    className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#8A938E] mb-1">
                    Data Início
                  </label>
                  <input
                    type="date"
                    defaultValue={editingCoupon?.starts_at}
                    className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#8A938E] mb-1">
                    Data Fim
                  </label>
                  <input
                    type="date"
                    defaultValue={editingCoupon?.expires_at}
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
                  defaultValue={editingCoupon?.usage_limit}
                  className="w-full px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={editingCoupon?.first_purchase_only}
                    className="rounded border-[#E9E1D2]"
                  />
                  <span className="text-sm text-[#51635F]">
                    Apenas para primeira compra
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={editingCoupon?.is_active ?? true}
                    className="rounded border-[#E9E1D2]"
                  />
                  <span className="text-sm text-[#51635F]">Cupom ativo</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors"
                >
                  {editingCoupon ? "Salvar Alterações" : "Criar Cupom"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCupons;
