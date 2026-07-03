import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Mail,
  Clock,
  DollarSign,
  TrendingUp,
  UserPlus,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listAffiliates, type AdminAffiliateRow } from "@/lib/affiliates-admin.functions";

export const Route = createFileRoute("/admin/afiliados")({
  loader: async () => {
    const result = await listAffiliates();
    return { affiliates: result.data, error: result.error ?? null };
  },
  component: AdminAfiliados,
});

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Ativo", color: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "Suspenso", color: "bg-red-100 text-red-700" },
  rejected: { label: "Rejeitado", color: "bg-gray-100 text-gray-700" },
};

function statusConfigFor(status: string) {
  return (
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
      label: status,
      color: "bg-gray-100 text-gray-700",
    }
  );
}

function AdminAfiliados() {
  const { affiliates, error } = Route.useLoaderData() as {
    affiliates: AdminAffiliateRow[];
    error: string | null;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredAffiliates = useMemo(
    () =>
      affiliates.filter((affiliate) => {
        const matchesSearch =
          affiliate.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          affiliate.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || affiliate.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [affiliates, searchQuery, statusFilter],
  );

  const pendingCount = affiliates.filter((a) => a.status === "pending").length;
  const activeCount = affiliates.filter((a) => a.status === "approved").length;
  const totalSales = affiliates.reduce((sum, a) => sum + a.total_sales, 0);
  const totalCommissions = affiliates.reduce((sum, a) => sum + a.total_commission, 0);

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
          Acompanhe cadastros, vendas e comissões dos seus afiliados.
        </p>
      </div>

      {/* Read-only notice */}
      <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <span className="font-medium">Modo somente leitura.</span> Aprovar,
          rejeitar e suspender afiliados ficam desabilitados até o painel
          administrativo ter autenticação. Os dados abaixo são reais (Supabase).
        </div>
      </div>

      {/* Load error */}
      {error && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <X className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            Erro ao carregar afiliados: {error}
          </div>
        </div>
      )}

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
                        statusConfigFor(affiliate.status).color
                      )}
                    >
                      {statusConfigFor(affiliate.status).label}
                    </span>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <span className="text-sm text-[#51635F]">{affiliate.instagram ?? "—"}</span>
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
                            disabled
                            className="p-2 text-emerald-600 rounded-lg opacity-40 cursor-not-allowed"
                            title="Aprovar (requer autenticação admin)"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            disabled
                            className="p-2 text-red-600 rounded-lg opacity-40 cursor-not-allowed"
                            title="Rejeitar (requer autenticação admin)"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        disabled
                        className="p-2 text-[#51635F] rounded-lg opacity-40 cursor-not-allowed"
                        title="Ver detalhes (em breve)"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={`mailto:${affiliate.email}`}
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors inline-flex"
                        title="Enviar email"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
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
