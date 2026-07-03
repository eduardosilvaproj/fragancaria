import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAffiliateStore } from "@/stores/affiliateStore";
import { affiliateAuth } from "@/lib/supabase";

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

  const handleGoogleLogin = async () => {
    try {
      await affiliateAuth.signInWithGoogle();
      // O usuário será redirecionado para a página de autorização do Google
      // e depois de volta para /afiliado/dashboard
    } catch (error: any) {
      toast.error(error.message || "Erro ao iniciar login com Google");
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
            {/* Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-[#E0D8C7] hover:bg-[#F8F5EE] text-[#0F3A3E] py-3.5 px-4 text-[14px] font-medium transition-colors mb-6"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Entrar com Google
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E0D8C7]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[12px] text-[#8A938E] uppercase tracking-wider">ou</span>
              </div>
            </div>

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
