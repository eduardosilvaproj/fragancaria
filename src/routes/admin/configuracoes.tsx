import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VitrineManager } from "@/components/admin/VitrineManager";

export const Route = createFileRoute("/admin/configuracoes")({
  component: AdminConfiguracoes,
});

function AdminConfiguracoes() {
  const [activeSection, setActiveSection] = useState<string>("loja");
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText("sk_live_xxxxxxxxxxxxx");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          {activeSection === "loja" && (
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Dados da Loja
              </h3>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Nome da Loja
                  </label>
                  <input
                    type="text"
                    defaultValue="Fragranciaria"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    defaultValue="12.345.678/0001-90"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Email de Contato
                  </label>
                  <input
                    type="email"
                    defaultValue="contato@fragranciaria.com.br"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    defaultValue="(11) 99999-9999"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    defaultValue="Rua das Flores, 123 - Centro - São Paulo/SP"
                    className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          )}

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
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Configurações de Frete
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Valor mínimo para frete grátis
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#8A938E]">R$</span>
                    <input
                      type="number"
                      defaultValue="199"
                      className="w-32 bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Prazo de envio (dias úteis)
                  </label>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-xs text-[#8A938E]">Mínimo</span>
                      <input
                        type="number"
                        defaultValue="3"
                        className="w-20 bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none ml-2"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-[#8A938E]">Máximo</span>
                      <input
                        type="number"
                        defaultValue="10"
                        className="w-20 bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none ml-2"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Transportadoras
                  </label>
                  <div className="space-y-2">
                    {["Correios", "Jadlog", "Total Express"].map((t) => (
                      <div
                        key={t}
                        className="flex items-center gap-3 p-3 bg-[#F9F7F3] rounded-lg"
                      >
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-[#0F3A3E]">{t}</span>
                      </div>
                    ))}
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

          {activeSection === "seguranca" && (
            <div className="bg-white border border-[#E9E1D2] p-6">
              <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">
                Segurança
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Alterar Senha
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="password"
                      placeholder="Senha atual"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                    <input
                      type="password"
                      placeholder="Nova senha"
                      className="w-full bg-[#F5F3EE] rounded-lg px-4 py-3 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Autenticação de Dois Fatores
                  </label>
                  <div className="flex items-center justify-between p-4 bg-[#F9F7F3] rounded-lg">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">2FA Ativado</p>
                      <p className="text-sm text-[#8A938E]">
                        Proteção extra para sua conta
                      </p>
                    </div>
                    <button className="w-12 h-6 bg-emerald-500 rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-2">
                    Sessões Ativas
                  </label>
                  <div className="border border-[#E9E1D2] rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[#0F3A3E]">Chrome - Windows</p>
                        <p className="text-xs text-[#8A938E]">
                          São Paulo, Brasil • Ativo agora
                        </p>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                        Sessão atual
                      </span>
                    </div>
                  </div>
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
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">Shopify</p>
                      <p className="text-sm text-emerald-600">✓ Conectado</p>
                    </div>
                    <button className="text-sm text-red-500 hover:underline">
                      Desconectar
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#8A938E] mb-1">
                      API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value="sk_live_xxxxxxxxxxxxx"
                        readOnly
                        className="flex-1 bg-[#F5F3EE] rounded-lg px-4 py-2 text-sm outline-none font-mono"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-2 text-[#51635F] hover:bg-[#F5F3EE] rounded-lg"
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={handleCopyKey}
                        className="p-2 text-[#51635F] hover:bg-[#F5F3EE] rounded-lg"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-[#E9E1D2] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">Google Analytics</p>
                      <p className="text-sm text-emerald-600">✓ Conectado</p>
                    </div>
                    <button className="text-sm text-[#B07B1E] hover:underline">
                      Configurar
                    </button>
                  </div>
                </div>

                <div className="border border-[#E9E1D2] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#0F3A3E]">Meta Pixel</p>
                      <p className="text-sm text-[#8A938E]">Não conectado</p>
                    </div>
                    <button className="text-sm text-[#B07B1E] hover:underline">
                      Conectar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "vitrine" && <VitrineManager />}
        </div>
      </div>
    </div>
  );
}

export default AdminConfiguracoes;
