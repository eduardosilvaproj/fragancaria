import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { changeAdminPassword } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/admin/alterar-senha")({
  component: AdminChangePasswordPage,
});

function AdminChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const changeFn = useServerFn(changeAdminPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("A nova senha deve ser diferente da atual");
      return;
    }

    setIsLoading(true);
    try {
      const res = await changeFn({
        data: { currentPassword, newPassword },
      });
      if (res.success) {
        toast.success("Senha alterada com sucesso");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // O Supabase invalida a sessão; o resolveAdmin vai rejeitar o cookie
        // no próximo request. O beforeLoad do /admin vai redirecionar para login.
        window.location.href = "/admin-login";
      } else {
        const msg =
          res.error === "NAO_AUTORIZADO"
            ? "Sessão expirada. Faça login novamente."
            : res.error;
        toast.error("Erro ao alterar senha", { description: msg });
      }
    } catch (err) {
      toast.error("Erro inesperado", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F3EEE3]">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white border border-[#E9E1D2] p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[#0F3A3E] font-serif">Alterar senha</h1>
          <p className="text-sm text-[#51635F] mt-1">
            Digite a senha atual e a nova senha (mínimo 8 caracteres)
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="current" className="block text-xs uppercase tracking-wider text-[#51635F]">
            Senha atual
          </label>
          <div className="relative">
            <input
              id="current"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full border border-[#E9E1D2] px-3 py-2 pr-10 text-sm outline-none focus:border-[#B07B1E]"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#51635F] hover:text-[#0F3A3E]"
            >
              {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="new" className="block text-xs uppercase tracking-wider text-[#51635F]">
            Nova senha
          </label>
          <div className="relative">
            <input
              id="new"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full border border-[#E9E1D2] px-3 py-2 pr-10 text-sm outline-none focus:border-[#B07B1E]"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#51635F] hover:text-[#0F3A3E]"
            >
              {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {newPassword.length > 0 && newPassword.length < 8 && (
            <p className="text-xs text-[#C4433A]">Mínimo 8 caracteres</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm" className="block text-xs uppercase tracking-wider text-[#51635F]">
            Confirmar nova senha
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full border border-[#E9E1D2] px-3 py-2 pr-10 text-sm outline-none focus:border-[#B07B1E]"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#51635F] hover:text-[#0F3A3E]"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full py-2 text-sm font-medium rounded bg-[#0F3A3E] text-white hover:bg-[#123f44] disabled:opacity-50 disabled:cursor-not-allowed",
            isLoading && "flex items-center justify-center gap-2",
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <LockKeyhole className="h-4 w-4" />
              Salvar nova senha
            </>
          )}
        </button>

        <p className="text-center text-xs text-[#8A938E]">
          <a href="/admin" className="underline hover:text-[#B07B1E]">
            Voltar ao painel
          </a>
        </p>
      </form>
    </div>
  );
}