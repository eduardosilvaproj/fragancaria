import { createFileRoute, Link } from "@tanstack/react-router";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { FooterEditorial } from "@/components/layout/FooterEditorial";
import { useState } from "react";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { affiliateAuth } from "@/lib/supabase";

export const Route = createFileRoute("/afiliado/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar Senha | Fragranciaria" },
      { name: "description", content: "Recupere sua senha do portal de afiliados." },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("E-mail é obrigatório");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("E-mail inválido");
      return;
    }

    setIsLoading(true);
    try {
      await affiliateAuth.resetPassword(email);
      setIsSent(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar e-mail. Tente novamente.");
    } finally {
      setIsLoading(false);
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
              to="/afiliado/login"
              className="inline-flex items-center gap-2 text-[12px] tracking-[0.1em] text-[#75827E] hover:text-[#0F3A3E] transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
            <h1 className="font-serif text-[28px] md:text-[36px] text-[#0F3A3E]">
              Recuperar Senha
            </h1>
            <p className="text-[14px] text-[#75827E] mt-2">
              Digite seu e-mail para receber um link de recuperação
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-[#E9E1D2] p-6 md:p-10">
            {isSent ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-[#1C6B4A] rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="font-serif text-[20px] text-[#0F3A3E] mb-3">E-mail Enviado!</h2>
                <p className="text-[14px] text-[#75827E] leading-[1.6]">
                  Enviamos um link de recuperação para{" "}
                  <strong className="text-[#0F3A3E]">{email}</strong>.<br />
                  Verifique sua caixa de entrada e spam.
                </p>
                <Link
                  to="/afiliado/login"
                  className="inline-block mt-6 text-[13px] text-[#B07B1E] hover:underline"
                >
                  Voltar ao login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className={labelClassName}>E-mail cadastrado</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    className={inputClassName}
                    placeholder="seu@email.com"
                    autoComplete="email"
                  />
                  {error && <p className="text-[12px] text-[#C4433A] mt-1">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 text-[13px] tracking-[0.16em] uppercase font-medium transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Link"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <FooterEditorial />
    </div>
  );
}
