import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Share2,
  Camera,
  Globe,
  MessageCircle,
  Video,
  Sparkles,
  Calendar,
  Clock,
  Image,
  Type,
  Hash,
  Send,
  Eye,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/redes-sociais")({
  component: AdminRedesSociais,
});

interface ScheduledPost {
  id: string;
  content: string;
  image?: string;
  platform: "instagram" | "facebook" | "twitter";
  scheduledFor: string;
  status: "scheduled" | "published" | "failed";
}

const MOCK_POSTS: ScheduledPost[] = [
  {
    id: "1",
    content: "✨ Novidade na loja! Kit completo de tratamento capilar com 30% OFF. Aproveite! #cabelos #tratamento #beleza",
    image: "/images/products/kit-tratamento.jpg",
    platform: "instagram",
    scheduledFor: "2024-01-20 10:00",
    status: "scheduled",
  },
  {
    id: "2",
    content: "Seu cabelo merece o melhor! 💇‍♀️ Confira nossa linha profissional de coloração.",
    platform: "facebook",
    scheduledFor: "2024-01-20 14:00",
    status: "scheduled",
  },
  {
    id: "3",
    content: "Frete grátis para todo Brasil em compras acima de R$199! 🚚✨",
    platform: "instagram",
    scheduledFor: "2024-01-19 18:00",
    status: "published",
  },
];

const PLATFORM_CONFIG = {
  instagram: { icon: Camera, color: "bg-gradient-to-br from-purple-500 to-pink-500", label: "Instagram" },
  facebook: { icon: Globe, color: "bg-blue-600", label: "Facebook" },
  twitter: { icon: MessageCircle, color: "bg-sky-500", label: "Twitter" },
};

const STATUS_CONFIG = {
  scheduled: { label: "Agendado", color: "bg-amber-100 text-amber-700" },
  published: { label: "Publicado", color: "bg-emerald-100 text-emerald-700" },
  failed: { label: "Falhou", color: "bg-red-100 text-red-700" },
};

const CAPTION_TEMPLATES = [
  { label: "Promoção", emoji: "🔥", template: "🔥 OFERTA IMPERDÍVEL! [PRODUTO] com [DESCONTO]% OFF! Corre que é por tempo limitado. Link na bio! #promo #desconto" },
  { label: "Novidade", emoji: "✨", template: "✨ NOVIDADE NA LOJA! Chegou [PRODUTO]! [BENEFÍCIO]. Garanta já o seu! #novidade #lancamento" },
  { label: "Dica", emoji: "💡", template: "💡 DICA DO DIA: [DICA]. Você sabia disso? Conta pra gente nos comentários! #dicadodia #beleza" },
  { label: "Depoimento", emoji: "💬", template: "💬 A [CLIENTE] amou o resultado! \"[DEPOIMENTO]\" Quer ter esse resultado também? Link na bio! #clientefeliz" },
];

