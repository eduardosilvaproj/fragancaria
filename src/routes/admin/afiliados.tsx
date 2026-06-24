import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Check,
  X,
  Eye,
  Mail,
  Clock,
  DollarSign,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/afiliados")({
  component: AdminAfiliados,
});

// Mock data
const MOCK_AFFILIATES = [
  {
    id: "1",
    full_name: "Maria Silva",
    email: "maria@email.com",
    phone: "(11) 99999-1234",
    status: "pending",
    created_at: "2024-01-15",
    instagram: "@mariasilva",
    total_sales: 0,
    total_commission: 0,
  },
  {
    id: "2",
    full_name: "João Santos",
    email: "joao@email.com",
    phone: "(21) 98888-5678",
    status: "active",
    created_at: "2024-01-10",
    instagram: "@joaosantos",
    total_sales: 15420,
    total_commission: 1234,
  },
  {
    id: "3",
    full_name: "Ana Costa",
    email: "ana@email.com",
    phone: "(31) 97777-9012",
    status: "active",
    created_at: "2024-01-05",
    instagram: "@anacosta",
    total_sales: 8750,
    total_commission: 700,
  },
  {
    id: "4",
    full_name: "Pedro Lima",
    email: "pedro@email.com",
    phone: "(41) 96666-3456",
    status: "suspended",
    created_at: "2024-01-01",
    instagram: "@pedrolima",
    total_sales: 2300,
    total_commission: 184,
  },
  {
    id: "5",
    full_name: "Carla Oliveira",
    email: "carla@email.com",
    phone: "(51) 95555-7890",
    status: "pending",
    created_at: "2024-01-18",
    instagram: "@carlaoliveira",
    total_sales: 0,
    total_commission: 0,
  },
];

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  active: { label: "Ativo", color: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "Suspenso", color: "bg-red-100 text-red-700" },
  rejected: { label: "Rejeitado", color: "bg-gray-100 text-gray-700" },
};

function AdminAfiliados() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);

  const filteredAffiliates = MOCK_AFFILIATES.filter((affiliate) => {
    const matchesSearch =
      affiliate.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      affiliate.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || affiliate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = MOCK_AFFILIATES.filter((a) => a.status === "pending").length;
  const activeCount = MOCK_AFFILIATES.filter((a) => a.status === "active").length;
  const totalSales = MOCK_AFFILIATES.reduce((sum, a) => sum + a.total_sales, 0);
  const totalCommissions = MOCK_AFFILIATES.reduce((sum, a) => sum + a.total_commission, 0);

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Gestão
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">Afiliados</h1>
        <p className="text-[#51635F] mt-2">
          Gerencie seus afiliados, aprove cadastros e acompanhe comissões.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pendentes
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{pendingCount}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ativos
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{activeCount}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Vendas Total
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{formatCurrency(totalSales)}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Comissões
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{formatCurrency(totalCommissions)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#8A938E]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#F5F3EE] rounded-lg px-4 py-2 text-sm outline-none"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="active">Ativos</option>
              <option value="suspended">Suspensos</option>
              <option value="rejected">Rejeitados</option>
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
                  Afiliado
                </th>
                <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Status
                </th>
                <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium hidden md:table-cell">
                  Instagram
                </th>
                <th className="text-right p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium hidden lg:table-cell">
                  Vendas
                </th>
                <th className="text-right p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium hidden lg:table-cell">
                  Comissão
                </th>
                <th className="text-right p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAffiliates.map((affiliate) => (
                <tr
                  key={affiliate.id}
                  className="border-b border-[#E9E1D2] last:border-b-0 hover:bg-[#F9F7F3] transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium">
                        {affiliate.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-[#0F3A3E]">{affiliate.full_name}</p>
                        <p className="text-sm text-[#8A938E]">{affiliate.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-block px-3 py-1 rounded-full text-xs font-medium",
                        STATUS_CONFIG[affiliate.status as keyof typeof STATUS_CONFIG].color
                      )}
                    >
                      {STATUS_CONFIG[affiliate.status as keyof typeof STATUS_CONFIG].label}
                    </span>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-sm text-[#51635F]">{affiliate.instagram}</span>
                  </td>
                  <td className="p-4 text-right hidden lg:table-cell">
                    <span className="font-medium text-[#0F3A3E]">
                      {formatCurrency(affiliate.total_sales)}
                    </span>
                  </td>
                  <td className="p-4 text-right hidden lg:table-cell">
                    <span className="text-emerald-600 font-medium">
                      {formatCurrency(affiliate.total_commission)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {affiliate.status === "pending" && (
                        <>
                          <button
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Aprovar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rejeitar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors"
                        title="Enviar email"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors"
                        title="Mais opções"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAffiliates.length === 0 && (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-[#E9E1D2] mx-auto mb-4" />
            <p className="text-[#8A938E]">Nenhum afiliado encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAfiliados;
