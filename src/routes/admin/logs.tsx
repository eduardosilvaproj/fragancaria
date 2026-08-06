import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Filter,
  X,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listAdminActionLogs, type AuditLogRow, type ListAuditLogsResult, type ListAuditLogsInput } from "@/lib/admin-audit";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

const ACTION_OPTIONS = [
  { value: "", label: "Todas as ações" },
  { value: "product.create", label: "Criar produto" },
  { value: "product.update", label: "Atualizar produto" },
  { value: "product.delete", label: "Excluir produto" },
  { value: "product.activate", label: "Ativar produto" },
  { value: "product.deactivate", label: "Desativar produto" },
  { value: "product.margin.apply", label: "Margem global" },
  { value: "order.update", label: "Atualizar pedido" },
  { value: "refund.approve", label: "Aprovar reembolso" },
  { value: "refund.reject", label: "Rejeitar reembolso" },
  { value: "coupon.create", label: "Criar cupom" },
  { value: "coupon.update", label: "Atualizar cupom" },
  { value: "coupon.deactivate", label: "Desativar cupom" },
  { value: "affiliate.approve", label: "Aprovar afiliado" },
  { value: "affiliate.reject", label: "Rejeitar afiliado" },
  { value: "affiliate.suspend", label: "Suspender afiliado" },
  { value: "store_settings.update", label: "Config. loja" },
  { value: "shipping_settings.update", label: "Config. frete" },
  { value: "payment_settings.update", label: "Config. pagamento" },
  { value: "nfe_settings.update", label: "Config. NF-e" },
];

