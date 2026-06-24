import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bot,
  MessageSquare,
  Settings,
  Play,
  Pause,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Zap,
  Brain,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  BookOpen,
  HelpCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/atendimento-ia")({
  component: AdminAtendimentoIA,
});

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  hits: number;
  active: boolean;
}

interface ChatbotIntent {
  id: string;
  name: string;
  description: string;
  examples: string[];
  response: string;
  active: boolean;
}

const MOCK_FAQS: FAQ[] = [
  {
    id: "1",
    question: "Qual o prazo de entrega?",
    answer: "O prazo de entrega varia de 3 a 10 dias úteis, dependendo da sua região. Após a confirmação do pagamento, você receberá o código de rastreio por e-mail.",
    category: "Entrega",
    hits: 234,
    active: true,
  },
  {
    id: "2",
    question: "Como faço para trocar um produto?",
    answer: "Você pode solicitar a troca em até 7 dias após o recebimento. Acesse 'Meus Pedidos', selecione o produto e clique em 'Solicitar Troca'. Nossa equipe entrará em contato.",
    category: "Trocas",
    hits: 156,
    active: true,
  },
  {
    id: "3",
    question: "Quais formas de pagamento vocês aceitam?",
    answer: "Aceitamos cartões de crédito (Visa, Mastercard, Elo, Amex), Pix, boleto bancário e parcelamento em até 10x sem juros.",
    category: "Pagamento",
    hits: 189,
    active: true,
  },
  {
    id: "4",
    question: "Os produtos são originais?",
    answer: "Sim! Todos os nossos produtos são 100% originais, com nota fiscal e garantia do fabricante. Trabalhamos diretamente com as marcas.",
    category: "Produtos",
    hits: 312,
    active: true,
  },
  {
    id: "5",
    question: "Tem frete grátis?",
    answer: "Sim! Frete grátis para compras acima de R$199. Para valores menores, o frete é calculado pelo CEP no carrinho.",
    category: "Entrega",
    hits: 445,
    active: true,
  },
];

const MOCK_INTENTS: ChatbotIntent[] = [
  {
    id: "1",
    name: "Saudação",
    description: "Quando o cliente diz olá, oi, bom dia, etc.",
    examples: ["Olá", "Oi", "Bom dia", "Boa tarde", "E aí"],
    response: "Olá! 👋 Seja bem-vindo(a) à Fragranciaria! Como posso ajudar você hoje?",
    active: true,
  },
  {
    id: "2",
    name: "Rastrear Pedido",
    description: "Cliente quer rastrear seu pedido",
    examples: ["Onde está meu pedido?", "Rastrear pedido", "Cadê minha encomenda"],
    response: "Para rastrear seu pedido, preciso do número do pedido ou do e-mail cadastrado. Pode me informar?",
    active: true,
  },
  {
    id: "3",
    name: "Falar com Humano",
    description: "Cliente quer falar com atendente",
    examples: ["Quero falar com alguém", "Atendente humano", "Não quero falar com robô"],
    response: "Entendo! Vou transferir você para um de nossos atendentes. Aguarde um momento. ⏳",
    active: true,
  },
];

const STATS = [
  { label: "Conversas Hoje", value: "48", change: "+12%", icon: MessageSquare },
  { label: "Taxa de Resolução", value: "78%", change: "+5%", icon: CheckCircle },
  { label: "Tempo Médio", value: "1m 32s", change: "-18%", icon: Clock },
  { label: "Transferências", value: "22%", change: "-8%", icon: AlertCircle },
];

