import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFinanceiro, type FinanceiroResult } from "@/lib/financeiro.functions";
import {
  getMarketingSnapshot,
  exportMarketingData,
  requestMarketingHqSync,
  getTrafficSources,
  getProductMetrics,
  getDailySales,
} from "@/lib/marketing-hq.functions";

export const Route = createFileRoute("/admin/analytics")({
  loader: async () => {
    // Pré-carregar snapshot inicial no servidor para satisfazer o TanStack Start
    try {
      const res = await getMarketingSnapshot({ data: { period: "30d" } });
      return { initialSnapshot: res.success ? res.data : null };
    } catch {
      return { initialSnapshot: null };
    }
  },
  component: AdminAnalytics,
});

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-dashed border-[#E9E1D2] bg-white p-8 text-center text-sm text-[#8A938E]">
      <p className="font-medium text-[#51635F] mb-1">{title}</p>
      <p>{description}</p>
    </div>
  );
}

function AdminAnalytics() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json">("csv");
  const [exportDataType, setExportDataType] = useState<"products" | "sales" | "funnel" | "metrics" | "traffic" | "all">("all");
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const financeFn = useServerFn(getFinanceiro as any);
  const { data: financeData, isFetching: isFinanceFetching } = useQuery({
    queryKey: ["admin-analytics", period],
    queryFn: () => {
      const now = new Date();
      const to = now.toISOString().slice(0, 10);
      const start = new Date(now);
      start.setDate(now.getDate() - (period === "7d" ? 7 : period === "30d" ? 30 : 90));
      const from = start.toISOString().slice(0, 10);
      return financeFn({ dateFrom: from, dateTo: to } as any);
    },
    refetchOnWindowFocus: false,
  });

  // Marketing HQ Snapshot
  const marketingSnapshotFn = useServerFn(getMarketingSnapshot as any);
  const { data: marketingData, isFetching: isMarketingFetching } = useQuery({
    queryKey: ["marketing-snapshot", period],
    queryFn: () => marketingSnapshotFn({ data: { period } }),
    refetchOnWindowFocus: false,
  });

  // Traffic Sources
  const trafficSourcesFn = useServerFn(getTrafficSources as any);
  const { data: trafficData } = useQuery({
    queryKey: ["marketing-traffic", period],
    queryFn: () => trafficSourcesFn({ data: { period } }),
    refetchOnWindowFocus: false,
  });

  // Product Metrics
  const productMetricsFn = useServerFn(getProductMetrics as any);
  const { data: productMetricsData } = useQuery({
    queryKey: ["marketing-products", period],
    queryFn: () => productMetricsFn({ data: { period } }),
    refetchOnWindowFocus: false,
  });

  // Export Mutation
  const exportMutationFn = useServerFn(exportMarketingData as any);
  const exportMutation = useMutation({
    mutationFn: () => exportMutationFn({
      data: {
        period,
        format: exportFormat,
        dataType: exportDataType,
      }
    }),
    onSuccess: (result: any) => {
      if (result.success && result.data) {
        setExportSuccess(`Arquivo ${result.data.filename} gerado com sucesso!`);
        setTimeout(() => setExportSuccess(null), 5000);
      }
    },
  });

  // Sync Mutation
  const syncMutationFn = useServerFn(requestMarketingHqSync as any);
  const syncMutation = useMutation({
    mutationFn: () => syncMutationFn({ data: undefined }),
    onSuccess: (result: any) => {
      if (result.success) {
        alert("Sincronização com Marketing HQ solicitada com sucesso!");
      }
    },
  });

  const result: FinanceiroResult | null = financeData?.success ? financeData.data : null;
  const snapshot = marketingData?.success ? marketingData.data : null;
  const trafficSources = trafficData?.success ? trafficData.data : [];
  const productMetrics = productMetricsData?.success ? productMetricsData.data : [];

  const topProducts = useMemo(
    () =>
      productMetrics?.slice(0, 5).map((item: any, index: number) => ({
        name: item.product_name || `Produto ${index + 1}`,
        sales: item.purchases || 0,
        revenue: item.revenue || 0,
        change: "+10%",
      })) ?? [],
    [productMetrics],
  );

  const stats = [
    {
      label: "Receita Total",
      value: snapshot ? Number(snapshot.revenue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Pedidos / Compras",
      value: snapshot ? Number(snapshot.purchases || 0).toLocaleString("pt-BR") : "0",
      change: "+8.2%",
      trend: "up",
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Sessões / Visitantes",
      value: snapshot ? Number(snapshot.sessions || 0).toLocaleString("pt-BR") : "0",
      change: "+15.3%",
      trend: "up",
      icon: Eye,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Taxa de Conversão",
      value: snapshot ? `${Number(snapshot.conversion || 0).toFixed(2)}%` : "0%",
      change: "+0.3%",
      trend: "up",
      icon: TrendingUp,
      color: "bg-amber-100 text-amber-600",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Relatórios & Marketing HQ
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
            Analytics Avançado & Marketing HQ
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-[#F5F3EE] rounded-lg p-1">
            {[
              { value: "7d", label: "7 dias" },
              { value: "30d", label: "30 dias" },
              { value: "90d", label: "90 dias" },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as any)}
                className={cn(
                  "px-4 py-2 text-sm rounded-md transition-colors",
                  period === p.value ? "bg-white text-[#0F3A3E] shadow-sm" : "text-[#51635F] hover:text-[#0F3A3E]",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#E9E1D2] bg-white text-sm hover:bg-[#F3EEE3] rounded-md text-[#0F3A3E]"
          >
            <Download className="h-4 w-4" />
            Exportar para Marketing HQ
          </button>

          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0F3A3E] text-white text-sm hover:bg-[#154d52] rounded-md transition-colors disabled:opacity-50"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sincronizar Marketing HQ
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">{exportSuccess}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-[#E9E1D2] p-5 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium inline-flex items-center gap-1",
                  stat.trend === "up" ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {stat.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">{stat.label}</p>
            <p className="font-serif text-2xl text-[#0F3A3E]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-[#E9E1D2] p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-[#0F3A3E]">Funil de Conversão (Website Intelligence)</h2>
            <span className="text-xs text-[#8A938E]">
              {snapshot?.generated_at ? `Atualizado em: ${new Date(snapshot.generated_at).toLocaleString('pt-BR')}` : 'Dados em tempo real'}
            </span>
          </div>

          {snapshot ? (
            <div className="space-y-4">
              {[
                { label: "Sessões / Visitantes", value: snapshot.sessions || 0, max: snapshot.sessions || 1, color: "bg-purple-500" },
                { label: "Visualizações de Produto", value: snapshot.product_views || 0, max: snapshot.sessions || 1, color: "bg-blue-500" },
                { label: "Adições ao Carrinho", value: snapshot.add_to_cart || 0, max: snapshot.sessions || 1, color: "bg-amber-500" },
                { label: "Inícios de Checkout", value: snapshot.checkout_started || 0, max: snapshot.sessions || 1, color: "bg-indigo-500" },
                { label: "Compras Concluídas", value: snapshot.purchases || 0, max: snapshot.sessions || 1, color: "bg-emerald-500" },
              ].map((step, idx) => {
                const percentage = step.max > 0 ? Math.min(100, Math.max(5, (step.value / step.max) * 100)) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-[#0F3A3E]">{step.label}</span>
                      <span className="font-bold text-[#0F3A3E]">{Number(step.value).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-[#F5F3EE] h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${step.color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyBlock
              title="Sem dados de funil disponíveis"
              description="Nenhum evento registrado no período selecionado."
            />
          )}
        </div>

        <div className="bg-white border border-[#E9E1D2] p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-[#0F3A3E]">Fontes de Tráfego</h2>
            <span className="text-xs text-[#8A938E]">Normalizado</span>
          </div>

          {trafficSources && trafficSources.length > 0 ? (
            <div className="space-y-4">
              {trafficSources.slice(0, 5).map((source: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-[#F1E9DA] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#B07B1E]"></span>
                    <span className="font-medium text-[#0F3A3E] uppercase text-xs tracking-wider">{source.source}</span>
                    <span className="text-xs text-[#8A938E]">({source.medium || 'direct'})</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm text-[#0F3A3E]">{source.sessions} sessões</p>
                    <p className="text-xs text-emerald-600">
                      {Number(source.revenue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyBlock
              title="Sem fontes registradas"
              description="As UTMs serão exibidas aqui conforme o tráfego chegar."
            />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E9E1D2] p-6 rounded-lg shadow-sm">
          <h2 className="font-serif text-xl text-[#0F3A3E] mb-6">Top Produtos (Marketing HQ)</h2>
          {topProducts.length === 0 ? (
            <EmptyBlock
              title="Sem ranking disponível"
              description="Nenhum produto com vendas ou visualizações no período."
            />
          ) : (
            <div className="space-y-4">
              {topProducts.map((product: Record<string, unknown>, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-[#F1E9DA] last:border-0">
                  <div>
                    <p className="font-medium text-[#0F3A3E]">{String(product.name ?? "")}</p>
                    <p className="text-sm text-[#8A938E]">{String(product.sales ?? 0)} vendas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[#0F3A3E]">
                      {Number(product.revenue ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className="text-sm text-emerald-600">{String(product.change ?? "")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E9E1D2] p-6 rounded-lg shadow-sm">
          <h2 className="font-serif text-xl text-[#0F3A3E] mb-6">Contrato & Integração HQ</h2>
          <div className="space-y-4">
            <div className="p-4 bg-[#F5F3EE] border border-[#E9E1D2] rounded-lg">
              <p className="text-sm font-medium text-[#0F3A3E] mb-1">Status do Contrato de Dados</p>
              <p className="text-xs text-[#51635F]">
                Arquitetura <span className="font-semibold">SITE → SUPABASE → MARKETING HQ</span> ativa. Views e RPCs prontas para consumo seguro pelo HQ.
              </p>
            </div>
            <div className="p-4 bg-[#F5F3EE] border border-[#E9E1D2] rounded-lg">
              <p className="text-sm font-medium text-[#0F3A3E] mb-1">Endpoints e Views Ativas</p>
              <ul className="text-xs text-[#51635F] space-y-1 mt-2">
                <li>• <code className="bg-white px-1 py-0.5 rounded border border-[#E9E1D2]">hq_website_summary</code></li>
                <li>• <code className="bg-white px-1 py-0.5 rounded border border-[#E9E1D2]">hq_product_metrics</code></li>
                <li>• <code className="bg-white px-1 py-0.5 rounded border border-[#E9E1D2]">hq_sales_daily</code></li>
                <li>• <code className="bg-white px-1 py-0.5 rounded border border-[#E9E1D2]">hq_traffic_sources</code></li>
                <li>• <code className="bg-white px-1 py-0.5 rounded border border-[#E9E1D2]">get_marketing_hq_snapshot</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Exportação */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E9E1D2] rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="font-serif text-2xl text-[#0F3A3E] mb-4">Exportar Dados para Marketing HQ</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8A938E] mb-1">Período</label>
                <div className="text-sm font-medium text-[#0F3A3E] bg-[#F5F3EE] p-2.5 rounded border border-[#E9E1D2]">
                  {period === "7d" ? "Últimos 7 dias" : period === "30d" ? "Últimos 30 dias" : "Últimos 90 dias"}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8A938E] mb-1">Formato</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["csv", "xlsx", "json"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={cn(
                        "py-2 text-sm uppercase rounded border font-medium transition-colors",
                        exportFormat === fmt ? "bg-[#0F3A3E] text-white border-[#0F3A3E]" : "bg-white text-[#51635F] border-[#E9E1D2] hover:bg-[#F5F3EE]"
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8A938E] mb-1">Tipo de Dados</label>
                <select
                  value={exportDataType}
                  onChange={(e) => setExportDataType(e.target.value as any)}
                  className="w-full bg-white border border-[#E9E1D2] p-2.5 rounded text-sm text-[#0F3A3E]"
                >
                  <option value="all">Todos os Dados (Completo)</option>
                  <option value="products">Produtos</option>
                  <option value="sales">Vendas</option>
                  <option value="funnel">Funil de Conversão</option>
                  <option value="metrics">Métricas Diárias</option>
                  <option value="traffic">Fontes de Tráfego</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-[#E9E1D2] text-sm text-[#51635F] hover:bg-[#F5F3EE] rounded"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  exportMutation.mutate();
                  setIsExportModalOpen(false);
                }}
                disabled={exportMutation.isPending}
                className="px-4 py-2 bg-[#0F3A3E] text-white text-sm hover:bg-[#154d52] rounded flex items-center gap-2 disabled:opacity-50"
              >
                {exportMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Exportar Dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
