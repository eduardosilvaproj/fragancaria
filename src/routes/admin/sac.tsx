import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  Paperclip,
  Phone,
  Mail,
  Camera,
  MoreHorizontal,
  Clock,
  CheckCheck,
  User,
  Star,
  Archive,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/sac")({
  component: AdminSAC,
});

type Channel = "whatsapp" | "instagram" | "email";

interface Conversation {
  id: string;
  customer: {
    name: string;
    avatar?: string;
    phone?: string;
    email?: string;
    instagram?: string;
  };
  channel: Channel;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  status: "open" | "pending" | "resolved";
  priority: "low" | "medium" | "high";
  tags: string[];
}

interface Message {
  id: string;
  content: string;
  sender: "customer" | "agent";
  timestamp: string;
  read: boolean;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    customer: { name: "Maria Silva", phone: "(11) 99999-1234" },
    channel: "whatsapp",
    lastMessage: "Oi, queria saber sobre o prazo de entrega",
    lastMessageTime: "10:32",
    unread: true,
    status: "open",
    priority: "high",
    tags: ["Entrega", "Urgente"],
  },
  {
    id: "2",
    customer: { name: "João Santos", instagram: "@joaosantos" },
    channel: "instagram",
    lastMessage: "Esse produto tem em outras cores?",
    lastMessageTime: "09:45",
    unread: true,
    status: "open",
    priority: "medium",
    tags: ["Produto"],
  },
  {
    id: "3",
    customer: { name: "Ana Costa", email: "ana@email.com" },
    channel: "email",
    lastMessage: "Gostaria de fazer uma troca do produto",
    lastMessageTime: "Ontem",
    unread: false,
    status: "pending",
    priority: "medium",
    tags: ["Troca"],
  },
  {
    id: "4",
    customer: { name: "Pedro Lima", phone: "(21) 98888-5678" },
    channel: "whatsapp",
    lastMessage: "Obrigado pela ajuda!",
    lastMessageTime: "Ontem",
    unread: false,
    status: "resolved",
    priority: "low",
    tags: [],
  },
  {
    id: "5",
    customer: { name: "Carla Oliveira", instagram: "@carlaoliveira" },
    channel: "instagram",
    lastMessage: "Vocês tem parceria com influencers?",
    lastMessageTime: "2 dias",
    unread: false,
    status: "pending",
    priority: "low",
    tags: ["Parceria"],
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    content: "Olá! Fiz um pedido ontem e queria saber sobre o prazo de entrega.",
    sender: "customer",
    timestamp: "10:30",
    read: true,
  },
  {
    id: "2",
    content: "Meu pedido é o #12345",
    sender: "customer",
    timestamp: "10:31",
    read: true,
  },
  {
    id: "3",
    content: "Oi, queria saber sobre o prazo de entrega",
    sender: "customer",
    timestamp: "10:32",
    read: false,
  },
];

const CHANNEL_CONFIG = {
  whatsapp: { icon: Phone, color: "text-green-600 bg-green-100", label: "WhatsApp" },
  instagram: { icon: Camera, color: "text-pink-600 bg-pink-100", label: "Instagram" },
  email: { icon: Mail, color: "text-blue-600 bg-blue-100", label: "Email" },
};

const STATUS_CONFIG = {
  open: { label: "Aberto", color: "bg-emerald-100 text-emerald-700" },
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  resolved: { label: "Resolvido", color: "bg-gray-100 text-gray-700" },
};

