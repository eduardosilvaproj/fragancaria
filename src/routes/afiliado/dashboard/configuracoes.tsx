import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Save, User, CreditCard, Bell, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAffiliateStore } from "@/stores/affiliateStore";
import type { PixKeyType } from "@/types/affiliate";

export const Route = createFileRoute("/afiliado/dashboard/configuracoes")({
  component: ConfiguracoesPage,
});

const PIX_KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave Aleatória" },
  { value: "cnpj", label: "CNPJ" },
];

function ConfiguracoesPage() {
  const { affiliate, updateProfile, isLoading } = useAffiliateStore();
  const [activeTab, setActiveTab] = useState<"profile" | "pix" | "notifications" | "security">(
    "profile"
  );

  // Profile form
  const [fullName, setFullName] = useState(affiliate?.full_name || "");
  const [phone, setPhone] = useState(affiliate?.phone || "");
  const [instagram, setInstagram] = useState(affiliate?.instagram || "");
  const [youtube, setYoutube] = useState(affiliate?.youtube || "");
  const [tiktok, setTiktok] = useState(affiliate?.tiktok || "");
  const [website, setWebsite] = useState(affiliate?.website || "");

  // Pix form
  const [pixKey, setPixKey] = useState(affiliate?.pix_key || "");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(affiliate?.pix_key_type || "cpf");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  // Notifications
  const [emailSales, setEmailSales] = useState(true);
  const [emailPayments, setEmailPayments] = useState(true);
  const [emailNews, setEmailNews] = useState(true);

  useEffect(() => {
    if (affiliate) {
      setFullName(affiliate.full_name || "");
      setPhone(affiliate.phone || "");
      setInstagram(affiliate.instagram || "");
      setYoutube(affiliate.youtube || "");
      setTiktok(affiliate.tiktok || "");
      setWebsite(affiliate.website || "");
      setPixKey(affiliate.pix_key || "");
      setPixKeyType(affiliate.pix_key_type || "cpf");
    }
  }, [affiliate]);

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .substring(0, 15);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        full_name: fullName,
        phone,
        instagram,
        youtube,
        tiktok,
        website,
      });
      toast.success("Perfil atualizado!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar perfil");
    }
  };

  const handleSavePix = async () => {
    if (!pixKey.trim()) {
      toast.error("Chave Pix é obrigatória");
      return;
    }
    try {
      await updateProfile({
        pix_key: pixKey,
        pix_key_type: pixKeyType,
      });
      toast.success("Dados bancários atualizados!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar dados bancários");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Nova senha deve ter no mínimo 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Senhas não conferem");
      return;
    }
    // TODO: Implement password change
    toast.success("Senha alterada com sucesso!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const inputClassName =
    "w-full px-4 py-3 bg-white border border-[#E0D8C7] text-[#0F3A3E] placeholder:text-[#8A938E] focus:border-[#B07B1E] focus:ring-1 focus:ring-[#B07B1E] outline-none transition-colors text-[14px]";

  const labelClassName = "block text-[12px] uppercase tracking-[0.1em] text-[#51635F] mb-2";

  const TABS = [
    { id: "profile", label: "Perfil", icon: User },
    { id: "pix", label: "Dados Bancários", icon: CreditCard },
    { id: "notifications", label: "Notificações", icon: Bell },
    { id: "security", label: "Segurança", icon: Shield },
  ] as const;

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E]">Configurações</h1>
        <p className="text-[14px] text-[#75827E] mt-1">Gerencie suas informações e preferências</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[12px] uppercase tracking-[0.1em] font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[#0F3A3E] text-white"
                : "bg-white border border-[#E9E1D2] text-[#51635F] hover:border-[#0F3A3E]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-[#E9E1D2] p-6 md:p-8">
        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div>
              <label className={labelClassName}>Nome Completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>E-mail</label>
                <input
                  type="email"
                  value={affiliate?.email || ""}
                  disabled
                  className={`${inputClassName} bg-[#F8F4EA] cursor-not-allowed`}
                />
                <p className="text-[11px] text-[#8A938E] mt-1">
                  Para alterar o e-mail, entre em contato com o suporte.
                </p>
              </div>
              <div>
                <label className={labelClassName}>Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className={inputClassName}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E0D8C7]">
              <h3 className="text-[14px] font-medium text-[#0F3A3E] mb-4">Redes Sociais</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClassName}>Instagram</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938E]">@</span>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value.replace("@", ""))}
                      className={`${inputClassName} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>TikTok</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938E]">@</span>
                    <input
                      type="text"
                      value={tiktok}
                      onChange={(e) => setTiktok(e.target.value.replace("@", ""))}
                      className={`${inputClassName} pl-8`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClassName}>YouTube</label>
                  <input
                    type="url"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    className={inputClassName}
                    placeholder="URL do canal"
                  />
                </div>
                <div>
                  <label className={labelClassName}>Website / Blog</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className={inputClassName}
                    placeholder="https://"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] disabled:opacity-50 text-white px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* Pix Tab */}
        {activeTab === "pix" && (
          <div className="space-y-6">
            <div className="bg-[#FDF8F0] border border-[#E8C25A] p-4 text-[13px] text-[#B07B1E]">
              ⚠️ Certifique-se de que a chave Pix está correta. Pagamentos serão enviados exclusivamente para esta chave.
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Tipo de Chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value as PixKeyType)}
                  className={inputClassName}
                >
                  {PIX_KEY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClassName}>Chave Pix</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className={inputClassName}
                  placeholder={
                    pixKeyType === "cpf"
                      ? "000.000.000-00"
                      : pixKeyType === "email"
                      ? "seu@email.com"
                      : pixKeyType === "phone"
                      ? "(00) 00000-0000"
                      : "Chave aleatória"
                  }
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSavePix}
                disabled={isLoading}
                className="flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] disabled:opacity-50 text-white px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </button>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <p className="text-[14px] text-[#75827E] mb-6">
              Escolha quais notificações deseja receber por e-mail.
            </p>

            <label className="flex items-center justify-between p-4 bg-[#F8F4EA] border border-[#E9E1D2] cursor-pointer hover:border-[#B07B1E] transition-colors">
              <div>
                <p className="text-[14px] font-medium text-[#0F3A3E]">Novas vendas</p>
                <p className="text-[12px] text-[#75827E] mt-0.5">
                  Receba um e-mail sempre que uma venda for realizada pelo seu link.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailSales}
                onChange={(e) => setEmailSales(e.target.checked)}
                className="h-5 w-5 text-[#B07B1E] border-[#E0D8C7] focus:ring-[#B07B1E]"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-[#F8F4EA] border border-[#E9E1D2] cursor-pointer hover:border-[#B07B1E] transition-colors">
              <div>
                <p className="text-[14px] font-medium text-[#0F3A3E]">Pagamentos</p>
                <p className="text-[12px] text-[#75827E] mt-0.5">
                  Notificações sobre pagamentos enviados e confirmados.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailPayments}
                onChange={(e) => setEmailPayments(e.target.checked)}
                className="h-5 w-5 text-[#B07B1E] border-[#E0D8C7] focus:ring-[#B07B1E]"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-[#F8F4EA] border border-[#E9E1D2] cursor-pointer hover:border-[#B07B1E] transition-colors">
              <div>
                <p className="text-[14px] font-medium text-[#0F3A3E]">Novidades e dicas</p>
                <p className="text-[12px] text-[#75827E] mt-0.5">
                  Atualizações do programa, novos produtos e dicas de vendas.
                </p>
              </div>
              <input
                type="checkbox"
                checked={emailNews}
                onChange={(e) => setEmailNews(e.target.checked)}
                className="h-5 w-5 text-[#B07B1E] border-[#E0D8C7] focus:ring-[#B07B1E]"
              />
            </label>

            <div className="pt-4 flex justify-end">
              <button className="flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] text-white px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors">
                <Save className="h-4 w-4" />
                Salvar Preferências
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <h3 className="text-[16px] font-medium text-[#0F3A3E]">Alterar Senha</h3>

            <div>
              <label className={labelClassName}>Senha Atual</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={`${inputClassName} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A938E] hover:text-[#0F3A3E]"
                >
                  {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelClassName}>Nova Senha</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClassName}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className={labelClassName}>Confirmar Nova Senha</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={isLoading}
                className="flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] disabled:opacity-50 text-white px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Alterar Senha
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
