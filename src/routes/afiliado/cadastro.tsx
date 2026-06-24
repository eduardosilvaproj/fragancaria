import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AffiliateRegistrationForm, PixKeyType } from "@/types/affiliate";
import { affiliateAuth } from "@/lib/supabase";

export const Route = createFileRoute("/afiliado/cadastro")({
  head: () => ({
    meta: [
      { title: "Cadastro de Afiliado | Fragranciaria" },
      { name: "description", content: "Cadastre-se no programa de afiliados Fragranciaria e comece a ganhar comissões." },
    ],
  }),
  component: CadastroAfiliadoPage,
});

const STEPS = [
  { id: 1, title: "Dados Pessoais" },
  { id: 2, title: "Dados Bancários" },
  { id: 3, title: "Redes Sociais" },
  { id: 4, title: "Senha e Termos" },
];

const PIX_KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave Aleatória" },
  { value: "cnpj", label: "CNPJ" },
];

const BRAZILIAN_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
];

function CadastroAfiliadoPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<AffiliateRegistrationForm>({
    full_name: "",
    email: "",
    phone: "",
    cpf: "",
    birth_date: "",
    address_zip: "",
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    pix_key: "",
    pix_key_type: "cpf",
    instagram: "",
    youtube: "",
    tiktok: "",
    website: "",
    password: "",
    confirm_password: "",
    accepted_terms: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof AffiliateRegistrationForm, string>>>({});

  const updateField = (field: keyof AffiliateRegistrationForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Formatters
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .substring(0, 14);
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .substring(0, 15);
  };

  const formatCEP = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .substring(0, 9);
  };

  // CEP lookup
  const fetchAddress = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          address_street: data.logradouro || "",
          address_neighborhood: data.bairro || "",
          address_city: data.localidade || "",
          address_state: data.uf || "",
        }));
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof AffiliateRegistrationForm, string>> = {};

    if (step === 1) {
      if (!formData.full_name.trim()) newErrors.full_name = "Nome é obrigatório";
      if (!formData.email.trim()) newErrors.email = "E-mail é obrigatório";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "E-mail inválido";
      if (!formData.phone.trim()) newErrors.phone = "Telefone é obrigatório";
      if (!formData.cpf.trim()) newErrors.cpf = "CPF é obrigatório";
      else if (formData.cpf.replace(/\D/g, "").length !== 11) newErrors.cpf = "CPF inválido";
    }

    if (step === 2) {
      if (!formData.pix_key.trim()) newErrors.pix_key = "Chave Pix é obrigatória";
    }

    if (step === 4) {
      if (!formData.password) newErrors.password = "Senha é obrigatória";
      else if (formData.password.length < 8) newErrors.password = "Senha deve ter no mínimo 8 caracteres";
      if (formData.password !== formData.confirm_password) newErrors.confirm_password = "Senhas não conferem";
      if (!formData.accepted_terms) newErrors.accepted_terms = "Você deve aceitar os termos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      await affiliateAuth.register(formData);
      toast.success("Cadastro realizado com sucesso! Aguarde a aprovação.", {
        duration: 5000,
      });
      navigate({ to: "/afiliado/cadastro-sucesso" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "w-full px-4 py-3 bg-white border border-[#E0D8C7] text-[#0F3A3E] placeholder:text-[#8A938E] focus:border-[#B07B1E] focus:ring-1 focus:ring-[#B07B1E] outline-none transition-colors text-[14px]";

  const labelClassName = "block text-[12px] uppercase tracking-[0.1em] text-[#51635F] mb-2";

  const errorClassName = "text-[12px] text-[#C4433A] mt-1";

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />

      <main className="py-12 md:py-20 px-6 md:px-14">
        <div className="max-w-[640px] mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <Link
              to="/seja-afiliado"
              className="inline-flex items-center gap-2 text-[12px] tracking-[0.1em] text-[#75827E] hover:text-[#0F3A3E] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <h1 className="font-serif text-[28px] md:text-[36px] text-[#0F3A3E]">
              Cadastro de Afiliado
            </h1>
            <p className="text-[14px] text-[#75827E] mt-2">
              Preencha seus dados para participar do programa
            </p>
          </div>

          {/* Steps Indicator */}
          <div className="flex items-center justify-between mb-10">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-medium transition-colors ${
                      currentStep > step.id
                        ? "bg-[#1C6B4A] text-white"
                        : currentStep === step.id
                        ? "bg-[#0F3A3E] text-white"
                        : "bg-[#E0D8C7] text-[#75827E]"
                    }`}
                  >
                    {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.1em] mt-2 hidden md:block ${
                      currentStep >= step.id ? "text-[#0F3A3E]" : "text-[#8A938E]"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-12 md:w-20 h-[2px] mx-2 ${
                      currentStep > step.id ? "bg-[#1C6B4A]" : "bg-[#E0D8C7]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white border border-[#E9E1D2] p-6 md:p-10">
            {/* Step 1: Dados Pessoais */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[20px] text-[#0F3A3E] mb-6">Dados Pessoais</h2>

                <div>
                  <label className={labelClassName}>Nome Completo *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => updateField("full_name", e.target.value)}
                    className={inputClassName}
                    placeholder="Seu nome completo"
                  />
                  {errors.full_name && <p className={errorClassName}>{errors.full_name}</p>}
                </div>

                <div>
                  <label className={labelClassName}>E-mail *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className={inputClassName}
                    placeholder="seu@email.com"
                  />
                  {errors.email && <p className={errorClassName}>{errors.email}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Telefone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", formatPhone(e.target.value))}
                      className={inputClassName}
                      placeholder="(00) 00000-0000"
                    />
                    {errors.phone && <p className={errorClassName}>{errors.phone}</p>}
                  </div>
                  <div>
                    <label className={labelClassName}>CPF *</label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) => updateField("cpf", formatCPF(e.target.value))}
                      className={inputClassName}
                      placeholder="000.000.000-00"
                    />
                    {errors.cpf && <p className={errorClassName}>{errors.cpf}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => updateField("birth_date", e.target.value)}
                    className={inputClassName}
                  />
                </div>

                <div className="pt-4 border-t border-[#E0D8C7]">
                  <h3 className="text-[14px] font-medium text-[#0F3A3E] mb-4">Endereço (opcional)</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClassName}>CEP</label>
                        <input
                          type="text"
                          value={formData.address_zip}
                          onChange={(e) => {
                            const formatted = formatCEP(e.target.value);
                            updateField("address_zip", formatted);
                            if (formatted.length === 9) fetchAddress(formatted);
                          }}
                          className={inputClassName}
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={labelClassName}>Rua</label>
                        <input
                          type="text"
                          value={formData.address_street}
                          onChange={(e) => updateField("address_street", e.target.value)}
                          className={inputClassName}
                          placeholder="Nome da rua"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClassName}>Número</label>
                        <input
                          type="text"
                          value={formData.address_number}
                          onChange={(e) => updateField("address_number", e.target.value)}
                          className={inputClassName}
                          placeholder="123"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={labelClassName}>Complemento</label>
                        <input
                          type="text"
                          value={formData.address_complement}
                          onChange={(e) => updateField("address_complement", e.target.value)}
                          className={inputClassName}
                          placeholder="Apto, bloco, etc"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClassName}>Bairro</label>
                        <input
                          type="text"
                          value={formData.address_neighborhood}
                          onChange={(e) => updateField("address_neighborhood", e.target.value)}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>Cidade</label>
                        <input
                          type="text"
                          value={formData.address_city}
                          onChange={(e) => updateField("address_city", e.target.value)}
                          className={inputClassName}
                        />
                      </div>
                      <div>
                        <label className={labelClassName}>Estado</label>
                        <select
                          value={formData.address_state}
                          onChange={(e) => updateField("address_state", e.target.value)}
                          className={inputClassName}
                        >
                          <option value="">UF</option>
                          {BRAZILIAN_STATES.map((state) => (
                            <option key={state.value} value={state.value}>
                              {state.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Dados Bancários */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[20px] text-[#0F3A3E] mb-6">Dados para Pagamento</h2>
                <p className="text-[14px] text-[#75827E] -mt-4 mb-6">
                  Informe sua chave Pix para receber as comissões.
                </p>

                <div>
                  <label className={labelClassName}>Tipo de Chave Pix *</label>
                  <select
                    value={formData.pix_key_type}
                    onChange={(e) => updateField("pix_key_type", e.target.value as PixKeyType)}
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
                  <label className={labelClassName}>Chave Pix *</label>
                  <input
                    type="text"
                    value={formData.pix_key}
                    onChange={(e) => updateField("pix_key", e.target.value)}
                    className={inputClassName}
                    placeholder={
                      formData.pix_key_type === "cpf"
                        ? "000.000.000-00"
                        : formData.pix_key_type === "email"
                        ? "seu@email.com"
                        : formData.pix_key_type === "phone"
                        ? "+55 00 00000-0000"
                        : "Cole sua chave aleatória"
                    }
                  />
                  {errors.pix_key && <p className={errorClassName}>{errors.pix_key}</p>}
                </div>

                <div className="bg-[#F8F4EA] p-4 border border-[#E0D8C7] mt-6">
                  <p className="text-[13px] text-[#51635F]">
                    <strong>Importante:</strong> Os pagamentos são realizados via Pix até o dia 15
                    de cada mês, referente às vendas confirmadas do mês anterior. O valor mínimo
                    para saque é de R$100,00.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Redes Sociais */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[20px] text-[#0F3A3E] mb-6">Redes Sociais</h2>
                <p className="text-[14px] text-[#75827E] -mt-4 mb-6">
                  Opcional, mas nos ajuda a conhecer seu trabalho.
                </p>

                <div>
                  <label className={labelClassName}>Instagram</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938E]">@</span>
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => updateField("instagram", e.target.value.replace("@", ""))}
                      className={`${inputClassName} pl-8`}
                      placeholder="seu.usuario"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>YouTube</label>
                  <input
                    type="text"
                    value={formData.youtube}
                    onChange={(e) => updateField("youtube", e.target.value)}
                    className={inputClassName}
                    placeholder="URL do seu canal"
                  />
                </div>

                <div>
                  <label className={labelClassName}>TikTok</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A938E]">@</span>
                    <input
                      type="text"
                      value={formData.tiktok}
                      onChange={(e) => updateField("tiktok", e.target.value.replace("@", ""))}
                      className={`${inputClassName} pl-8`}
                      placeholder="seu.usuario"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName}>Site / Blog</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    className={inputClassName}
                    placeholder="https://seusite.com"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Senha e Termos */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <h2 className="font-serif text-[20px] text-[#0F3A3E] mb-6">Criar Senha</h2>

                <div>
                  <label className={labelClassName}>Senha *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className={`${inputClassName} pr-12`}
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A938E] hover:text-[#0F3A3E]"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className={errorClassName}>{errors.password}</p>}
                </div>

                <div>
                  <label className={labelClassName}>Confirmar Senha *</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirm_password}
                      onChange={(e) => updateField("confirm_password", e.target.value)}
                      className={`${inputClassName} pr-12`}
                      placeholder="Digite a senha novamente"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A938E] hover:text-[#0F3A3E]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className={errorClassName}>{errors.confirm_password}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#E0D8C7]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.accepted_terms}
                      onChange={(e) => updateField("accepted_terms", e.target.checked)}
                      className="mt-1 h-4 w-4 border-[#E0D8C7] text-[#0F3A3E] focus:ring-[#B07B1E]"
                    />
                    <span className="text-[13px] text-[#51635F]">
                      Li e aceito os{" "}
                      <Link
                        to="/termos"
                        target="_blank"
                        className="text-[#B07B1E] hover:underline"
                      >
                        Termos de Uso
                      </Link>{" "}
                      e a{" "}
                      <Link
                        to="/privacidade"
                        target="_blank"
                        className="text-[#B07B1E] hover:underline"
                      >
                        Política de Privacidade
                      </Link>{" "}
                      do Programa de Afiliados Fragranciaria. *
                    </span>
                  </label>
                  {errors.accepted_terms && (
                    <p className={`${errorClassName} mt-2`}>{errors.accepted_terms}</p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-10 pt-6 border-t border-[#E0D8C7]">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 text-[13px] tracking-[0.1em] text-[#51635F] hover:text-[#0F3A3E] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] text-white px-6 py-3 text-[13px] tracking-[0.14em] uppercase font-medium transition-colors"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#B07B1E] hover:bg-[#C68C28] disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 text-[13px] tracking-[0.14em] uppercase font-medium transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Finalizar Cadastro
                      <Check className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Login Link */}
          <p className="text-center text-[13px] text-[#75827E] mt-6">
            Já tem cadastro?{" "}
            <Link to="/afiliado/login" className="text-[#B07B1E] hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </main>

      <FooterEditorial />
    </div>
  );
}
