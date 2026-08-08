import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  MessageSquare,
  Bot,
  Share2,
  BarChart3,
  Star,
  Mail,
  Gift,
  Settings,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinanceiro } from "@/lib/financeiro.functions";
import { listConversations } from "@/lib/whatsapp.functions";
import { listAffiliates } from "@/lib/affiliates-admin.functions";
import { listReviewsForAdmin } from "@/lib/reviews-admin.functions";
import { getCrmDashboard, getLoyaltyDashboard } from "@/lib/customers-admin.functions";
import { listPosts } from "@/lib/agent/social-publish.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

const ADMIN_MODULES = [
  {
    id: "afiliados",
    title: "Afiliados",
    description: "Gerenciar afiliados, comissões e pagamentos",
    icon: Users,
    href: "/admin/afiliados",
    color: "bg-emerald-500",
    stats: { label: "Pendentes", value: "--" },
  },
  {
    id: "sac",
    title: "SAC Centralizado",
    description: "WhatsApp, Instagram e Email em um só lugar",
    icon: MessageSquare,
    href: "/admin/sac",
    color: "bg-blue-500",
    stats: { label: "Não lidos", value: "--" },
  },
  {
    id: "atendimento-ia",
    title: "Atendimento IA",
    description: "Chatbot inteligente e FAQs automáticas",
    icon: Bot,
    href: "/admin/atendimento-ia",
    color: "bg-purple-500",
    stats: { label: "Conversas hoje", value: "--" },
  },
  {
    id: "redes-sociais",
    title: "Redes Sociais IA",
    description: "Gerar posts, legendas e responder DMs",
    icon: Share2,
    href: "/admin/redes-sociais",
    color: "bg-pink-500",
    stats: { label: "Posts agendados", value: "--" },
  },
  {
    id: "analytics",
    title: "Analytics Avançado",
    description: "Funil, cohorts, LTV e previsões",
    icon: BarChart3,
    href: "/admin/analytics",
    color: "bg-amber-500",
    stats: { label: "Receita mês", value: "--" },
  },
  {
    id: "reviews",
    title: "Reviews & UGC",
    description: "Gerenciar avaliações e fotos de clientes",
    icon: Star,
    href: "/admin/reviews",
    color: "bg-yellow-500",
    stats: { label: "Pendentes", value: "--" },
  },
  {
    id: "crm",
    title: "CRM & Email",
    description: "Segmentação, automações e campanhas",
    icon: Mail,
    href: "/admin/crm",
    color: "bg-indigo-500",
    stats: { label: "Contatos", value: "--" },
  },
  {
    id: "loyalty",
    title: "Loyalty & Pontos",
    description: "Programa de fidelidade e recompensas",
    icon: Gift,
    href: "/admin/loyalty",
    color: "bg-rose-500",
    stats: { label: "Membros ativos", value: "--" },
  },
];

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="bg-white border border-[#E9E1D2] p-5">
      <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">{label}</p>
      <p className="font-serif text-2xl text-[#0F3A3E]">{value}</p>
      <p className="text-xs text-[#8A938E] mt-1">{helper}</p>
    </div>
  );
}

