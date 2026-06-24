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
} from "lucide-react";

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
    stats: { label: "Pendentes", value: "3" },
  },
  {
    id: "sac",
    title: "SAC Centralizado",
    description: "WhatsApp, Instagram e Email em um só lugar",
    icon: MessageSquare,
    href: "/admin/sac",
    color: "bg-blue-500",
    stats: { label: "Não lidos", value: "12" },
  },
  {
    id: "atendimento-ia",
    title: "Atendimento IA",
    description: "Chatbot inteligente e FAQs automáticas",
    icon: Bot,
    href: "/admin/atendimento-ia",
    color: "bg-purple-500",
    stats: { label: "Conversas hoje", value: "48" },
  },
  {
    id: "redes-sociais",
    title: "Redes Sociais IA",
    description: "Gerar posts, legendas e responder DMs",
    icon: Share2,
    href: "/admin/redes-sociais",
    color: "bg-pink-500",
    stats: { label: "Posts agendados", value: "5" },
  },
  {
    id: "analytics",
    title: "Analytics Avançado",
    description: "Funil, cohorts, LTV e previsões",
    icon: BarChart3,
    href: "/admin/analytics",
    color: "bg-amber-500",
    stats: { label: "Receita mês", value: "R$ 45k" },
  },
  {
    id: "reviews",
    title: "Reviews & UGC",
    description: "Gerenciar avaliações e fotos de clientes",
    icon: Star,
    href: "/admin/reviews",
    color: "bg-yellow-500",
    stats: { label: "Pendentes", value: "8" },
  },
  {
    id: "crm",
    title: "CRM & Email",
    description: "Segmentação, automações e campanhas",
    icon: Mail,
    href: "/admin/crm",
    color: "bg-indigo-500",
    stats: { label: "Contatos", value: "2.4k" },
  },
  {
    id: "loyalty",
    title: "Loyalty & Pontos",
    description: "Programa de fidelidade e recompensas",
    icon: Gift,
    href: "/admin/loyalty",
    color: "bg-rose-500",
    stats: { label: "Membros ativos", value: "892" },
  },
];

function AdminDashboard() {
  return (
    <div className="p-6 md:p-8">
      {/* Header */}
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Vendas Hoje</p>
          <p className="font-serif text-2xl text-[#0F3A3E]">R$ 3.420</p>
          <p className="text-xs text-emerald-600 mt-1">+12% vs ontem</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Pedidos</p>
          <p className="font-serif text-2xl text-[#0F3A3E]">28</p>
          <p className="text-xs text-emerald-600 mt-1">+5 vs ontem</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Mensagens</p>
          <p className="font-serif text-2xl text-[#0F3A3E]">12</p>
          <p className="text-xs text-amber-600 mt-1">3 urgentes</p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Conversão</p>
          <p className="font-serif text-2xl text-[#0F3A3E]">3.2%</p>
          <p className="text-xs text-emerald-600 mt-1">+0.4% vs semana</p>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {ADMIN_MODULES.map((module) => (
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
                <p className="font-serif text-lg text-[#0F3A3E]">
                  {module.stats.value}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-[#B07B1E] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
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
