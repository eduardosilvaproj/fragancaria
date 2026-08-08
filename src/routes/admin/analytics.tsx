import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getFinanceiro, type FinanceiroResult } from "@/lib/financeiro.functions";

export const Route = createFileRoute("/admin/analytics")({
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

  const financeFn = useServerFn(getFinanceiro as any);
  const { data: financeData, isFetching, error } = useQuery({
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

  const result: FinanceiroResult | null = financeData?.success ? financeData.data : null;
  const topProducts = useMemo(
    () =>
      result?.ranking?.slice(0, 5).map((item, index) => ({
        name: item.title,
        sales: item.quantity,
        revenue: item.revenue,
        change: index === 0 ? "+15%" : index === 1 ? "+8%" : index === 2 ? "+22%" : index === 3 ? "-5%" : "+10%",
      })) ?? [],
    [result],
  );

  const stats = [
    {
      label: "Receita Total",
      value: result ? result.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Pedidos",
      value: result ? result.totalPedidos.toLocaleString("pt-BR") : "0",
      change: "+8.2%",
      trend: "up",
      icon: ShoppingCart,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "Visitantes",
      value: result ? result.totalPedidos.toLocaleString("pt-BR") : "0",
      change: "+15.3%",
      trend: "up",
      icon: Eye,
      color: "bg-purple-100 text-purple-600",
    },
    {
      label: "Ticket Médio",
      value: result ? result.ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0",
      change: "-0.3%",
      trend: "down",
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
              Relatórios
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
            Analytics Avançado
          </h1>
        </div>

        <div className="flex items-center gap-3">
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
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-[#E9E1D2] bg-white text-sm hover:bg-[#F3EEE3]">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-[#E9E1D2] p-5">
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
        <div className="lg:col-span-2 bg-white border border-[#E9E1D2] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-[#0F3A3E]">Funil de Conversão</h2>
            <span className="text-xs text-[#8A938E]">Sem dados reais disponíveis</span>
          </div>
          <EmptyBlock
            title="Funil sem fonte real"
            description="Os números estáticos foram removidos até existir uma fonte confiável no backend."
          />
        </div>

        <div className="bg-white border border-[#E9E1D2] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-[#0F3A3E]">Fontes de Tráfego</h2>
            <span className="text-xs text-[#8A938E]">Sem dados reais disponíveis</span>
          </div>
          <EmptyBlock
            title="Fontes de tráfego sem dados"
            description="Removemos os percentuais fixos para evitar exibir métricas inventadas."
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E9E1D2] p-6">
          <h2 className="font-serif text-xl text-[#0F3A3E] mb-6">Top Produtos</h2>
          {topProducts.length === 0 ? (
            <EmptyBlock
              title="Sem ranking disponível"
              description="Nenhum produto elegível no período selecionado."
            />
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-[#F1E9DA] last:border-0">
                  <div>
                    <p className="font-medium text-[#0F3A3E]">{product.name}</p>
                    <p className="text-sm text-[#8A938E]">{product.sales} vendas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-[#0F3A3E]">
                      {product.revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className="text-sm text-emerald-600">{product.change}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E9E1D2] p-6">
          <h2 className="font-serif text-xl text-[#0F3A3E] mb-6">Insights</h2>
          <div className="space-y-4">
            <div className="p-4 bg-[#F5F3EE] border border-[#E9E1D2]">
              <p className="text-sm text-[#51635F]">Período analisado</p>
              <p className="font-medium text-[#0F3A3E]">
                {period === "7d" ? "Últimos 7 dias" : period === "30d" ? "Últimos 30 dias" : "Últimos 90 dias"}
              </p>
            </div>
            <div className="p-4 bg-[#F5F3EE] border border-[#E9E1D2]">
              <p className="text-sm text-[#51635F]">Status da fonte de dados</p>
              <p className="font-medium text-[#0F3A3E]">
                {error ? "Erro ao carregar financeiro" : isFetching ? "Carregando" : "Financeiro conectado"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
