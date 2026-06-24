import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Gift,
  Star,
  Users,
  TrendingUp,
  Award,
  Plus,
  Edit2,
  Trash2,
  Search,
  Crown,
  Gem,
  Sparkles,
  ShoppingBag,
  Calendar,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/loyalty")({
  component: AdminLoyalty,
});

interface LoyaltyTier {
  id: string;
  name: string;
  icon: any;
  color: string;
  minPoints: number;
  benefits: string[];
  memberCount: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  stock: number;
  redeemed: number;
  active: boolean;
}

interface Member {
  id: string;
  name: string;
  email: string;
  tier: string;
  points: number;
  totalSpent: number;
  joinedAt: string;
}

const TIERS: LoyaltyTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    icon: Award,
    color: "bg-amber-700",
    minPoints: 0,
    benefits: ["1 ponto por R$1 gasto", "Acesso antecipado a promoções"],
    memberCount: 412,
  },
  {
    id: "silver",
    name: "Prata",
    icon: Star,
    color: "bg-gray-400",
    minPoints: 500,
    benefits: ["1.5 pontos por R$1 gasto", "Frete grátis em pedidos acima de R$150", "5% OFF no aniversário"],
    memberCount: 234,
  },
  {
    id: "gold",
    name: "Ouro",
    icon: Crown,
    color: "bg-yellow-500",
    minPoints: 1500,
    benefits: ["2 pontos por R$1 gasto", "Frete grátis sempre", "10% OFF no aniversário", "Acesso a produtos exclusivos"],
    memberCount: 156,
  },
  {
    id: "diamond",
    name: "Diamante",
    icon: Gem,
    color: "bg-cyan-400",
    minPoints: 5000,
    benefits: ["3 pontos por R$1 gasto", "Frete expresso grátis", "15% OFF no aniversário", "Consultor pessoal", "Brindes exclusivos"],
    memberCount: 42,
  },
];

const REWARDS: Reward[] = [
  {
    id: "1",
    name: "Desconto de R$20",
    description: "Cupom de R$20 OFF em qualquer compra",
    pointsCost: 200,
    stock: 999,
    redeemed: 156,
    active: true,
  },
  {
    id: "2",
    name: "Frete Grátis",
    description: "Cupom de frete grátis",
    pointsCost: 100,
    stock: 999,
    redeemed: 234,
    active: true,
  },
  {
    id: "3",
    name: "Kit Mini Kérastase",
    description: "Miniatura de shampoo + condicionador",
    pointsCost: 500,
    stock: 50,
    redeemed: 28,
    active: true,
  },
  {
    id: "4",
    name: "Desconto de R$50",
    description: "Cupom de R$50 OFF em compras acima de R$200",
    pointsCost: 400,
    stock: 999,
    redeemed: 89,
    active: true,
  },
  {
    id: "5",
    name: "Máscara Exclusiva",
    description: "Máscara de tratamento tamanho completo",
    pointsCost: 1500,
    stock: 20,
    redeemed: 12,
    active: false,
  },
];

const MOCK_MEMBERS: Member[] = [
  { id: "1", name: "Maria Silva", email: "maria@email.com", tier: "gold", points: 2340, totalSpent: 4500, joinedAt: "2023-06-15" },
  { id: "2", name: "João Santos", email: "joao@email.com", tier: "silver", points: 890, totalSpent: 1200, joinedAt: "2023-09-20" },
  { id: "3", name: "Ana Costa", email: "ana@email.com", tier: "diamond", points: 5670, totalSpent: 12000, joinedAt: "2022-01-10" },
  { id: "4", name: "Pedro Lima", email: "pedro@email.com", tier: "bronze", points: 230, totalSpent: 350, joinedAt: "2024-01-05" },
];

