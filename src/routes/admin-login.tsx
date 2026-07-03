import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loginAdmin, getAdminSession } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin-login")({
  beforeLoad: async () => {
    const session = await getAdminSession();
    if (session) {
      throw redirect({ to: "/admin" });
    }
  },
  component: AdminLoginPage,
});

// COMPONENT_MARKER
function mapError(code?: string): string {
  switch (code) {
    case "CREDENCIAIS_INVALIDAS":
      return "E-mail ou senha incorretos.";
    case "NAO_AUTORIZADO":
      return "Esta conta nao tem acesso ao painel.";
    default:
      return "Nao foi possivel entrar. Tente novamente.";
  }
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // SUBMIT_MARKER
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginAdmin({ data: { email, password } });
      if (res.success) {
        await navigate({ to: "/admin" });
      } else {
        setError(mapError(res.error));
      }
    } catch {
      setError("Falha na conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // RENDER_MARKER
  return (
    <div className="min-h-screen bg-[#0F3A3E] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <img
            src="/images/logo.png"
            alt="Fragranciaria"
            className="h-10 w-auto mx-auto mb-4"
          />
          <h1 className="text-lg font-semibold text-[#0F3A3E]">
            Painel Administrativo
          </h1>
          <p className="text-sm text-[#51635F] mt-1">Entre com sua conta</p>
        </div>
        {/* FORM_MARKER */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[#0F3A3E] mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#E9E1D2] px-4 py-2.5 text-sm outline-none focus:border-[#0F3A3E]"
              placeholder="voce@exemplo.com"
            />
          </div>
          {/* PASSWORD_MARKER */}
          <div>
            <label className="block text-sm font-medium text-[#0F3A3E] mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#E9E1D2] px-4 py-2.5 text-sm outline-none focus:border-[#0F3A3E]"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#0F3A3E] text-white py-2.5 text-sm font-medium transition-colors hover:bg-[#0c2e31] disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginPage;