const ACTION_LABEL: Record<string, string> = {};
for (const opt of ACTION_OPTIONS) {
  if (opt.value) ACTION_LABEL[opt.value] = opt.label;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionBadgeColor(action: string): string {
  if (action.startsWith("product.create") || action.startsWith("coupon.create"))
    return "bg-green-100 text-green-800 border-green-200";
  if (action.startsWith("product.delete")) return "bg-red-100 text-red-800 border-red-200";
  if (action.endsWith(".deactivate") || action.endsWith(".reject") || action.endsWith(".suspend"))
    return "bg-orange-100 text-orange-800 border-orange-200";
  if (action.endsWith(".approve") || action.endsWith(".activate"))
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function entityBadgeColor(entity: string): string {
  const colors: Record<string, string> = {
    product: "bg-purple-100 text-purple-800 border-purple-200",
    order: "bg-cyan-100 text-cyan-800 border-cyan-200",
    coupon: "bg-pink-100 text-pink-800 border-pink-200",
    affiliate: "bg-indigo-100 text-indigo-800 border-indigo-200",
    refund: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return colors[entity] || "bg-gray-100 text-gray-800 border-gray-200";
}

function JsonView({ data, label }: { data: unknown; label: string }) {
  if (data === null || data === undefined) {
    return <span className="text-[#8A938E] italic">vazio</span>;
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-[#8A938E] font-medium">{label}</p>
        <div className="bg-[#F5F3EE] rounded p-2 font-mono text-[11px] leading-relaxed overflow-x-auto">
          {JSON.stringify(data)}
        </div>
      </div>
    );
  }

  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length === 0) {
    return <span className="text-[#8A938E] italic">vazio</span>;
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-[#8A938E] font-medium">{label}</p>
      <div className="bg-[#F5F3EE] rounded p-2 font-mono text-[11px] leading-relaxed overflow-x-auto">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="text-[#B07B1E] shrink-0">{key}:</span>
            <span className="text-[#1C302E] break-all">
              {typeof value === "object" && value !== null
                ? JSON.stringify(value)
                : String(value ?? "null")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogRow({ log }: { log: AuditLogRow }) {
  const [expanded, setExpanded] = useState(false);
  const batchId: string | null = log.metadata
    ? (((log.metadata as Record<string, unknown>).batch_id as string | null) ?? null)
    : null;

  return (
    <div className="border-b border-[#E9E1D2] last:border-0">
      {/* Linha principal (sempre visível) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F3EEE3]/50 transition-colors text-left"
      >
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-[#8A938E]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#8A938E]" />
          )}
        </div>

        {/* Quem */}
        <div
          className="w-36 truncate text-sm text-[#1C302E]"
          title={log.admin_email ?? log.user_id}
        >
          {log.admin_email || log.user_id.slice(0, 8) + "..."}
        </div>

        {/* Ação */}
        <div className="w-32 shrink-0">
          <span
            className={cn(
              "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
              actionBadgeColor(log.action),
            )}
          >
            {ACTION_LABEL[log.action] || log.action}
          </span>
        </div>

        {/* Entidade */}
        <div className="w-28 shrink-0 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border",
              entityBadgeColor(log.entity_type),
            )}
          >
            {log.entity_type}
          </span>
          {log.entity_id && (
            <span
              className="text-[11px] text-[#51635F] truncate max-w-[100px]"
              title={log.entity_id}
            >
              {log.entity_id}
            </span>
          )}
        </div>

        {/* Batch indicator */}
        {batchId && (
          <div className="shrink-0" title={`Batch: ${batchId}`}>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
              lote
            </span>
          </div>
        )}

        {/* Data */}
        <div className="ml-auto shrink-0 text-xs text-[#51635F]">
          {formatDateShort(log.created_at)}
        </div>
      </button>

      {/* Conteúdo expansível */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <div className="flex gap-2 text-xs text-[#51635F]">
            <span>ID: {String(log.id)}</span>
            <span>•</span>
            <span>Usuário: {log.user_id}</span>
            {log.entity_id && (
              <>
                <span>•</span>
                <span>Entidade ID: {log.entity_id}</span>
              </>
            )}
            {batchId && (
              <>
                <span>•</span>
                <span>Batch: {String(batchId)}</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <JsonView data={log.before_data} label="Antes" />
            <JsonView data={log.after_data} label="Depois" />
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLogs() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const listLogsFn = useServerFn(listAdminActionLogs);

  const { data: queryResult, isFetching } = useQuery({
    queryKey: ["admin-audit-logs", page, actionFilter, dateFrom, dateTo],
    queryFn: () =>
      listLogsFn({
        page,
        pageSize: 50,
        action: actionFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      } as ListAuditLogsInput),
    refetchOnWindowFocus: false,
  });

  const result: ListAuditLogsResult | null = queryResult?.success ? queryResult.data : null;
  const logs: AuditLogRow[] = result?.rows ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  const hasActiveFilters = actionFilter || dateFrom || dateTo;

  const clearFilters = useCallback(() => {
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }, []);

  // Agrupa logs consecutivos com o mesmo batch_id
  const groupedLogs = useMemo(() => {
    const groups: { batchId: string | null; logs: AuditLogRow[] }[] = [];
    let currentBatch: string | null = null;
    let currentGroup: AuditLogRow[] = [];

    for (const log of logs) {
      const batchId = log.metadata
        ? ((log.metadata as Record<string, unknown>).batch_id as string | null)
        : null;

      if (batchId !== currentBatch && currentGroup.length > 0) {
        groups.push({ batchId: currentBatch, logs: currentGroup });
        currentGroup = [];
      }
      currentBatch = batchId;
      currentGroup.push(log);
    }
    if (currentGroup.length > 0) {
      groups.push({ batchId: currentBatch, logs: currentGroup });
    }
    return groups;
  }, [logs]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F3A3E] font-serif">Logs de Auditoria</h1>
          <p className="text-sm text-[#51635F] mt-1">Histórico de ações administrativas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm border transition-colors",
              hasActiveFilters
                ? "bg-[#0F3A3E] text-white border-[#0F3A3E]"
                : "border-[#E9E1D2] text-[#51635F] hover:bg-[#F3EEE3]",
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-[#E8C25A]" />}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-[#51635F] hover:text-red-600 border border-[#E9E1D2] hover:border-red-200 transition-colors"
            >
              <X className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white border border-[#E9E1D2] p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por ação */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-medium mb-1.5">
                Tipo de ação
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white focus:outline-none focus:border-[#B07B1E]"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por data início */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-medium mb-1.5">
                Data início
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E] pointer-events-none" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                />
              </div>
            </div>

            {/* Filtro por data fim */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#51635F] font-medium mb-1.5">
                Data fim
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E] pointer-events-none" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isFetching && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#B07B1E]" />
        </div>
      )}

      {/* Tabela de logs */}
      {!isFetching && (
        <div className="bg-white border border-[#E9E1D2]">
          {/* Cabeçalho da tabela */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-[#E9E1D2] bg-[#F5F3EE] text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
            <div className="w-4" />
            <div className="w-36">Admin</div>
            <div className="w-32">Ação</div>
            <div className="w-28">Entidade</div>
            <div className="ml-auto">Data</div>
          </div>

          {/* Linhas */}
          {groupedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#8A938E]">
              <History className="h-10 w-10 mb-3" />
              <p className="text-sm">Nenhum log encontrado</p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-xs text-[#B07B1E] hover:underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div>
              {groupedLogs.map((group, gi) => (
                <div key={gi}>
                  {/* Cabeçalho de grupo (batch) */}
                  {group.batchId && group.logs.length > 1 && (
                    <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 text-[11px] text-amber-800 flex items-center gap-2">
                      <span className="font-medium">Operação em lote</span>
                      <span className="text-amber-600">•</span>
                      <span>{group.logs.length} registros</span>
                      <span className="text-amber-600">•</span>
                      <span className="font-mono text-[10px]">
                        batch: {group.batchId.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                  {group.logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#51635F]">
            {total} registro(s) — Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                // Mostra páginas ao redor da atual
                let pageNum: number;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (page <= 4) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-8 h-8 text-sm border transition-colors",
                      pageNum === page
                        ? "bg-[#0F3A3E] text-white border-[#0F3A3E]"
                        : "border-[#E9E1D2] text-[#51635F] hover:bg-[#F3EEE3]",
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLogs;
