import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  Link as LinkIcon,
  ShoppingBag,
  DollarSign,
  Eye,
  Copy,
  ArrowUpRight,
  Calendar,
} from "lucide-react";
import { useAffiliateStore } from "@/stores/affiliateStore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { linkService } from "@/lib/supabase";

export const Route = createFileRoute("/afiliado/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { affiliate, dashboardSummary, loadDashboard, loadSales, sales, tiers } = useAffiliateStore();
  const [mainLinkUrl, setMainLinkUrl] = useState("");

  useEffect(() => {
    loadDashboard();
    loadSales(1);
  }, [loadDashboard, loadSales]);

  useEffect(() => {
    if (affiliate?.affiliate_code) {
      setMainLinkUrl(linkService.generateLinkUrl(affiliate.affiliate_code));
    }
  }, [affiliate]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(mainLinkUrl);
    toast.success("Link copiado!");
  };

  const stats = [
    {
      label: "Vendas do Mês",
      value: formatCurrency(dashboardSummary?.current_month_sales || 0),
      icon: ShoppingBag,
      color: "#0F3A3E",
      trend: null,
    },
    {
      label: "Comissão a Receber",
      value: formatCurrency(dashboardSummary?.pending_commission || 0),
      icon: DollarSign,
      color: "#1C6B4A",
      trend: null,
    },
    {
      label: "Total de Cliques",
      value: (dashboardSummary?.total_clicks || 0).toLocaleString("pt-BR"),
      icon: Eye,
      color: "#B07B1E",
      trend: null,
    },
    {
      label: "Links Ativos",
      value: dashboardSummary?.active_links_count || 0,
      icon: LinkIcon,
      color: "#0F3A3E",
      trend: null,
    },
  ];

  // Get next tier info
  const currentTierIndex = tiers.findIndex((t) => t.name === dashboardSummary?.tier_name);
  const nextTier = currentTierIndex >= 0 && currentTierIndex < tiers.length - 1
    ? tiers[currentTierIndex + 1]
    : null;

  const progressToNextTier = nextTier
    ? Math.min(100, ((dashboardSummary?.current_month_sales || 0) / nextTier.min_sales_amount) * 100)
    : 100;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E]">
          Olá, {affiliate?.full_name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-[14px] text-[#75827E] mt-1">
          Confira o resumo da sua performance como afiliado.
        </p>
      </div>

      {/* Quick Link Copy */}
      <div className="bg-white border border-[#E9E1D2] p-4 md:p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.1em] text-[#B07B1E] mb-1">
              Seu link principal
            </p>
            <p className="text-[14px] text-[#51635F]">
              Compartilhe este link para ganhar comissão em qualquer produto
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 md:flex-none bg-[#F3EEE3] px-4 py-2.5 border border-[#E0D8C7] text-[13px] text-[#51635F] truncate max-w-[300px]">
              {mainLinkUrl || "Carregando..."}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] text-white px-4 py-2.5 text-[12px] uppercase tracking-[0.1em] transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white border border-[#E9E1D2] p-4 md:p-6"
          >
            <div className="flex items-start justify-between">
              <div
                className="w-10 h-10 flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
              {stat.trend !== null && (
                <div
                  className={`flex items-center gap-1 text-[12px] ${
                    stat.trend >= 0 ? "text-[#1C6B4A]" : "text-[#C4433A]"
                  }`}
                >
                  {stat.trend >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(stat.trend)}%
                </div>
              )}
            </div>
            <p className="font-serif text-[22px] md:text-[28px] text-[#0F3A3E] mt-3">
              {stat.value}
            </p>
            <p className="text-[11px] uppercase tracking-[0.1em] text-[#75827E] mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white border border-[#E9E1D2]">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#E9E1D2]">
            <h2 className="font-serif text-[18px] text-[#0F3A3E]">Vendas Recentes</h2>
            <Link
              to="/afiliado/dashboard/vendas"
              className="text-[12px] text-[#B07B1E] hover:underline flex items-center gap-1"
            >
              Ver todas
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-4 md:p-6">
            {sales.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="h-10 w-10 text-[#E0D8C7] mx-auto mb-3" />
                <p className="text-[14px] text-[#75827E]">Nenhuma venda ainda</p>
                <p className="text-[12px] text-[#8A938E] mt-1">
                  Compartilhe seu link e comece a ganhar!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sales.slice(0, 5).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between py-3 border-b border-[#F3EEE3] last:border-0"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-[#0F3A3E]">
                        Pedido #{sale.order_number}
                      </p>
                      <p className="text-[11px] text-[#75827E] flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-medium text-[#1C6B4A]">
                        +{formatCurrency(sale.commission_amount)}
                      </p>
                      <p
                        className={`text-[10px] uppercase tracking-[0.1em] mt-0.5 ${
                          sale.status === "paid"
                            ? "text-[#1C6B4A]"
                            : sale.status === "confirmed"
                            ? "text-[#B07B1E]"
                            : sale.status === "cancelled"
                            ? "text-[#C4433A]"
                            : "text-[#75827E]"
                        }`}
                      >
                        {sale.status === "paid"
                          ? "Pago"
                          : sale.status === "confirmed"
                          ? "Confirmado"
                          : sale.status === "cancelled"
                          ? "Cancelado"
                          : "Pendente"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tier Progress */}
        <div className="bg-white border border-[#E9E1D2]">
          <div className="p-4 md:p-6 border-b border-[#E9E1D2]">
            <h2 className="font-serif text-[18px] text-[#0F3A3E]">Seu Nível</h2>
          </div>

          <div className="p-4 md:p-6">
            {/* Current Tier */}
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 mx-auto flex items-center justify-center text-3xl mb-3"
                style={{
                  backgroundColor: `${dashboardSummary?.tier_color || "#CD7F32"}20`,
                }}
              >
                {dashboardSummary?.tier_icon || "🥉"}
              </div>
              <p className="font-serif text-[22px] text-[#0F3A3E]">
                {dashboardSummary?.tier_name || "Bronze"}
              </p>
              <p className="text-[14px] text-[#B07B1E] font-medium mt-1">
                {((dashboardSummary?.current_commission_rate || 0.08) * 100).toFixed(0)}% de comissão
              </p>
            </div>

            {/* Progress to Next Tier */}
            {nextTier && (
              <div className="bg-[#F8F4EA] p-4 border border-[#E9E1D2]">
                <div className="flex items-center justify-between text-[12px] mb-2">
                  <span className="text-[#75827E]">Próximo nível</span>
                  <span className="text-[#0F3A3E] font-medium">
                    {nextTier.icon} {nextTier.name}
                  </span>
                </div>
                <div className="h-2 bg-[#E0D8C7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#B07B1E] rounded-full transition-all duration-500"
                    style={{ width: `${progressToNextTier}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#75827E] mt-2">
                  {formatCurrency(dashboardSummary?.current_month_sales || 0)} /{" "}
                  {formatCurrency(nextTier.min_sales_amount)}
                </p>
              </div>
            )}

            {!nextTier && (
              <div className="bg-[#0F3A3E] p-4 text-center">
                <p className="text-white text-[13px]">
                  🎉 Você está no nível máximo!
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 space-y-2">
              <Link
                to="/afiliado/dashboard/links"
                className="flex items-center justify-between w-full px-4 py-3 bg-[#F3EEE3] hover:bg-[#E9E1D2] text-[13px] text-[#0F3A3E] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-[#B07B1E]" />
                  Criar novo link
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/produtos"
                className="flex items-center justify-between w-full px-4 py-3 bg-[#F3EEE3] hover:bg-[#E9E1D2] text-[13px] text-[#0F3A3E] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#B07B1E]" />
                  Ver produtos
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 bg-[#0F3A3E] p-6 md:p-8">
        <h3 className="font-serif text-[18px] text-white mb-4">💡 Dicas para vender mais</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white/10 p-4">
            <p className="text-[13px] text-white leading-[1.6]">
              <strong>Compartilhe reviews:</strong> Mostre os produtos em ação para gerar confiança.
            </p>
          </div>
          <div className="bg-white/10 p-4">
            <p className="text-[13px] text-white leading-[1.6]">
              <strong>Use Stories:</strong> Links em stories do Instagram têm alta taxa de cliques.
            </p>
          </div>
          <div className="bg-white/10 p-4">
            <p className="text-[13px] text-white leading-[1.6]">
              <strong>Foque em kits:</strong> Produtos com maior ticket geram mais comissão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
