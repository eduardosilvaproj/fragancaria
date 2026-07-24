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
  Link2,
  MousePointerClick,
  CreditCard,
  BarChart3,
  Layers,
  Calendar,
  Hash,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listAffiliates, type AdminAffiliateRow } from "@/lib/affiliates-admin.functions";
import type { AffiliateFullDetails } from "@/lib/affiliates-admin.functions";

export const Route = createFileRoute("/admin/afiliados")({
  loader: async () => {
    const result = await listAffiliates();
    return { affiliates: result.data, error: result.error ?? null };
  },
  component: AdminAfiliados,
});

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Ativo", color: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "Suspenso", color: "bg-red-100 text-red-700" },
  rejected: { label: "Rejeitado", color: "bg-gray-100 text-gray-700" },
};

function statusConfigFor(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700" };
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function DetailModal({
  details,
  onClose,
}: {
  details: AffiliateFullDetails;
  onClose: () => void;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCode = (code: string, i: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 overflow-y-auto bg-black/40">
      <div className="relative w-full max-w-3xl mx-4 bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-[#E9E1D2] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium">
              {details.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="font-serif text-xl text-[#0F3A3E]">{details.full_name}</h2>
              <p className="text-sm text-[#8A938E]">{details.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3EEE3] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-[#51635F]" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Status + Código */}
          <div className="flex flex-wrap items-center gap-4">
            <span
              className={cn(
                "inline-block px-3 py-1 rounded-full text-xs font-medium",
                statusConfigFor(details.status).color
              )}
            >
              {statusConfigFor(details.status).label}
            </span>
            {details.affiliate_code && (
              <span className="flex items-center gap-1.5 text-sm text-[#51635F] bg-[#F5F3EE] px-3 py-1 rounded-full">
                <Hash className="h-3.5 w-3.5" />
                {details.affiliate_code}
              </span>
            )}
          </div>

          {/* Grid: Dados Cadastrais + Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dados Cadastrais */}
            <SectionCard icon={Users} title="Dados Cadastrais">
              <Field label="Nome" value={details.full_name} />
              <Field label="E-mail" value={details.email} />
              <Field label="Telefone" value={details.phone ?? "—"} />
              <Field label="CPF" value={details.cpf ?? "—"} />
              <Field label="Nascimento" value={details.birth_date ? formatDate(details.birth_date) : "—"} />
              <Field label="Instagram" value={details.instagram ? `@${details.instagram}` : "—"} />
              <Field label="YouTube" value={details.youtube ?? "—"} />
              <Field label="TikTok" value={details.tiktok ? `@${details.tiktok}` : "—"} />
              <Field label="Site" value={details.website ?? "—"} />
              {details.address_city && (
                <Field
                  label="Endereço"
                  value={[
                    details.address_street,
                    details.address_number,
                    details.address_complement,
                    details.address_neighborhood,
                    details.address_city,
                    details.address_state,
                    details.address_zip,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                />
              )}
            </SectionCard>

            {/* Pagamento */}
            <SectionCard icon={CreditCard} title="Dados de Pagamento">
              <Field label="Tipo de Chave" value={details.pix_key_type ?? "—"} />
              <Field label="Chave Pix" value={details.pix_key ?? "—"} />
              <Field label="Comissão Personalizada" value={details.custom_commission_rate ? `${details.custom_commission_rate}%` : "Padrão (não definida)"} />
            </SectionCard>
          </div>

          {/* Datas */}
          <SectionCard icon={Calendar} title="Datas">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Cadastro" value={formatDate(details.created_at)} />
              <Field label="Aprovação" value={formatDate(details.approved_at)} />
              <Field label="Aceite dos Termos" value={formatDate(details.accepted_terms_at)} />
            </div>
          </SectionCard>

          {/* Links */}
          <SectionCard icon={Link2} title="Links de Indicação">
            {details.links.length === 0 ? (
              <EmptyState message="Nenhum link gerado ainda." />
            ) : (
              <div className="space-y-2">
                {details.links.map((link, i) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-3 bg-[#F9F7F3] px-4 py-3 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[#0F3A3E] font-medium truncate">{link.url}</p>
                      <p className="text-[#8A938E] text-xs">
                        Código: {link.code} · {link.clicks_count} cliques · Criado em {formatDate(link.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => copyCode(link.code, i)}
                      className="p-1.5 text-[#51635F] hover:text-[#B07B1E] transition-colors shrink-0"
                      title="Copiar código"
                    >
                      {copiedIndex === i ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Cliques */}
          <SectionCard icon={MousePointerClick} title="Cliques Recentes">
            {details.clicks.length === 0 ? (
              <EmptyState message="Nenhum clique registrado ainda." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E9E1D2] text-[11px] uppercase tracking-wider text-[#8A938E]">
                      <th className="text-left pb-2 font-medium">Data</th>
                      <th className="text-left pb-2 font-medium">Link</th>
                      <th className="text-left pb-2 font-medium">Referrer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.clicks.slice(0, 20).map((click) => (
                      <tr key={click.id} className="border-b border-[#E9E1D2]/50">
                        <td className="py-2 text-[#51635F]">{formatDate(click.clicked_at)}</td>
                        <td className="py-2 text-[#0F3A3E]">{click.link_id.substring(0, 8)}…</td>
                        <td className="py-2 text-[#8A938E]">{click.referrer ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Placeholders vazios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectionCard icon={BarChart3} title="Vendas">
              <EmptyState message="Nenhuma venda atribuída ainda. A atribuição será implementada em breve." />
            </SectionCard>
            <SectionCard icon={DollarSign} title="Comissões">
              <EmptyState message="Nenhuma comissão gerada ainda." />
            </SectionCard>
            <SectionCard icon={CreditCard} title="Pagamentos">
              <EmptyState message="Nenhum pagamento realizado ainda." />
            </SectionCard>
            <SectionCard icon={Layers} title="Histórico de Nível">
              <EmptyState message="Nenhuma alteração de nível registrada ainda." />
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#E9E1D2]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E9E1D2] bg-[#F9F7F3]">
        <Icon className="h-4 w-4 text-[#B07B1E]" />
        <span className="text-[11px] uppercase tracking-[0.1em] text-[#51635F] font-medium">
          {title}
        </span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <span className="text-[11px] uppercase tracking-wider text-[#8A938E] block">{label}</span>
      <span className="text-sm text-[#0F3A3E]">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-[#8A938E]">{message}</p>
    </div>
  );
}

function AdminAfiliados() {
  const { affiliates, error } = Route.useLoaderData() as {
    affiliates: AdminAffiliateRow[];
    error: string | null;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modalDetails, setModalDetails] = useState<AffiliateFullDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  const handleApprove = async (affiliateId: string) => {
    if (!confirm("Tem certeza que deseja aprovar este afiliado?")) return;
    try {
      const { approveAffiliate } = await import(
        "@/lib/affiliates-admin.functions"
      );
      const result = await approveAffiliate({ data: { affiliateId } });
      if (result.success) {
        alert("Afiliado aprovado com sucesso!");
        window.location.reload();
      } else {
        alert(`Erro ao aprovar: ${result.error}`);
      }
    } catch {
      alert("Erro ao aprovar afiliado");
    }
  };

  const handleReject = async (affiliateId: string) => {
    if (!confirm("Tem certeza que deseja rejeitar este afiliado?")) return;
    try {
      const { rejectAffiliate } = await import(
        "@/lib/affiliates-admin.functions"
      );
      const result = await rejectAffiliate({ data: { affiliateId } });
      if (result.success) {
        alert("Afiliado rejeitado com sucesso!");
        window.location.reload();
      } else {
        alert(`Erro ao rejeitar: ${result.error}`);
      }
    } catch {
      alert("Erro ao rejeitar afiliado");
    }
  };

  const handleSuspend = async (affiliateId: string) => {
    if (!confirm("Tem certeza que deseja suspender este afiliado?")) return;
    try {
      const { suspendAffiliate } = await import(
        "@/lib/affiliates-admin.functions"
      );
      const result = await suspendAffiliate({ data: { affiliateId } });
      if (result.success) {
        alert("Afiliado suspenso com sucesso!");
        window.location.reload();
      } else {
        alert(`Erro ao suspender: ${result.error}`);
      }
    } catch {
      alert("Erro ao suspender afiliado");
    }
  };

  const handleViewDetails = async (affiliateId: string) => {
    setModalLoading(true);
    try {
      const { getAffiliateDetails } = await import(
        "@/lib/affiliates-admin.functions"
      );
      const result = await getAffiliateDetails({ data: { affiliateId } });
      if (result.success) {
        setModalDetails(result.data as AffiliateFullDetails);
      } else {
        alert(`Erro ao buscar detalhes: ${result.error}`);
      }
    } catch {
      alert("Erro ao buscar detalhes do afiliado");
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendEmail = (email: string) => {
    window.open(`mailto:${email}`, "_blank");
  };

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
                            onClick={() => handleApprove(affiliate.id)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Aprovar afiliado"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(affiliate.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rejeitar afiliado"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {affiliate.status === "active" && (
                        <button
                          onClick={() => handleSuspend(affiliate.id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Suspender afiliado"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(affiliate.id)}
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        {modalLoading ? (
                          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[#51635F] border-t-transparent" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSendEmail(affiliate.email)}
                        className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg transition-colors"
                        title="Enviar email"
                      >
                        <Mail className="h-4 w-4" />
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

      {/* Detail Modal */}
      {modalDetails && (
        <DetailModal details={modalDetails} onClose={() => setModalDetails(null)} />
      )}
    </div>
  );
}

export default AdminAfiliados;