function AdminLoyalty() {
  const [activeTab, setActiveTab] = useState<"overview" | "rewards" | "members">("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const totalMembers = TIERS.reduce((sum, t) => sum + t.memberCount, 0);
  const totalPointsIssued = 45600;
  const totalRedemptions = 519;

  const filteredMembers = MOCK_MEMBERS.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Fidelidade
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
          Loyalty & Pontos
        </h1>
        <p className="text-[#51635F] mt-2">
          Gerencie seu programa de fidelidade e recompensas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Membros Ativos
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{totalMembers}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pontos Emitidos
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">
            {totalPointsIssued.toLocaleString()}
          </p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Gift className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Resgates
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{totalRedemptions}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Taxa de Uso
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">68%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5F3EE] p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "overview"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Crown className="h-4 w-4 inline mr-2" />
          Níveis
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "rewards"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Gift className="h-4 w-4 inline mr-2" />
          Recompensas
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "members"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Membros
        </button>
      </div>

      {/* Overview Tab - Tiers */}
      {activeTab === "overview" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className="bg-white border border-[#E9E1D2] overflow-hidden"
            >
              <div className={cn("p-4 text-white", tier.color)}>
                <div className="flex items-center justify-between">
                  <tier.icon className="h-8 w-8" />
                  <span className="text-2xl font-serif">{tier.memberCount}</span>
                </div>
                <h3 className="font-serif text-xl mt-2">{tier.name}</h3>
                <p className="text-sm opacity-80">
                  {tier.minPoints > 0 ? `${tier.minPoints}+ pontos` : "Nível inicial"}
                </p>
              </div>

              <div className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#8A938E] mb-2">
                  Benefícios
                </p>
                <ul className="space-y-2">
                  {tier.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2 text-sm text-[#51635F]"
                    >
                      <Star className="h-3 w-3 text-[#B07B1E] mt-1 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-4 pb-4">
                <button className="w-full py-2 border border-[#E9E1D2] text-[#51635F] rounded-lg text-sm hover:bg-[#F9F7F3] transition-colors">
                  <Settings className="h-4 w-4 inline mr-2" />
                  Configurar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === "rewards" && (
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2] flex items-center justify-between">
            <h3 className="font-serif text-lg text-[#0F3A3E]">Recompensas Disponíveis</h3>
            <button className="flex items-center gap-2 bg-[#0F3A3E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#16504F] transition-colors">
              <Plus className="h-4 w-4" />
              Nova Recompensa
            </button>
          </div>

          <div className="divide-y divide-[#E9E1D2]">
            {REWARDS.map((reward) => (
              <div
                key={reward.id}
                className={cn(
                  "p-4 flex items-center justify-between",
                  !reward.active && "opacity-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F5F3EE] rounded-lg flex items-center justify-center">
                    <Gift className="h-6 w-6 text-[#B07B1E]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-[#0F3A3E]">{reward.name}</h4>
                      {!reward.active && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#8A938E]">{reward.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="font-serif text-lg text-[#B07B1E]">
                      {reward.pointsCost}
                    </p>
                    <p className="text-[10px] text-[#8A938E]">pontos</p>
                  </div>

                  <div className="text-center">
                    <p className="font-medium text-[#0F3A3E]">{reward.stock}</p>
                    <p className="text-[10px] text-[#8A938E]">estoque</p>
                  </div>

                  <div className="text-center">
                    <p className="font-medium text-[#0F3A3E]">{reward.redeemed}</p>
                    <p className="text-[10px] text-[#8A938E]">resgatados</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2]">
            <div className="flex items-center gap-2 bg-[#F5F3EE] rounded-lg px-4 py-2 max-w-md">
              <Search className="h-4 w-4 text-[#8A938E]" />
              <input
                type="text"
                placeholder="Buscar membro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E9E1D2] bg-[#F9F7F3]">
                  <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Membro
                  </th>
                  <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Nível
                  </th>
                  <th className="text-right p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Pontos
                  </th>
                  <th className="text-right p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Total Gasto
                  </th>
                  <th className="text-left p-4 text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                    Desde
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => {
                  const tier = TIERS.find((t) => t.id === member.tier);
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-[#E9E1D2] last:border-b-0 hover:bg-[#F9F7F3] transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-[#0F3A3E]">{member.name}</p>
                            <p className="text-sm text-[#8A938E]">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white",
                            tier?.color
                          )}
                        >
                          {tier?.icon && <tier.icon className="h-3 w-3" />}
                          {tier?.name}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium text-[#B07B1E]">
                          {member.points.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium text-[#0F3A3E]">
                          {member.totalSpent.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-[#8A938E]">{member.joinedAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLoyalty;
