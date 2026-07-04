import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { NavbarEditorial } from "@/components/layout/NavbarEditorial";
import { LogIn, Loader2 } from "lucide-react";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});

function mapAuthError(msg: string | undefined): string {
  if (!msg) return "Nao foi possivel entrar. Tente novamente.";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }
  if (m.includes("user not found") || m.includes("user_banned")) {
    return "Conta nao encontrada ou desativada.";
  }
  return "Nao foi possivel entrar. Tente novamente.";
}

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.97 6.97 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const { user, loading: sessionLoading } = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const target = search.redirect || "/minha-conta/pedidos";

  if (!sessionLoading && user) {
    void navigate({ to: target });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(mapAuthError(err.message));
        setLoading(false);
        return;
      }
      await navigate({ to: target });
    } catch (err: any) {
      setError(mapAuthError(err?.message));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: err } = await supabase.auth.signInWithOAuth({
        servico: "google",
        options: {
          redirectTo: origin + target,
        },
      });
      if (err) {
        setError(mapAuthError(err.message));
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(mapAuthError(err?.message));
      setGoogleLoading(false);
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
            <LogIn className="h-5 w-5" />
            Entrar
          </h1>
          <p className="text-sm text-[#51635F] mt-1">
            Acesse sua conta para ver seus pedidos
          </p>
        </div>

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
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0F3A3E] mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#E9E1D2] px-4 py-2.5 text-sm outline-none focus:border-[#0F3A3E]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full rounded-lg bg-[#0F3A3E] text-white py-2.5 text-sm font-medium transition-colors hover:bg-[#0c2e31] disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {/* Google OAuth temporariamente desabilitado — reabilitar apos configurar servico no Supabase */}

        <p className="text-center text-sm text-[#51635F] mt-6">
          Nao tem conta?{" "}
          <Link
            to="/cadastro"
            search={{ redirect: search.redirect }}
            className="text-[#0F3A3E] font-medium underline-offset-2 hover:underline"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}

export default LoginPage;
