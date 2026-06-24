import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAffiliateStore } from "@/stores/affiliateStore";

export const Route = createFileRoute("/afiliado/login")({
  head: () => ({
    meta: [
      { title: "Login Afiliado | Fragranciaria" },
      { name: "description", content: "Acesse sua conta de afiliado Fragranciaria." },
    ],
  }),
  component: LoginAfiliadoPage,
});

function LoginAfiliadoPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAffiliateStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = "E-mail é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "E-mail inválido";
    if (!password) newErrors.password = "Senha é obrigatória";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login(email, password);
      toast.success("Login realizado com sucesso!");
      navigate({ to: "/afiliado/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    }
  };

  const inputClassName =
    "w-full px-4 py-3.5 bg-white border border-[#E0D8C7] text-[#0F3A3E] placeholder:text-[#8A938E] focus:border-[#B07B1E] focus:ring-1 focus:ring-[#B07B1E] outline-none transition-colors text-[14px]";

  const labelClassName = "block text-[12px] uppercase tracking-[0.1em] text-[#51635F] mb-2";

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      <NavbarEditorial />

      <main className="py-16 md:py-24 px-6 md:px-14">
        <div className="max-w-[440px] mx-auto">
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
              Portal do Afiliado
            </h1>
            <p className="text-[14px] text-[#75827E] mt-2">
              Acesse sua conta para gerenciar seus links e comissões
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-[#E9E1D2] p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClassName}>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={inputClassName}
                  placeholder="seu@email.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-[12px] text-[#C4433A] mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className={labelClassName}>Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    className={`${inputClassName} pr-12`}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8A938E] hover:text-[#0F3A3E]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[12px] text-[#C4433A] mt-1">{errors.password}</p>
                )}
              </div>

              <div className="text-right">
                <Link
                  to="/afiliado/recuperar-senha"
                  className="text-[13px] text-[#B07B1E] hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 text-[13px] tracking-[0.16em] uppercase font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>

          {/* Register Link */}
          <p className="text-center text-[13px] text-[#75827E] mt-6">
            Ainda não é afiliado?{" "}
            <Link to="/afiliado/cadastro" className="text-[#B07B1E] hover:underline">
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>
      </main>

      <FooterEditorial />
    </div>
  );
}
