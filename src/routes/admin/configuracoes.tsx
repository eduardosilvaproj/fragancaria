import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Settings,
  Store,
  Palette,
  Bell,
  Shield,
  Globe,
  CreditCard,
  Truck,
  Mail,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  LayoutGrid,
  Package,
  Info,
  FileText,
  AlertCircle,
  CheckCircle,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VitrineManager } from "@/components/admin/VitrineManager";
import { NfeSection } from "@/components/admin/NfeSection";
import {
  getShippingSettings,
  updateShippingSetting,
  type ShippingSettings,
} from "@/lib/shipping-settings.functions";
import {
  getNfeSettings,
  saveNfeSettings,
  type NfeSettings,
  type NfeEndereco,
} from "@/lib/nfe.functions";
import {
  getAffiliateSettings,
  saveAffiliateSettings,
} from "@/lib/affiliate-settings.functions";
import {
  getStoreSettings,
  updateStoreSettings,
  type UpdateStoreSettingsInput,
} from "@/lib/store-settings.functions";
import { STORE_CONFIG_QUERY_KEY } from "@/lib/use-store-config";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminConfiguracoes,
});

function AdminConfiguracoes() {
  const [activeSection, setActiveSection] = useState<string>("loja");
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  // =====================================================
  // SHIPPING SETTINGS
  // =====================================================

  const listFn = useServerFn(getShippingSettings);
  const settingsQuery = useQuery({
    queryKey: ["shipping-settings"],
    queryFn: () => listFn({}),
    enabled: activeSection === "frete",
  });

  const settings: ShippingSettings | null = settingsQuery.data?.success
    ? settingsQuery.data.data
    : null;

  const updateFn = useServerFn(updateShippingSetting);
  const updateMutation = useMutation({
    mutationFn: async (payload: { key: string; value: unknown }) => {
      return updateFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      queryClient.invalidateQueries({ queryKey: ["shipping-settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao salvar");
    },
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText("sk_live_xxxxxxxxxxxxx");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShippingSetting = (key: string, value: unknown) => {
    updateMutation.mutate({ key, value });
  };

  const handleCarrierToggle = (carrierId: string, enabled: boolean) => {
    if (!settings) return;
    const updatedCarriers = settings.carriers.map((c) =>
      c.id === carrierId ? { ...c, enabled } : c
    );
    handleShippingSetting("carriers", updatedCarriers);
  };

  const sections = [
    { id: "loja", label: "Dados da Loja", icon: Store },
    { id: "aparencia", label: "Aparência", icon: Palette },
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "pagamentos", label: "Pagamentos", icon: CreditCard },
    { id: "frete", label: "Frete", icon: Truck },
    { id: "email", label: "Email", icon: Mail },
    { id: "seguranca", label: "Segurança", icon: Shield },
    { id: "integracoes", label: "Integrações", icon: Globe },
    { id: "vitrine", label: "Vitrine da Home", icon: LayoutGrid },
    { id: "nfe", label: "Nota Fiscal", icon: FileText },
    { id: "afiliados", label: "Afiliados", icon: Users },
  ];

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Sistema
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
            Configurações
          </h1>
        </div>

        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors",
            saved
              ? "bg-emerald-500 text-white"
              : "bg-[#0F3A3E] text-white hover:bg-[#16504F]"
          )}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-[250px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="bg-white border border-[#E9E1D2] p-2 h-fit">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                activeSection === section.id
                  ? "bg-[#0F3A3E] text-white"
                  : "text-[#51635F] hover:bg-[#F5F3EE]"
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="space-y-6">
          {activeSection === "loja" && <LojaSection />}

          {activeSection === "aparencia" && (
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Aparência
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Cor Primária
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      defaultValue="#0F3A3E"
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      defaultValue="#0F3A3E"
                      className="bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none w-32"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Cor de Destaque
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      defaultValue="#B07B1E"
                      className="w-12 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      defaultValue="#B07B1E"
                      className="bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none w-32"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Logo
                  </label>
                  <div className="border-2 border-dashed border-[#E9E1D2] rounded-lg p-8 text-center">
                    <img
                      src="/images/logo.png"
                      alt="Logo"
                      className="h-12 mx-auto mb-4"
                    />
                    <button className="text-sm text-[#B07B1E] hover:underline">
                      Alterar logo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "notificacoes" && (
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Notificações
              </h3>

              <div className="space-y-4">
                {[
                  { label: "Novo pedido", desc: "Receber notificação a cada novo pedido" },
                  { label: "Carrinho abandonado", desc: "Alertar sobre carrinhos abandonados há mais de 2h" },
                  { label: "Estoque baixo", desc: "Alertar quando produto atingir estoque mínimo" },
                  { label: "Novo afiliado", desc: "Notificar quando novo afiliado solicitar aprovação" },
                  { label: "Nova mensagem SAC", desc: "Alertar sobre novas mensagens de clientes" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-4 bg-[#F9F7F3] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[#0F3A3E]">{item.label}</p>
                      <p className="text-sm text-[#8A938E]">{item.desc}</p>
                    </div>
                    <button className="w-12 h-6 bg-emerald-500 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "pagamentos" && (
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Métodos de Pagamento
              </h3>

              <div className="space-y-4">
                {[
                  { name: "Pix", desc: "Pagamento instantâneo", enabled: true },
                  { name: "Cartão de Crédito", desc: "Visa, Mastercard, Elo, Amex", enabled: true },
                  { name: "Boleto Bancário", desc: "Vencimento em 3 dias úteis", enabled: true },
                  { name: "Mercado Pago", desc: "Integração externa", enabled: false },
                ].map((method) => (
                  <div
                    key={method.name}
                    className="flex items-center justify-between p-4 border border-[#E9E1D2] rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-[#0F3A3E]">{method.name}</p>
                      <p className="text-sm text-[#8A938E]">{method.desc}</p>
                    </div>
                    <button
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-colors",
                        method.enabled ? "bg-emerald-500" : "bg-gray-300"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          method.enabled ? "right-1" : "left-1"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "frete" && (
            <div className="space-y-6">
              {/* Aviso sobre Melhor Envio */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Integração com o Melhor Envio</p>
                    <p className="text-sm text-blue-700 mt-1">
                      As transportadoras e os valores de frete são gerenciados pelo Melhor Envio.
                      O frete grátis é configurado abaixo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Frete Grátis */}
              <div className="bg-white border border-[#E9E1D2] p-6">
                <h3 className="font-serif text-lg text-[#0F3A3E] mb-6 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Frete Grátis
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#F9F7F3] rounded-lg">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">Ativar frete grátis</p>
                      <p className="text-sm text-[#8A938E]">
                        Oferecer frete grátis para pedidos acima do valor definido
                      </p>
                    </div>
                    <button
                      onClick={() => handleShippingSetting("freeShippingThreshold", {
                        ...settings,
                        enabled: !settings?.freeShippingEnabled,
                        value: settings?.freeShippingThreshold ?? 199,
                      })}
                      className={cn(
                        "w-12 h-6 rounded-full relative transition-colors",
                        settings?.freeShippingEnabled ? "bg-emerald-500" : "bg-gray-300"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          settings?.freeShippingEnabled ? "right-1" : "left-1"
                        )}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Valor mínimo para frete grátis (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-[#8A938E]">R$</span>
                      <input
                        type="number"
                        value={settings?.freeShippingThreshold ?? 199}
                        onChange={(e) => handleShippingSetting("freeShippingThreshold", {
                          ...settings,
                          enabled: settings?.freeShippingEnabled ?? true,
                          value: parseFloat(e.target.value || "0"),
                        })}
                        className="w-32 bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                        step="1"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* Dados do Remetente */}
              <div className="bg-white border border-[#E9E1D2] p-6">
                <h3 className="font-serif text-lg text-[#0F3A3E] mb-6 flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Dados do Remetente (para etiquetas)
                </h3>

                <p className="text-sm text-[#8A938E] mb-6">
                  Dados utilizados na emissão de etiquetas de postagem via Correios.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Nome / Razão Social
                    </label>
                    <input
                      type="text"
                      value={settings?.senderInfo?.name || "Fragranciaria"}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        name: e.target.value,
                      })}
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={settings?.senderInfo?.document || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        document: e.target.value,
                      })}
                      placeholder="00.000.000/0000-00"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={settings?.senderInfo?.phone || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        phone: e.target.value,
                      })}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={settings?.senderInfo?.email || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        email: e.target.value,
                      })}
                      placeholder="contato@fragranciaria.com"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={settings?.senderInfo?.address?.postal_code || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        address: {
                          ...settings?.senderInfo?.address,
                          postal_code: e.target.value,
                        },
                      })}
                      placeholder="01310100"
                      className="w-40 bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={settings?.senderInfo?.address?.street || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        address: {
                          ...settings?.senderInfo?.address,
                          street: e.target.value,
                        },
                      })}
                      placeholder="Rua, número"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={settings?.senderInfo?.address?.complement || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        address: {
                          ...settings?.senderInfo?.address,
                          complement: e.target.value,
                        },
                      })}
                      placeholder="Sala, andar, etc"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={settings?.senderInfo?.address?.neighborhood || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        address: {
                          ...settings?.senderInfo?.address,
                          neighborhood: e.target.value,
                        },
                      })}
                      placeholder="Bairro"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={settings?.senderInfo?.address?.city || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        address: {
                          ...settings?.senderInfo?.address,
                          city: e.target.value,
                        },
                      })}
                      placeholder="Cidade"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                      Estado
                    </label>
                    <select
                      value={settings?.senderInfo?.address?.state || ""}
                      onChange={(e) => handleShippingSetting("senderInfo", {
                        ...settings?.senderInfo,
                        address: {
                          ...settings?.senderInfo?.address,
                          state: e.target.value,
                        },
                      })}
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    >
                      <option value="">Selecione</option>
                      <option value="AC">AC - Acre</option>
                      <option value="AL">AL - Alagoas</option>
                      <option value="AP">AP - Amapá</option>
                      <option value="AM">AM - Amazonas</option>
                      <option value="BA">BA - Bahia</option>
                      <option value="CE">CE - Ceará</option>
                      <option value="DF">DF - Distrito Federal</option>
                      <option value="ES">ES - Espírito Santo</option>
                      <option value="GO">GO - Goiás</option>
                      <option value="MA">MA - Maranhão</option>
                      <option value="MT">MT - Mato Grosso</option>
                      <option value="MS">MS - Mato Grosso do Sul</option>
                      <option value="MG">MG - Minas Gerais</option>
                      <option value="PA">PA - Pará</option>
                      <option value="PB">PB - Paraíba</option>
                      <option value="PR">PR - Paraná</option>
                      <option value="PE">PE - Pernambuco</option>
                      <option value="PI">PI - Piauí</option>
                      <option value="RJ">RJ - Rio de Janeiro</option>
                      <option value="RN">RN - Rio Grande do Norte</option>
                      <option value="RS">RS - Rio Grande do Sul</option>
                      <option value="RO">RO - Rondônia</option>
                      <option value="RR">RR - Roraima</option>
                      <option value="SC">SC - Santa Catarina</option>
                      <option value="SP">SP - São Paulo</option>
                      <option value="SE">SE - Sergipe</option>
                      <option value="TO">TO - Tocantins</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "email" && (
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Configurações de Email
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Servidor SMTP
                  </label>
                  <input
                    type="text"
                    defaultValue="smtp.sendgrid.net"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Porta
                  </label>
                  <input
                    type="text"
                    defaultValue="587"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Usuário
                  </label>
                  <input
                    type="text"
                    defaultValue="apikey"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Email Remetente
                  </label>
                  <input
                    type="email"
                    defaultValue="noreply@fragranciaria.com.br"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "integracoes" && (
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Integrações
              </h3>

              <div className="space-y-4">
                <div className="border border-[#E9E1D2] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">Google Analytics</p>
                      <p className={cn("text-sm", import.meta.env.VITE_GA_MEASUREMENT_ID ? "text-emerald-600" : "text-[#8A938E]")}>
                        {import.meta.env.VITE_GA_MEASUREMENT_ID ? "✓ Configurado" : "Não configurado"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border border-[#E9E1D2] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">Meta Pixel</p>
                      <p className={cn("text-sm", import.meta.env.VITE_META_PIXEL_ID ? "text-emerald-600" : "text-[#8A938E]")}>
                        {import.meta.env.VITE_META_PIXEL_ID ? "✓ Configurado" : "Não configurado"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "vitrine" && <VitrineManager />}

          {activeSection === "nfe" && <NfeSection />}

          {activeSection === "afiliados" && <AfiliadosSection />}
        </div>
      </div>
    </div>
  );
}

export default AdminConfiguracoes;

// =====================================================
// AFILIADOS SECTION
// =====================================================

function AfiliadosSection() {
  const queryClient = useQueryClient();

  const getFn = useServerFn(getAffiliateSettings);
  const saveFn = useServerFn(saveAffiliateSettings);

  const { data: result, isLoading } = useQuery({
    queryKey: ["affiliate-settings"],
    queryFn: () => getFn({}),
  });

  const settings = result?.success ? result.data : null;

  const [form, setForm] = useState({ releaseDelayDays: "15", minPayoutAmount: "50" });

  useEffect(() => {
    if (settings) {
      setForm({
        releaseDelayDays: String(settings.releaseDelayDays),
        minPayoutAmount: String(settings.minPayoutAmount),
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { releaseDelayDays: number; minPayoutAmount: number }) =>
      saveFn({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Configurações de afiliados salvas!");
        queryClient.invalidateQueries({ queryKey: ["affiliate-settings"] });
      } else {
        toast.error(res.error || "Erro ao salvar");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dias = Number(form.releaseDelayDays);
    const minimo = Number(form.minPayoutAmount);

    if (!Number.isInteger(dias) || dias < 0 || dias > 365) {
      toast.error("Prazo de liberação deve ser um número inteiro entre 0 e 365 dias");
      return;
    }
    if (!Number.isFinite(minimo) || minimo < 0) {
      toast.error("Valor mínimo de repasse inválido");
      return;
    }

    saveMutation.mutate({ releaseDelayDays: dias, minPayoutAmount: minimo });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="h-5 w-40 bg-[#F5F3EE] animate-pulse rounded" />
      </div>
    );
  }

  if (result && !result.success) {
    return (
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Não foi possível carregar as configurações: {result.error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E9E1D2] p-6">
      <h3 className="font-serif text-lg text-[#0F3A3E] mb-1">Repasse de Comissões</h3>
      <p className="text-sm text-[#8A938E] mb-6">
        Define quando a comissão de um afiliado fica disponível e qual o valor mínimo para
        gerar um repasse.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="release-delay-days"
              className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2"
            >
              Prazo de liberação (dias corridos após a aprovação do pagamento)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="release-delay-days"
                type="number"
                min={0}
                max={365}
                step={1}
                value={form.releaseDelayDays}
                onChange={(e) => setForm((f) => ({ ...f, releaseDelayDays: e.target.value }))}
                className="w-28 bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
              />
              <span className="text-sm text-[#51635F]">dias corridos</span>
            </div>
            <p className="mt-2 text-xs text-[#8A938E]">
              Contados a partir da data em que o pagamento do pedido foi aprovado. Antes
              disso a comissão aparece como <strong>Pendente</strong>; depois, como{" "}
              <strong>Disponível</strong>. Não confunde com o campo{" "}
              <code className="bg-[#F5F3EE] px-1 rounded">payout_day</code> (dia do mês), que
              existe no banco mas segue sem uso.
            </p>
          </div>

          <div>
            <label
              htmlFor="min-payout-amount"
              className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2"
            >
              Valor mínimo para repasse
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#51635F]">R$</span>
              <input
                id="min-payout-amount"
                type="number"
                min={0}
                step="0.01"
                value={form.minPayoutAmount}
                onChange={(e) => setForm((f) => ({ ...f, minPayoutAmount: e.target.value }))}
                className="w-32 bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-[#8A938E]">
              O fechamento só gera repasse para o afiliado cuja soma de comissões disponíveis
              alcança este valor. Abaixo dele, as comissões seguem acumulando.
            </p>
          </div>
        </div>

        <div className="border-t border-[#E9E1D2] pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#16504F] disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Configurações
          </button>
        </div>
      </form>
    </div>
  );
}

// =====================================================
// DADOS DA LOJA (store_settings)
// =====================================================

/**
 * Edita store_settings: loja física + contato público.
 *
 * ATENÇÃO ao escopo: NADA aqui alimenta fiscal ou frete.
 *   - endereço FISCAL (NF-e)     -> aba "Nota Fiscal" (nfe_settings)
 *   - ORIGEM do frete (cotação)  -> env MELHOR_ENVIO_FROM_CEP
 *   - remetente da etiqueta      -> aba "Frete" (shipping_settings.sender_info)
 * O endereço desta aba é o da LOJA FÍSICA, que é outro lugar: o CD não atende
 * público. Trocar um pelo outro quebra emissão de nota ou muda o preço de todo
 * frete calculado.
 *
 * Esta tela ERA decorativa: inputs não-controlados com defaultValue hardcoded e
 * um "Salvar" que só piscava sem persistir. Agora carrega de getStoreSettings e
 * grava por updateStoreSettings.
 */
function LojaSection() {
  const queryClient = useQueryClient();
  const getFn = useServerFn(getStoreSettings);
  const saveFn = useServerFn(updateStoreSettings);

  const { data: result, isLoading } = useQuery({
    queryKey: ["store-settings"],
    queryFn: () => getFn({}),
  });

  const settings = result?.success ? result.data : null;

  // Form separado da query: o admin digita sem que um refetch sobrescreva o que
  // está sendo editado. O useEffect abaixo sincroniza quando os dados chegam.
  const [form, setForm] = useState({
    lojaAberta: false,
    enderecoRua: "",
    enderecoNumero: "",
    enderecoBairro: "",
    enderecoCidade: "",
    enderecoUf: "",
    enderecoCep: "",
    horarioSemana: "",
    horarioSabado: "",
    fotoUrl: "",
    telefone: "",
    whatsapp: "",
    email: "",
    cnpj: "",
  });

  useEffect(() => {
    if (!settings) return;
    setForm({
      lojaAberta: settings.lojaAberta,
      enderecoRua: settings.endereco.rua,
      enderecoNumero: settings.endereco.numero,
      enderecoBairro: settings.endereco.bairro,
      enderecoCidade: settings.endereco.cidade,
      enderecoUf: settings.endereco.uf,
      enderecoCep: settings.endereco.cep,
      horarioSemana: settings.horarios.semana,
      horarioSabado: settings.horarios.sabado,
      fotoUrl: settings.fotoUrl,
      telefone: settings.contato.telefone,
      whatsapp: settings.contato.whatsapp,
      email: settings.contato.email,
      cnpj: settings.contato.cnpj,
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateStoreSettingsInput) => saveFn({ data: payload }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Dados da loja salvos!");
        queryClient.invalidateQueries({ queryKey: ["store-settings"] });
        // Invalida a query pública TAMBÉM: é ela que o rodapé, os dois botões
        // de WhatsApp e a seção da loja física consomem. Sem isso, o admin
        // salvaria e a vitrine só mudaria depois de um reload manual.
        queryClient.invalidateQueries({ queryKey: STORE_CONFIG_QUERY_KEY });
      } else {
        toast.error(res.error || "Erro ao salvar");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // A coluna tem CHECK (endereco_uf = '' OR endereco_uf ~ '^[A-Z]{2}$'). O
    // servidor já normaliza para maiúscula, mas 3 letras ou dígito só o banco
    // pegaria — e o erro chegaria como mensagem crua do Postgres.
    const uf = form.enderecoUf.trim();
    if (uf !== "" && !/^[A-Za-z]{2}$/.test(uf)) {
      toast.error("UF deve ter exatamente 2 letras (ex: SP) ou ficar vazia");
      return;
    }

    saveMutation.mutate({ ...form, enderecoUf: uf });
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="h-5 w-40 bg-[#F5F3EE] animate-pulse rounded" />
      </div>
    );
  }

  if (result && !result.success) {
    return (
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Não foi possível carregar os dados da loja: {result.error}</span>
        </div>
      </div>
    );
  }

  const campo = "w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none";
  const rotulo = "block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2";

  return (
    <div className="bg-white border border-[#E9E1D2] p-6">
      <h3 className="font-serif text-lg text-[#0F3A3E] mb-1">Dados da Loja</h3>
      <p className="text-sm text-[#8A938E] mb-6">
        Endereço da loja física e dados de contato publicados no site (rodapé, página de
        Contato e seção da loja na home).
      </p>

      <div className="flex items-start gap-3 mb-6 p-4 bg-[#F5F3EE] rounded-lg">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-[#B07B1E]" />
        <p className="text-xs text-[#51635F] leading-relaxed">
          Estes campos são só de <strong>divulgação</strong>. O endereço fiscal da NF-e fica
          na aba <strong>Nota Fiscal</strong>, e a origem do frete no remetente da aba{" "}
          <strong>Frete</strong> — mudar aqui não afeta nota nem cálculo de frete.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle da inauguração */}
        <div className="flex items-center justify-between p-4 border border-[#E9E1D2] rounded-lg">
          <div>
            <p className="font-medium text-[#0F3A3E]">Loja aberta ao público</p>
            <p className="text-sm text-[#8A938E]">
              {form.lojaAberta
                ? 'O site mostra "Venha nos conhecer" com os horários abaixo.'
                : 'O site mostra "Inauguração em breve" e esconde os horários.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.lojaAberta}
            aria-label="Loja aberta ao público"
            onClick={() => setForm((f) => ({ ...f, lojaAberta: !f.lojaAberta }))}
            className={cn(
              "w-12 h-6 rounded-full relative transition-colors shrink-0",
              form.lojaAberta ? "bg-emerald-500" : "bg-gray-300"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                form.lojaAberta ? "right-1" : "left-1"
              )}
            />
          </button>
        </div>

        {/* Endereço da loja física */}
        <div>
          <h4 className="text-[11px] uppercase tracking-wider text-[#0F3A3E] font-semibold mb-4">
            Endereço da loja física
          </h4>
          <div className="grid md:grid-cols-6 gap-4">
            <div className="md:col-span-4">
              <label htmlFor="loja-rua" className={rotulo}>Rua / Avenida</label>
              <input
                id="loja-rua"
                type="text"
                value={form.enderecoRua}
                onChange={(e) => setForm((f) => ({ ...f, enderecoRua: e.target.value }))}
                className={campo}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="loja-numero" className={rotulo}>Número</label>
              <input
                id="loja-numero"
                type="text"
                value={form.enderecoNumero}
                onChange={(e) => setForm((f) => ({ ...f, enderecoNumero: e.target.value }))}
                className={campo}
              />
            </div>
            <div className="md:col-span-3">
              <label htmlFor="loja-bairro" className={rotulo}>Bairro</label>
              <input
                id="loja-bairro"
                type="text"
                value={form.enderecoBairro}
                onChange={(e) => setForm((f) => ({ ...f, enderecoBairro: e.target.value }))}
                className={campo}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="loja-cidade" className={rotulo}>Cidade</label>
              <input
                id="loja-cidade"
                type="text"
                value={form.enderecoCidade}
                onChange={(e) => setForm((f) => ({ ...f, enderecoCidade: e.target.value }))}
                className={campo}
              />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="loja-uf" className={rotulo}>UF</label>
              <input
                id="loja-uf"
                type="text"
                maxLength={2}
                placeholder="SP"
                value={form.enderecoUf}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enderecoUf: e.target.value.toUpperCase() }))
                }
                className={campo}
              />
            </div>
            <div className="md:col-span-3">
              <label htmlFor="loja-cep" className={rotulo}>CEP</label>
              <input
                id="loja-cep"
                type="text"
                value={form.enderecoCep}
                onChange={(e) => setForm((f) => ({ ...f, enderecoCep: e.target.value }))}
                className={campo}
              />
              <p className="mt-2 text-xs text-[#8A938E]">
                Opcional. Sem CEP o "Como chegar" continua funcionando pelo resto do endereço.
              </p>
            </div>
          </div>
        </div>

        {/* Horários */}
        <div className="border-t border-[#E9E1D2] pt-6">
          <h4 className="text-[11px] uppercase tracking-wider text-[#0F3A3E] font-semibold mb-4">
            Horário de atendimento
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="loja-horario-semana" className={rotulo}>Segunda a sexta</label>
              <input
                id="loja-horario-semana"
                type="text"
                placeholder="9h00 às 18h00"
                value={form.horarioSemana}
                onChange={(e) => setForm((f) => ({ ...f, horarioSemana: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="loja-horario-sabado" className={rotulo}>Sábado</label>
              <input
                id="loja-horario-sabado"
                type="text"
                placeholder="9h00 às 17h00"
                value={form.horarioSabado}
                onChange={(e) => setForm((f) => ({ ...f, horarioSabado: e.target.value }))}
                className={campo}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[#8A938E]">
            Texto livre — aparece exatamente como digitado. Só é publicado com a loja aberta.
          </p>
        </div>

        {/* Contato público */}
        <div className="border-t border-[#E9E1D2] pt-6">
          <h4 className="text-[11px] uppercase tracking-wider text-[#0F3A3E] font-semibold mb-4">
            Contato público
          </h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="loja-telefone" className={rotulo}>Telefone</label>
              <input
                id="loja-telefone"
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="loja-whatsapp" className={rotulo}>WhatsApp</label>
              <input
                id="loja-whatsapp"
                type="tel"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className={campo}
              />
              <p className="mt-2 text-xs text-[#8A938E]">
                Deixe vazio para esconder todos os botões de WhatsApp do site — melhor ausente
                que apontando para um número que não atende.
              </p>
            </div>
            <div>
              <label htmlFor="loja-email" className={rotulo}>E-mail de contato</label>
              <input
                id="loja-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="loja-cnpj" className={rotulo}>CNPJ</label>
              <input
                id="loja-cnpj"
                type="text"
                value={form.cnpj}
                onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                className={campo}
              />
              <p className="mt-2 text-xs text-[#8A938E]">
                Exibido no rodapé. Não é o cadastro fiscal da NF-e.
              </p>
            </div>
          </div>
        </div>

        {/* Foto */}
        <div className="border-t border-[#E9E1D2] pt-6">
          <label htmlFor="loja-foto" className={rotulo}>URL da foto da fachada</label>
          <input
            id="loja-foto"
            type="url"
            placeholder="https://..."
            value={form.fotoUrl}
            onChange={(e) => setForm((f) => ({ ...f, fotoUrl: e.target.value }))}
            className={campo}
          />
          <p className="mt-2 text-xs text-[#8A938E]">
            Vazio = a seção mostra um bloco verde com ícone de loja.
          </p>
        </div>

        <div className="border-t border-[#E9E1D2] pt-6 flex justify-end">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0F3A3E] text-white text-sm rounded-lg hover:bg-[#16504F] disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Dados da Loja
          </button>
        </div>
      </form>
    </div>
  );
}