function AdminSAC() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    MOCK_CONVERSATIONS[0]
  );
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const filteredConversations = MOCK_CONVERSATIONS.filter((conv) => {
    const matchesChannel = channelFilter === "all" || conv.channel === channelFilter;
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    const matchesSearch = conv.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesStatus && matchesSearch;
  });

  const unreadCount = MOCK_CONVERSATIONS.filter((c) => c.unread).length;
  const openCount = MOCK_CONVERSATIONS.filter((c) => c.status === "open").length;

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // TODO: Implement message sending
    console.log("Sending:", messageInput);
    setMessageInput("");
  };

  return (
    <div className="h-[calc(100vh-73px)] flex">
      {/* Conversations List */}
      <div className="w-full md:w-96 border-r border-[#E9E1D2] bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#E9E1D2]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#B07B1E]" />
              <h2 className="font-serif text-xl text-[#0F3A3E]">Conversas</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount} novas
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#F5F3EE] rounded-lg px-3 py-2 mb-3">
            <Search className="h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as Channel | "all")}
              className="flex-1 bg-[#F5F3EE] rounded-lg px-3 py-1.5 text-xs outline-none"
            >
              <option value="all">Todos canais</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="email">Email</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-[#F5F3EE] rounded-lg px-3 py-1.5 text-xs outline-none"
            >
              <option value="all">Todos status</option>
              <option value="open">Abertos ({openCount})</option>
              <option value="pending">Pendentes</option>
              <option value="resolved">Resolvidos</option>
            </select>
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => {
            const ChannelIcon = CHANNEL_CONFIG[conv.channel].icon;
            return (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={cn(
                  "w-full p-4 border-b border-[#E9E1D2] text-left hover:bg-[#F9F7F3] transition-colors",
                  selectedConversation?.id === conv.id && "bg-[#F3EEE3]"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium">
                      {conv.customer.name.charAt(0)}
                    </div>
                    <div
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center",
                        CHANNEL_CONFIG[conv.channel].color
                      )}
                    >
                      <ChannelIcon className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          "font-medium text-sm",
                          conv.unread ? "text-[#0F3A3E]" : "text-[#51635F]"
                        )}
                      >
                        {conv.customer.name}
                      </span>
                      <span className="text-xs text-[#8A938E]">{conv.lastMessageTime}</span>
                    </div>
                    <p
                      className={cn(
                        "text-sm truncate",
                        conv.unread ? "text-[#0F3A3E] font-medium" : "text-[#8A938E]"
                      )}
                    >
                      {conv.lastMessage}
                    </p>
                    {conv.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {conv.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-[#F5F3EE] text-[#51635F] px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Unread indicator */}
                  {conv.unread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#B07B1E] mt-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="hidden md:flex flex-1 flex-col bg-[#F9F7F3]">
          {/* Chat Header */}
          <div className="bg-white border-b border-[#E9E1D2] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium">
                {selectedConversation.customer.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-medium text-[#0F3A3E]">
                  {selectedConversation.customer.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#8A938E]">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px]",
                      CHANNEL_CONFIG[selectedConversation.channel].color
                    )}
                  >
                    {CHANNEL_CONFIG[selectedConversation.channel].label}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px]",
                      STATUS_CONFIG[selectedConversation.status].color
                    )}
                  >
                    {STATUS_CONFIG[selectedConversation.status].label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                <User className="h-5 w-5" />
              </button>
              <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                <Tag className="h-5 w-5" />
              </button>
              <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                <Star className="h-5 w-5" />
              </button>
              <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                <Archive className="h-5 w-5" />
              </button>
              <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {MOCK_MESSAGES.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === "agent" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-3",
                    message.sender === "agent"
                      ? "bg-[#0F3A3E] text-white rounded-br-md"
                      : "bg-white text-[#0F3A3E] rounded-bl-md shadow-sm"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-1",
                      message.sender === "agent" ? "justify-end" : "justify-start"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px]",
                        message.sender === "agent" ? "text-white/60" : "text-[#8A938E]"
                      )}
                    >
                      {message.timestamp}
                    </span>
                    {message.sender === "agent" && (
                      <CheckCheck
                        className={cn(
                          "h-3 w-3",
                          message.read ? "text-blue-400" : "text-white/60"
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white border-t border-[#E9E1D2] p-4">
            <div className="flex items-end gap-3">
              <button className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg">
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                className="p-3 bg-[#0F3A3E] text-white rounded-lg hover:bg-[#16504F] transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {/* Quick replies */}
            <div className="flex gap-2 mt-3">
              <button className="text-xs bg-[#F5F3EE] text-[#51635F] px-3 py-1.5 rounded-full hover:bg-[#E9E1D2] transition-colors">
                Olá! Como posso ajudar?
              </button>
              <button className="text-xs bg-[#F5F3EE] text-[#51635F] px-3 py-1.5 rounded-full hover:bg-[#E9E1D2] transition-colors">
                Um momento, vou verificar
              </button>
              <button className="text-xs bg-[#F5F3EE] text-[#51635F] px-3 py-1.5 rounded-full hover:bg-[#E9E1D2] transition-colors">
                Posso ajudar em algo mais?
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[#F9F7F3]">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 text-[#E9E1D2] mx-auto mb-4" />
            <p className="text-[#8A938E]">Selecione uma conversa para começar</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSAC;