function AdminRedesSociais() {
  const [activeTab, setActiveTab] = useState<"generator" | "calendar" | "analytics">("generator");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"instagram" | "facebook" | "twitter">("instagram");
  const [productDescription, setProductDescription] = useState("");
  const [tone, setTone] = useState<"casual" | "profissional" | "divertido">("casual");

  const handleGenerate = () => {
    setIsGenerating(true);
    // Simular geração de IA
    setTimeout(() => {
      const captions = [
        "✨ Transforme seus fios com esse tratamento incrível! 💇‍♀️\n\nHidratação profunda + brilho intenso = cabelo dos sonhos!\n\n🛒 Link na bio\n📦 Frete grátis acima de R$199\n\n#cabelosdossonhos #tratamentocapilar #hidratacao #fragranciaria",
        "🔥 ALERTA DE OFERTA! 🔥\n\nSeu cabelo merece esse mimo! Kit completo de tratamento profissional com preço especial.\n\n✅ Produtos originais\n✅ Entrega rápida\n✅ Parcelamento em até 10x\n\n#oferta #promocao #cabeloperfeito",
        "💜 O segredo das madeixas perfeitas? Produtos de qualidade profissional!\n\nNa Fragranciaria você encontra as melhores marcas do mercado.\n\n👆 Link na bio para conferir!\n\n#fragranciaria #cabeloprofissional #beleza",
      ];
      setGeneratedCaption(captions[Math.floor(Math.random() * captions.length)]);
      setIsGenerating(false);
    }, 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Share2 className="h-6 w-6 text-[#B07B1E]" />
          <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
            Inteligência Artificial
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
          Redes Sociais IA
        </h1>
        <p className="text-[#51635F] mt-2">
          Gere legendas, agende posts e gerencie suas redes sociais com IA.
        </p>
      </div>

      {/* Connected Accounts */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-3">
          Contas Conectadas
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg">
            <Camera className="h-4 w-4" />
            <span className="text-sm">@fragranciaria</span>
            <Check className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
            <Globe className="h-4 w-4" />
            <span className="text-sm">Fragranciaria</span>
            <Check className="h-4 w-4" />
          </div>
          <button className="flex items-center gap-2 border border-dashed border-[#E9E1D2] text-[#8A938E] px-4 py-2 rounded-lg hover:border-[#B07B1E] hover:text-[#B07B1E] transition-colors">
            <Plus className="h-4 w-4" />
            <span className="text-sm">Conectar conta</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F5F3EE] p-1 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab("generator")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "generator"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Wand2 className="h-4 w-4 inline mr-2" />
          Gerador IA
        </button>
        <button
          onClick={() => setActiveTab("calendar")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "calendar"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Agendamentos
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-colors",
            activeTab === "analytics"
              ? "bg-white text-[#0F3A3E] shadow-sm"
              : "text-[#51635F] hover:text-[#0F3A3E]"
          )}
        >
          <Eye className="h-4 w-4 inline mr-2" />
          Performance
        </button>
      </div>

      {/* Generator Tab */}
      {activeTab === "generator" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-6">
            {/* Platform Selection */}
            <div className="bg-white border border-[#E9E1D2] p-4">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-3">
                Plataforma
              </label>
              <div className="flex gap-3">
                {(["instagram", "facebook", "twitter"] as const).map((platform) => {
                  const config = PLATFORM_CONFIG[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors",
                        selectedPlatform === platform
                          ? "border-[#B07B1E] bg-[#B07B1E]/5"
                          : "border-[#E9E1D2] hover:border-[#B07B1E]/50"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded flex items-center justify-center", config.color)}>
                        <config.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-sm text-[#0F3A3E]">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product/Topic */}
            <div className="bg-white border border-[#E9E1D2] p-4">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-3">
                Sobre o que é o post?
              </label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Ex: Kit de tratamento capilar com shampoo, condicionador e máscara. Ideal para cabelos danificados. Promoção de 30% OFF."
                rows={4}
                className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none resize-none"
              />
            </div>

            {/* Tone */}
            <div className="bg-white border border-[#E9E1D2] p-4">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-3">
                Tom da mensagem
              </label>
              <div className="flex gap-2">
                {[
                  { value: "casual", label: "😊 Casual" },
                  { value: "profissional", label: "👔 Profissional" },
                  { value: "divertido", label: "🎉 Divertido" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value as any)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm transition-colors",
                      tone === t.value
                        ? "bg-[#0F3A3E] text-white"
                        : "bg-[#F5F3EE] text-[#51635F] hover:bg-[#E9E1D2]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Templates */}
            <div className="bg-white border border-[#E9E1D2] p-4">
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-3">
                Templates rápidos
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CAPTION_TEMPLATES.map((template) => (
                  <button
                    key={template.label}
                    onClick={() => setGeneratedCaption(template.template)}
                    className="flex items-center gap-2 p-3 bg-[#F5F3EE] rounded-lg text-left hover:bg-[#E9E1D2] transition-colors"
                  >
                    <span className="text-xl">{template.emoji}</span>
                    <span className="text-sm text-[#0F3A3E]">{template.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-r from-[#B07B1E] to-[#D4A853] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 inline mr-2 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 inline mr-2" />
                  Gerar Legenda com IA
                </>
              )}
            </button>
          </div>

          {/* Output */}
          <div className="bg-white border border-[#E9E1D2] overflow-hidden">
            <div className="p-4 border-b border-[#E9E1D2] flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#0F3A3E]">Resultado</h3>
              {generatedCaption && (
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg"
                    title="Gerar novamente"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-2 text-[#51635F] hover:bg-[#F3EEE3] rounded-lg"
                    title="Copiar"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4">
              {generatedCaption ? (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="bg-[#F9F7F3] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center">
                        <span className="text-white font-bold text-sm">F</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-[#0F3A3E]">fragranciaria</p>
                        <p className="text-xs text-[#8A938E]">Agora</p>
                      </div>
                    </div>
                    <div className="bg-gray-200 w-full h-48 rounded-lg mb-3 flex items-center justify-center">
                      <Image className="h-12 w-12 text-gray-400" />
                    </div>
                    <p className="text-sm text-[#0F3A3E] whitespace-pre-wrap">
                      {generatedCaption}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 bg-[#0F3A3E] text-white rounded-lg text-sm hover:bg-[#16504F] transition-colors">
                      <Send className="h-4 w-4 inline mr-2" />
                      Publicar Agora
                    </button>
                    <button className="flex-1 py-3 border border-[#E9E1D2] text-[#0F3A3E] rounded-lg text-sm hover:bg-[#F9F7F3] transition-colors">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Agendar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <Sparkles className="h-16 w-16 text-[#E9E1D2] mx-auto mb-4" />
                  <p className="text-[#8A938E]">
                    Preencha as informações e clique em "Gerar Legenda"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="p-4 border-b border-[#E9E1D2] flex items-center justify-between">
            <h3 className="font-serif text-lg text-[#0F3A3E]">Posts Agendados</h3>
            <button className="flex items-center gap-2 bg-[#0F3A3E] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#16504F] transition-colors">
              <Plus className="h-4 w-4" />
              Novo Post
            </button>
          </div>

          <div className="divide-y divide-[#E9E1D2]">
            {MOCK_POSTS.map((post) => {
              const PlatformIcon = PLATFORM_CONFIG[post.platform].icon;
              return (
                <div key={post.id} className="p-4 hover:bg-[#F9F7F3] transition-colors">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        PLATFORM_CONFIG[post.platform].color
                      )}
                    >
                      <PlatformIcon className="h-5 w-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-[#0F3A3E]">
                          {PLATFORM_CONFIG[post.platform].label}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full",
                            STATUS_CONFIG[post.status].color
                          )}
                        >
                          {STATUS_CONFIG[post.status].label}
                        </span>
                      </div>
                      <p className="text-sm text-[#51635F] line-clamp-2 mb-2">{post.content}</p>
                      <div className="flex items-center gap-2 text-xs text-[#8A938E]">
                        <Clock className="h-3 w-3" />
                        <span>{post.scheduledFor}</span>
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
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E9E1D2] p-5">
            <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
              Alcance Total
            </p>
            <p className="font-serif text-2xl text-[#0F3A3E]">24.5K</p>
            <p className="text-xs text-emerald-600 mt-1">+18% vs mês anterior</p>
          </div>
          <div className="bg-white border border-[#E9E1D2] p-5">
            <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
              Engajamento
            </p>
            <p className="font-serif text-2xl text-[#0F3A3E]">4.2%</p>
            <p className="text-xs text-emerald-600 mt-1">+0.5% vs mês anterior</p>
          </div>
          <div className="bg-white border border-[#E9E1D2] p-5">
            <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
              Posts no Mês
            </p>
            <p className="font-serif text-2xl text-[#0F3A3E]">32</p>
            <p className="text-xs text-[#8A938E] mt-1">Meta: 40 posts</p>
          </div>
          <div className="bg-white border border-[#E9E1D2] p-5">
            <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
              Cliques no Link
            </p>
            <p className="font-serif text-2xl text-[#0F3A3E]">892</p>
            <p className="text-xs text-emerald-600 mt-1">+25% vs mês anterior</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRedesSociais;
