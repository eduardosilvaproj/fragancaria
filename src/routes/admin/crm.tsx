import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Mail,
  Users,
  Send,
  BarChart3,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Clock,
  TrendingUp,
  MousePointer,
  Inbox,
  Tag,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/crm")({
  component: AdminCRM,
});

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: "draft" | "scheduled" | "sent";
  sentTo: number;
  openRate: number;
  clickRate: number;
  sentAt?: string;
  scheduledFor?: string;
}

interface Segment {
  id: string;
  name: string;
  description: string;
  count: number;
  criteria: string[];
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    name: "Promoção de Verão",
    subject: "☀️ Até 40% OFF nos cuidados de verão!",
    status: "sent",
    sentTo: 2400,
    openRate: 32.5,
    clickRate: 8.2,
    sentAt: "2024-01-15 10:00",
  },
  {
    id: "2",
    name: "Lançamento Kérastase",
    subject: "✨ Novidade: Linha Chronologiste chegou!",
    status: "sent",
    sentTo: 1850,
    openRate: 45.2,
    clickRate: 12.8,
    sentAt: "2024-01-10 14:00",
  },
  {
    id: "3",
    name: "Carrinho Abandonado",
    subject: "Ops! Você esqueceu algo no carrinho 🛒",
    status: "sent",
    sentTo: 320,
    openRate: 52.1,
    clickRate: 18.5,
    sentAt: "2024-01-18 09:00",
  },
  {
    id: "4",
    name: "Newsletter Fevereiro",
    subject: "💜 Dicas de cuidados para o Carnaval",
    status: "scheduled",
    sentTo: 0,
    openRate: 0,
    clickRate: 0,
    scheduledFor: "2024-02-01 10:00",
  },
];

const MOCK_SEGMENTS: Segment[] = [
  {
    id: "1",
    name: "Clientes VIP",
    description: "Compraram mais de R$500 nos últimos 6 meses",
    count: 234,
    criteria: ["Valor total > R$500", "Últimos 6 meses"],
  },
  {
    id: "2",
    name: "Novos Clientes",
    description: "Primeira compra nos últimos 30 dias",
    count: 89,
    criteria: ["1 compra", "Últimos 30 dias"],
  },
  {
    id: "3",
    name: "Carrinho Abandonado",
    description: "Adicionaram ao carrinho mas não compraram",
    count: 156,
    criteria: ["Carrinho abandonado", "Últimas 48h"],
  },
  {
    id: "4",
    name: "Inativos",
    description: "Não compraram nos últimos 90 dias",
    count: 412,
    criteria: ["Sem compras", "90+ dias"],
  },
];

const AUTOMATIONS = [
  { name: "Boas-vindas", description: "Email ao criar conta", active: true, sent: 892 },
  { name: "Carrinho Abandonado", description: "Lembrete após 2h", active: true, sent: 1240 },
  { name: "Pós-compra", description: "Agradecimento + review", active: true, sent: 2100 },
  { name: "Aniversário", description: "Cupom de desconto", active: false, sent: 156 },
  { name: "Reativação", description: "Clientes inativos 60d", active: true, sent: 340 },
];

const STATUS_CONFIG = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  scheduled: { label: "Agendado", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Enviado", color: "bg-emerald-100 text-emerald-700" },
};

