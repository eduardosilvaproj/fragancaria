import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

const STATS = [
  {
    label: "Receita Total",
    value: "R$ 45.230",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    label: "Pedidos",
    value: "324",
    change: "+8.2%",
    trend: "up",
    icon: ShoppingCart,
    color: "bg-blue-100 text-blue-600",
  },
  {
    label: "Visitantes",
    value: "12.4K",
    change: "+15.3%",
    trend: "up",
    icon: Eye,
    color: "bg-purple-100 text-purple-600",
  },
  {
    label: "Taxa de Conversão",
    value: "2.6%",
    change: "-0.3%",
    trend: "down",
    icon: TrendingUp,
    color: "bg-amber-100 text-amber-600",
  },
];

const TOP_PRODUCTS = [
  { name: "Kit Loiro Perfeito", sales: 89, revenue: 8900, change: "+15%" },
  { name: "Máscara Kérastase", sales: 67, revenue: 6700, change: "+8%" },
  { name: "Shampoo Wella", sales: 54, revenue: 2700, change: "+22%" },
  { name: "Coloração L'Oréal", sales: 48, revenue: 2400, change: "-5%" },
  { name: "Leave-in Sebastian", sales: 42, revenue: 3360, change: "+10%" },
];

const TRAFFIC_SOURCES = [
  { source: "Google Orgânico", visits: 4820, percentage: 38.9 },
  { source: "Instagram", visits: 2940, percentage: 23.7 },
  { source: "Direto", visits: 2100, percentage: 16.9 },
  { source: "Facebook Ads", visits: 1560, percentage: 12.6 },
  { source: "Google Ads", visits: 980, percentage: 7.9 },
];

const FUNNEL_DATA = [
  { stage: "Visitantes", count: 12400, percentage: 100 },
  { stage: "Visualizaram Produto", count: 6820, percentage: 55 },
  { stage: "Adicionaram ao Carrinho", count: 1860, percentage: 15 },
  { stage: "Iniciaram Checkout", count: 892, percentage: 7.2 },
  { stage: "Compraram", count: 324, percentage: 2.6 },
];

function AdminAnalytics() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Relatórios
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
            Analytics Avançado
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
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
                  period === p.value
                    ? "bg-white text-[#0F3A3E] shadow-sm"
                    : "text-[#51635F] hover:text-[#0F3A3E]"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 bg-[#0F3A3E] text-white px-4 py-2 rounded-lg text-sm">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white border border-[#E9E1D2] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  stat.trend === "up" ? "text-emerald-600" : "text-red-500"
                )}
              >
                {stat.trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {stat.change}
              </div>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
              {stat.label}
            </p>
            <p className="font-serif text-2xl text-[#0F3A3E]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Chart Placeholder */}
        <div className="bg-white border border-[#E9E1D2] p-6">
          <h3 className="font-serif text-lg text-[#0F3A3E] mb-4">Vendas por Dia</h3>
          <div className="h-64 bg-[#F9F7F3] rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-[#E9E1D2] mx-auto mb-2" />
              <p className="text-sm text-[#8A938E]">Gráfico de vendas</p>
              <p className="text-xs text-[#8A938E]">(integração com biblioteca de gráficos)</p>
            </div>
          </div>
        </div>

        {/* Funnel */}
        <div className="bg-white border border-[#E9E1D2] p-6">
          <h3 className="font-serif text-lg text-[#0F3A3E] mb-4">Funil de Conversão</h3>
          <div className="space-y-3">
            {FUNNEL_DATA.map((item, index) => (
              <div key={item.stage}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#51635F]">{item.stage}</span>
                  <span className="text-sm font-medium text-[#0F3A3E]">
                    {item.count.toLocaleString()} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-8 bg-[#F5F3EE] rounded overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0F3A3E] to-[#1a5a5e] transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2]">
            <h3 className="font-serif text-lg text-[#0F3A3E]">Produtos Mais Vendidos</h3>
          </div>
          <div className="divide-y divide-[#E9E1D2]">
            {TOP_PRODUCTS.map((product, index) => (
              <div key={product.name} className="p-4 flex items-center gap-4">
                <div className="w-8 h-8 bg-[#F5F3EE] rounded-lg flex items-center justify-center text-sm font-medium text-[#8A938E]">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#0F3A3E] truncate">{product.name}</p>
                  <p className="text-xs text-[#8A938E]">{product.sales} vendas</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[#0F3A3E]">
                    {product.revenue.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      product.change.startsWith("+") ? "text-emerald-600" : "text-red-500"
                    )}
                  >
                    {product.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2]">
            <h3 className="font-serif text-lg text-[#0F3A3E]">Fontes de Tráfego</h3>
          </div>
          <div className="divide-y divide-[#E9E1D2]">
            {TRAFFIC_SOURCES.map((source) => (
              <div key={source.source} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#51635F]">{source.source}</span>
                  <span className="text-sm font-medium text-[#0F3A3E]">
                    {source.visits.toLocaleString()} ({source.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-[#F5F3EE] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B07B1E] rounded-full transition-all duration-500"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAnalytics;