function AdminDashboard() {
  const financeiroFn = useServerFn(getFinanceiro as any);
  const conversationsFn = useServerFn(listConversations as any);
  const affiliatesFn = useServerFn(listAffiliates as any);
  const reviewsFn = useServerFn(listReviewsForAdmin as any);
  const crmFn = useServerFn(getCrmDashboard as any);
  const loyaltyFn = useServerFn(getLoyaltyDashboard as any);
  const postsFn = useServerFn(listPosts as any);

  const financeiroQuery = useQuery({
    queryKey: ["admin-dashboard", "financeiro"],
    queryFn: () => financeiroFn({} as any),
    refetchOnWindowFocus: false,
  });
  const conversationsQuery = useQuery({
    queryKey: ["admin-dashboard", "conversations"],
    queryFn: () => conversationsFn({} as any),
    refetchOnWindowFocus: false,
  });
  const affiliatesQuery = useQuery({
    queryKey: ["admin-dashboard", "affiliates"],
    queryFn: () => affiliatesFn({} as any),
    refetchOnWindowFocus: false,
  });
  const reviewsQuery = useQuery({
    queryKey: ["admin-dashboard", "reviews"],
    queryFn: () => reviewsFn({ status: "pending" } as any),
    refetchOnWindowFocus: false,
  });
  const crmQuery = useQuery({
    queryKey: ["admin-dashboard", "crm"],
    queryFn: () => crmFn({} as any),
    refetchOnWindowFocus: false,
  });
  const loyaltyQuery = useQuery({
    queryKey: ["admin-dashboard", "loyalty"],
    queryFn: () => loyaltyFn({} as any),
    refetchOnWindowFocus: false,
  });
  const postsQuery = useQuery({
    queryKey: ["admin-dashboard", "posts"],
    queryFn: () => postsFn({} as any),
    refetchOnWindowFocus: false,
  });

  const dashboard = useMemo(() => {
    const financeiro = financeiroQuery.data?.success ? financeiroQuery.data.data : null;
    const conversations = conversationsQuery.data?.success ? conversationsQuery.data.data : [];
    const affiliates = affiliatesQuery.data?.success ? affiliatesQuery.data.data : [];
    const reviews = reviewsQuery.data?.success ? reviewsQuery.data.data : [];
    const crmSuccess = crmQuery.data?.success ? crmQuery.data.data : null;
    const loyaltySuccess = loyaltyQuery.data?.success ? loyaltyQuery.data.data : null;
    const posts = Array.isArray((postsQuery.data as any)?.posts) ? (postsQuery.data as any).posts : [];

    return {
      salesToday: financeiro
        ? financeiro.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "R$ 0",
      ordersToday: financeiro ? financeiro.totalPedidos.toLocaleString("pt-BR") : "0",
      messagesUnread: conversations.filter((c: any) => c.unread).length.toLocaleString("pt-BR"),
      conversion: "0%",
      affiliatesPending: affiliates.filter((a: any) => a.status === "pending").length.toLocaleString("pt-BR"),
      sacUnread: conversations.filter((c: any) => c.unread).length.toLocaleString("pt-BR"),
      socialPostsScheduled: posts.filter((p: any) => p.status === "scheduled").length.toLocaleString("pt-BR"),
      analyticsRevenue: financeiro
        ? financeiro.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "R$ 0",
      reviewsPending: reviews.filter((r: any) => r.status === "pending").length.toLocaleString("pt-BR"),
      crmContacts: crmSuccess ? crmSuccess.totalContacts.toLocaleString("pt-BR") : "0",
      loyaltyMembers: loyaltySuccess ? loyaltySuccess.totalMembers.toLocaleString("pt-BR") : "0",
    };
  }, [affiliatesQuery.data, conversationsQuery.data, crmQuery.data, financeiroQuery.data, loyaltyQuery.data, postsQuery.data, reviewsQuery.data]);

  const isLoading =
    financeiroQuery.isPending ||
    conversationsQuery.isPending ||
    affiliatesQuery.isPending ||
    reviewsQuery.isPending ||
    crmQuery.isPending ||
    loyaltyQuery.isPending ||
    postsQuery.isPending;

  const hasError =
    financeiroQuery.isError ||
    conversationsQuery.isError ||
    affiliatesQuery.isError ||
    reviewsQuery.isError ||
    crmQuery.isError ||
    loyaltyQuery.isError ||
    postsQuery.isError;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Painel Administrativo
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
          Central de <em className="text-[#B07B1E]">Gestão</em>
        </h1>
        <p className="text-[#51635F] mt-3 max-w-xl">
          Gerencie todos os aspectos do seu negócio em um só lugar.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {hasError ? (
          <div className="col-span-2 md:col-span-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            Falha ao carregar métricas do dashboard administrativo.
          </div>
        ) : isLoading ? (
          <>
            <div className="col-span-2 md:col-span-4 flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#B07B1E]" />
            </div>
            <div className="col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-[118px] bg-[#F5F3EE] border border-[#E9E1D2]" />
              <div className="h-[118px] bg-[#F5F3EE] border border-[#E9E1D2]" />
              <div className="h-[118px] bg-[#F5F3EE] border border-[#E9E1D2]" />
              <div className="h-[118px] bg-[#F5F3EE] border border-[#E9E1D2]" />
            </div>
          </>
        ) : (
          <>
            <StatCard label="Vendas Hoje" value={dashboard.salesToday} helper="Receita real do financeiro" />
            <StatCard label="Pedidos" value={dashboard.ordersToday} helper="Pedidos pagos/aprovados" />
            <StatCard label="Mensagens" value={dashboard.messagesUnread} helper="Conversas não lidas no SAC" />
            <StatCard label="Conversão" value={dashboard.conversion} helper="Sem fonte real disponível" />
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {ADMIN_MODULES.map((module) => {
          const value =
            module.id === "afiliados"
              ? dashboard.affiliatesPending
              : module.id === "sac"
                ? dashboard.sacUnread
                : module.id === "redes-sociais"
                  ? dashboard.socialPostsScheduled
                  : module.id === "analytics"
                    ? dashboard.analyticsRevenue
                    : module.id === "reviews"
                      ? dashboard.reviewsPending
                      : module.id === "crm"
                        ? dashboard.crmContacts
                        : module.id === "loyalty"
                          ? dashboard.loyaltyMembers
                          : module.stats.value;

          return (
            <Link
              key={module.id}
              to={module.href}
              className="group bg-white border border-[#E9E1D2] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center mb-4`}>
                <module.icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="font-serif text-xl text-[#0F3A3E] mb-2 group-hover:text-[#B07B1E] transition-colors">
                {module.title}
              </h3>

              <p className="text-sm text-[#51635F] mb-4 line-clamp-2">
                {module.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[#E9E1D2]">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A938E]">
                    {module.stats.label}
                  </p>
                  <p className="font-serif text-lg text-[#0F3A3E]">{value}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-[#B07B1E] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 bg-[#0F3A3E] p-6 md:p-8">
        <h2 className="font-serif text-2xl text-white mb-6">Ações Rápidas</h2>
        <div className="grid md:grid-cols-4 gap-4">
          <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 text-sm transition-colors text-left">
            + Aprovar Afiliado
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 text-sm transition-colors text-left">
            + Criar Post IA
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 text-sm transition-colors text-left">
            + Nova Campanha
          </button>
          <button className="bg-white/10 hover:bg-white/20 text-white py-3 px-4 text-sm transition-colors text-left">
            + Ver Relatórios
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