function AdminCRM() {
  const [activeTab, setActiveTab] = useState<"campaigns" | "segments" | "automations">("campaigns");

  const totalContacts = 2400;
  const avgOpenRate = 38.5;
  const avgClickRate = 12.2;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Marketing
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
          CRM & Email Marketing
        </h1>
        <p className="text-[#51635F] mt-2">
          Gerencie contatos, crie campanhas e automações de email.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total Contatos
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">
            {totalContacts.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Inbox className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Taxa de Abertura
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{avgOpenRate}%</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <MousePointer className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Taxa de Clique
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{avgClickRate}%</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Send className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Emails Enviados
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">12.4K</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5F3EE] p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "campaigns"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Send className="h-4 w-4 inline mr-2" />
          Campanhas
        </button>
        <button
          onClick={() => setActiveTab("segments")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "segments"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Tag className="h-4 w-4 inline mr-2" />
          Segmentos
        </button>
        <button
          onClick={() => setActiveTab("automations")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "automations"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Zap className="h-4 w-4 inline mr-2" />
          Automações
        </button>
      </div>

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2] flex items-center justify-between">
            <h3 className="font-serif text-lg text-[#0F3A3E]">Campanhas de Email</h3>
            <button className="flex items-center gap-2 bg-[#0F3A3E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#16504F] transition-colors">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </button>
          </div>

          <div className="divide-y divide-[#E9E1D2]">
            {MOCK_CAMPAIGNS.map((campaign) => (
              <div key={campaign.id} className="p-4 hover:bg-[#F9F7F3] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-[#0F3A3E]">{campaign.name}</h4>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          STATUS_CONFIG[campaign.status].color
                        )}
                      >
                        {STATUS_CONFIG[campaign.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-[#51635F] mb-2">{campaign.subject}</p>
                    <div className="flex items-center gap-4 text-xs text-[#8A938E]">
                      {campaign.status === "sent" ? (
                        <>
                          <span>Enviado para {campaign.sentTo.toLocaleString()}</span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {campaign.openRate}% abriram
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer className="h-3 w-3" />
                            {campaign.clickRate}% clicaram
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Agendado: {campaign.scheduledFor}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                      <BarChart3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Segments Tab */}
      {activeTab === "segments" && (
        <div className="grid md:grid-cols-2 gap-4">
          {MOCK_SEGMENTS.map((segment) => (
            <div
              key={segment.id}
              className="bg-white border border-[#E9E1D2] p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-[#0F3A3E]">{segment.name}</h4>
                  <p className="text-sm text-[#8A938E] mt-1">{segment.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl text-[#0F3A3E]">
                    {segment.count.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#8A938E]">contatos</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {segment.criteria.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] bg-[#F5F3EE] text-[#51635F] px-2 py-1 rounded"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-[#0F3A3E] text-white rounded-lg text-sm hover:bg-[#16504F] transition-colors">
                  Enviar Email
                </button>
                <button className="p-2 border border-[#E9E1D2] text-[#51635F] rounded-lg hover:bg-[#F9F7F3] transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button className="bg-white border-2 border-dashed border-[#E9E1D2] p-8 flex flex-col items-center justify-center text-[#8A938E] hover:border-[#B07B1E] hover:text-[#B07B1E] transition-colors">
            <Plus className="h-8 w-8 mb-2" />
            <span className="font-medium">Criar Segmento</span>
          </button>
        </div>
      )}

      {/* Automations Tab */}
      {activeTab === "automations" && (
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2] flex items-center justify-between">
            <h3 className="font-serif text-lg text-[#0F3A3E]">Automações de Email</h3>
            <button className="flex items-center gap-2 bg-[#0F3A3E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#16504F] transition-colors">
              <Plus className="h-4 w-4" />
              Nova Automação
            </button>
          </div>

          <div className="divide-y divide-[#E9E1D2]">
            {AUTOMATIONS.map((automation) => (
              <div
                key={automation.name}
                className="p-4 flex items-center justify-between hover:bg-[#F9F7F3] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      automation.active ? "bg-emerald-100" : "bg-gray-100"
                    )}
                  >
                    <Zap
                      className={cn(
                        "h-5 w-5",
                        automation.active ? "text-emerald-600" : "text-gray-400"
                      )}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-[#0F3A3E]">{automation.name}</h4>
                    <p className="text-sm text-[#8A938E]">{automation.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-medium text-[#0F3A3E]">
                      {automation.sent.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[#8A938E]">emails enviados</p>
                  </div>

                  <button
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      automation.active ? "bg-emerald-500" : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        automation.active ? "translate-x-7" : "translate-x-1"
                      )}
                    />
                  </button>

                  <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCRM;
