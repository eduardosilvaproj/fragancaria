import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { KeyRound, Loader2, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar Senha | Fragranciaria" },
      { name: "description", content: "Recupere o acesso à sua conta Fragranciaria." },
    ],
  }),
  component: RecuperarSenhaPage,
});

function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/redefinir-senha`,
      });
      // Sempre mostra sucesso (não revela se o e-mail existe — evita enumeração de contas).
      if (err) console.warn("[recuperar-senha]", err.message);
      setSent(true);
    } catch (err: any) {
      console.warn("[recuperar-senha]", err?.message);
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      <NavbarEditorial />
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-4">
              <img src="/images/logo.png" alt="Fragranciaria" className="h-10 w-auto mx-auto" />
            </Link>
            <h1 className="text-lg font-semibold text-[#0F3A3E] flex items-center justify-center gap-2">
              <KeyRound className="h-5 w-5" />
              Recuperar senha
            </h1>
            <p className="text-sm text-[#51635F] mt-1">
              Enviaremos um link para redefinir sua senha
            </p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#1C6B4A] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm text-[#51635F] leading-relaxed">
                Se houver uma conta com <strong className="text-[#0F3A3E]">{email}</strong>,
                você receberá um e-mail com o link de redefinição. Verifique a caixa de entrada e o spam.
              </p>
              <Link to="/login" className="inline-block mt-6 text-sm text-[#B07B1E] hover:underline">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F3A3E] mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E9E1D2] px-4 py-2.5 text-sm outline-none focus:border-[#0F3A3E]"
                    placeholder="voce@exemplo.com"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#0F3A3E] text-white py-2.5 text-sm font-medium transition-colors hover:bg-[#0c2e31] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar link"}
                </button>
              </form>
              <p className="text-center text-sm text-[#51635F] mt-6">
                Lembrou a senha?{" "}
                <Link to="/login" className="text-[#0F3A3E] font-medium underline-offset-2 hover:underline">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecuperarSenhaPage;