function AdminAtendimentoIA() {
  const [activeTab, setActiveTab] = useState<"chatbot" | "faqs" | "training">("chatbot");
  const [chatbotActive, setChatbotActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = MOCK_FAQS.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Bot className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Inteligência Artificial
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
              Atendimento IA
            </h1>
            <p className="text-[#51635F] mt-2">
              Configure o chatbot inteligente e gerencie FAQs automáticas.
            </p>
          </div>

          {/* Chatbot Toggle */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm font-medium",
                chatbotActive ? "text-emerald-600" : "text-[#8A938E]"
              )}
            >
              {chatbotActive ? "Chatbot Ativo" : "Chatbot Inativo"}
            </span>
            <button
              onClick={() => setChatbotActive(!chatbotActive)}
              className={cn(
                "w-14 h-7 rounded-full transition-colors relative",
                chatbotActive ? "bg-emerald-500" : "bg-gray-300"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  chatbotActive ? "translate-x-8" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white border border-[#E9E1D2] p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
              {stat.label}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="font-serif text-2xl text-[#0F3A3E]">{stat.value}</p>
              <span
                className={cn(
                  "text-xs",
                  stat.change.startsWith("+") ? "text-emerald-600" : "text-red-500"
                )}
              >
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5F3EE] p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab("chatbot")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "chatbot"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Bot className="h-4 w-4 inline mr-2" />
          Chatbot
        </button>
        <button
          onClick={() => setActiveTab("faqs")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "faqs"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <HelpCircle className="h-4 w-4 inline mr-2" />
          FAQs
        </button>
        <button
          onClick={() => setActiveTab("training")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "training"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Brain className="h-4 w-4 inline mr-2" />
          Treinamento
        </button>
      </div>

      {/* Chatbot Tab */}
      {activeTab === "chatbot" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Intents */}
          <div className="bg-white border border-[#E9E1D2] overflow-hidden">
            <div className="p-4 border-b border-[#E9E1D2] flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#0F3A3E]">Intenções Configuradas</h3>
              <button className="flex items-center gap-2 text-sm text-[#B07B1E] hover:underline">
                <Plus className="h-4 w-4" />
                Nova Intenção
              </button>
            </div>

            <div className="divide-y divide-[#E9E1D2]">
              {MOCK_INTENTS.map((intent) => (
                <div key={intent.id} className="p-4 hover:bg-[#F9F7F3] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-[#0F3A3E]">{intent.name}</h4>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full",
                            intent.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {intent.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <p className="text-sm text-[#8A938E] mb-2">{intent.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {intent.examples.slice(0, 3).map((ex) => (
                          <span
                            key={ex}
                            className="text-[10px] bg-[#F5F3EE] text-[#51635F] px-2 py-1 rounded"
                          >
                            "{ex}"
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
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

          {/* Preview */}
          <div className="bg-white border border-[#E9E1D2] overflow-hidden">
            <div className="p-4 border-b border-[#E9E1D2]">
              <h3 className="font-serif text-lg text-[#0F3A3E]">Preview do Chatbot</h3>
            </div>

            <div className="h-[400px] bg-[#F9F7F3] p-4 overflow-y-auto">
              {/* Chat Preview */}
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="bg-[#0F3A3E] text-white rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                    <p className="text-sm">
                      Olá! 👋 Seja bem-vindo(a) à Fragranciaria! Como posso ajudar você hoje?
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm max-w-[80%]">
                    <p className="text-sm text-[#0F3A3E]">Qual o prazo de entrega?</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-[#0F3A3E] text-white rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%]">
                    <p className="text-sm">
                      O prazo de entrega varia de 3 a 10 dias úteis, dependendo da sua região. Após a confirmação do pagamento, você receberá o código de rastreio por e-mail. 📦
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#E9E1D2]">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Teste o chatbot..."
                  className="flex-1 bg-[#F5F3EE] rounded-lg px-4 py-2 text-sm outline-none"
                />
                <button className="px-4 py-2 bg-[#0F3A3E] text-white rounded-lg text-sm">
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAQs Tab */}
      {activeTab === "faqs" && (
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2] flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex items-center gap-2 bg-[#F5F3EE] rounded-lg px-4 py-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-[#8A938E]" />
              <input
                type="text"
                placeholder="Buscar pergunta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <button className="flex items-center gap-2 bg-[#0F3A3E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#16504F] transition-colors">
              <Plus className="h-4 w-4" />
              Nova FAQ
            </button>
          </div>

          <div className="divide-y divide-[#E9E1D2]">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="p-4 hover:bg-[#F9F7F3] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] bg-[#F5F3EE] text-[#51635F] px-2 py-0.5 rounded">
                        {faq.category}
                      </span>
                      <span className="text-[10px] text-[#8A938E]">
                        {faq.hits} visualizações
                      </span>
                    </div>
                    <h4 className="font-medium text-[#0F3A3E] mb-1">{faq.question}</h4>
                    <p className="text-sm text-[#51635F] line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-1">
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

      {/* Training Tab */}
      {activeTab === "training" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E9E1D2] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#0F3A3E]">Treinar com Produtos</h3>
                <p className="text-sm text-[#8A938E]">
                  O chatbot aprende sobre seu catálogo
                </p>
              </div>
            </div>
            <p className="text-sm text-[#51635F] mb-4">
              Sincronize seus produtos do Shopify para que o chatbot possa responder perguntas específicas sobre preços, disponibilidade e características.
            </p>
            <button className="w-full py-3 bg-[#0F3A3E] text-white rounded-lg text-sm hover:bg-[#16504F] transition-colors">
              <Zap className="h-4 w-4 inline mr-2" />
              Sincronizar Produtos
            </button>
            <p className="text-[10px] text-[#8A938E] mt-2 text-center">
              Última sincronização: há 2 dias
            </p>
          </div>

          <div className="bg-white border border-[#E9E1D2] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#0F3A3E]">Base de Conhecimento</h3>
                <p className="text-sm text-[#8A938E]">
                  Documentos e políticas da loja
                </p>
              </div>
            </div>
            <p className="text-sm text-[#51635F] mb-4">
              Faça upload de documentos como política de troca, termos de uso e guias de produtos para enriquecer as respostas do chatbot.
            </p>
            <button className="w-full py-3 border border-[#E9E1D2] text-[#0F3A3E] rounded-lg text-sm hover:bg-[#F9F7F3] transition-colors">
              <Plus className="h-4 w-4 inline mr-2" />
              Upload de Documento
            </button>
            <p className="text-[10px] text-[#8A938E] mt-2 text-center">
              3 documentos carregados
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAtendimentoIA;
