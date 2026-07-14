import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { KeyRound, Loader2, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir Senha | Fragranciaria" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: RedefinirSenhaPage,
});

function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // O link do e-mail abre a página com uma sessão de recuperação já ativa
  // (Supabase troca o token no fragmento da URL por uma sessão). Confirma que
  // há sessão antes de permitir a troca; sem isso, o updateUser falharia.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError("Não foi possível redefinir a senha. Solicite um novo link.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => void navigate({ to: "/minha-conta/pedidos" }), 1800);
    } catch {
      setError("Não foi possível redefinir a senha. Solicite um novo link.");
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
              Nova senha
            </h1>
            <p className="text-sm text-[#51635F] mt-1">Escolha uma nova senha para sua conta</p>
          </div>

          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#1C6B4A] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm text-[#51635F]">Senha redefinida. Redirecionando...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <p className="text-sm text-[#51635F] mb-4">
                Este link é inválido ou expirou. Solicite um novo.
              </p>
              <Link to="/recuperar-senha" className="text-sm text-[#B07B1E] hover:underline">
                Solicitar novo link
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
                  <label className="block text-sm font-medium text-[#0F3A3E] mb-1">Nova senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#E9E1D2] px-4 py-2.5 text-sm outline-none focus:border-[#0F3A3E]"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F3A3E] mb-1">Confirmar senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-lg border border-[#E9E1D2] px-4 py-2.5 text-sm outline-none focus:border-[#0F3A3E]"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-[#0F3A3E] text-white py-2.5 text-sm font-medium transition-colors hover:bg-[#0c2e31] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Salvando..." : "Redefinir senha"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RedefinirSenhaPage;
