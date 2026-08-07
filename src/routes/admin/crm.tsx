import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Mail,
  Users,
  Send,
  BarChart3,
  Plus,
  Edit2,
  Eye,
  Copy,
  Calendar,
  TrendingUp,
  MousePointer,
  Inbox,
  Tag,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCrmDashboard } from "@/lib/customers-admin.functions";

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

const STATUS_CONFIG: Record<Campaign["status"], { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700" },
  scheduled: { label: "Agendado", color: "bg-amber-100 text-amber-700" },
  sent: { label: "Enviado", color: "bg-emerald-100 text-emerald-700" },
};

const DEFAULT_AUTOMATIONS = [
  { name: "Boas-vindas", description: "Email ao criar conta", active: true, sent: 892 },
  { name: "Carrinho Abandonado", description: "Lembrete após 2h", active: true, sent: 1240 },
  { name: "Pós-compra", description: "Agradecimento + review", active: true, sent: 2100 },
  { name: "Aniversário", description: "Cupom de desconto", active: false, sent: 156 },
  { name: "Reativação", description: "Clientes inativos 60d", active: true, sent: 340 },
];

function AdminCRM() {
  const [activeTab, setActiveTab] = useState<"campaigns" | "segments" | "automations">("campaigns");

  const listFn = useServerFn(getCrmDashboard as any);
  const { data: crmData, isFetching, error } = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: () => listFn({}),
    refetchOnWindowFocus: false,
  });

  const result = crmData?.success ? crmData.data : null;
  const totalContacts = result?.totalContacts ?? 0;
  const avgOpenRate = result?.avgOpenRate ?? 0;
  const avgClickRate = result?.avgClickRate ?? 0;
  const campaigns = result?.campaigns ?? [];
  const segments = result?.segments ?? [];
  const automations =
    result && result.automations.length > 0 ? result.automations : DEFAULT_AUTOMATIONS;

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

      {error && !isFetching && (
        <div className="bg-red-50 border border-red-200 p-4 text-red-700 text-sm mb-8">
          Erro ao carregar dados de CRM: {error.message}
        </div>
      )}

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
            {totalContacts.toLocaleString("pt-BR")}
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
          <p className="font-serif text-2xl text-[#0F3A3E]">{avgOpenRate.toFixed(1)}%</p>
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
          <p className="font-serif text-2xl text-[#0F3A3E]">{avgClickRate.toFixed(1)}%</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Send className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Campanhas Enviadas
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">0</p>
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

          {isFetching && (
            <div className="p-8 text-center text-sm text-[#8A938E]">
              Carregando campanhas...
            </div>
          )}
          {!isFetching && campaigns.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm font-medium text-[#0F3A3E]">Campanhas ainda não disponíveis</p>
              <p className="text-xs text-[#8A938E] mt-1">Esta área depende de uma tabela de campanhas que ainda não existe no banco de dados.</p>
            </div>
          )}

          <div className="divide-y divide-[#E9E1D2]">
            {campaigns.map((campaign: any) => (
              <div key={campaign.id} className="p-4 hover:bg-[#F9F7F3] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-[#0F3A3E]">{campaign.name}</h4>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          STATUS_CONFIG[campaign.status as keyof typeof STATUS_CONFIG].color
                        )}
                      >
                        {STATUS_CONFIG[campaign.status as keyof typeof STATUS_CONFIG].label}
                      </span>
                    </div>
                    <p className="text-sm text-[#51635F] mb-2">{campaign.subject}</p>
                    <div className="flex items-center gap-4 text-xs text-[#8A938E]">
                      {campaign.status === "sent" ? (
                        <>
                          <span>Enviado para {campaign.sentTo.toLocaleString("pt-BR")}</span>
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
          {isFetching && (
            <div className="col-span-full p-8 text-center text-sm text-[#8A938E]">
              Carregando segmentos...
            </div>
          )}
          {!isFetching && segments.length === 0 && (
            <div className="col-span-full p-8 text-center text-sm text-[#8A938E]">
              Nenhum segmento encontrado.
            </div>
          )}
          {segments.map((segment: any) => (
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
                    {segment.count.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-[#8A938E]">contatos</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {segment.criteria.map((c: any) => (
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
            {automations.map((automation: any) => (
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
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[#8A938E]">
                    {automation.sent.toLocaleString("pt-BR")} enviados
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-full",
                      automation.active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {automation.active ? "Ativa" : "Inativa"}
                  </span>
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