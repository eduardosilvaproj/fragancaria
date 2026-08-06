import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  ShieldOff,
  PencilLine,
  LockKeyhole,
  Check,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createAdminUser,
  listAdminUsers,
  setAdminUserActive,
  updateAdminUserRole,
  type AdminUserRow,
  type AdminUserListResult,
  type CreateAdminUserResult,
} from "@/lib/admin-users.functions";
import type { AdminRole } from "@/lib/admin-roles";

export const Route = createFileRoute("/admin/usuarios")({
  component: AdminUsersPage,
});

const ROLE_LABELS: Record<string, string> = {
  total: "Total",
  social: "Social",
  logistica: "Logística",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("total");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [editingRoleUser, setEditingRoleUser] = useState<AdminUserRow | null>(null);
  const [activeBusyId, setActiveBusyId] = useState<string | null>(null);

  const listFn = useServerFn(listAdminUsers);
  const createFn = useServerFn(createAdminUser);
  const roleFn = useServerFn(updateAdminUserRole);
  const activeFn = useServerFn(setAdminUserActive);

  const {
    data: queryResult,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
    refetchOnWindowFocus: false,
  });

  const result: AdminUserListResult | null = queryResult?.success ? queryResult.data : null;
  const users = result?.users ?? [];

  const orderedUsers = useMemo(() => users, [users]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await createFn({ data: { email: newEmail, role: newRole as AdminRole } });
    if (res.success) {
      setGeneratedPassword(res.data.tempPassword);
      setNewEmail("");
      setNewRole("total");
      setCreateOpen(false);
      await refetch();
    }
  }

  async function onRoleChange(userId: string, role: string) {
    const res = await roleFn({ data: { userId, role: role as AdminRole } });
    if (res.success) {
      setEditingRoleUser(null);
      await refetch();
    }
  }

  async function toggleActive(user: AdminUserRow) {
    setActiveBusyId(user.userId);
    const res = await activeFn({ data: { userId: user.userId, isActive: !user.isActive } });
    setActiveBusyId(null);
    if (res.success) {
      await refetch();
    }
  }

  async function copyPassword() {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F3A3E] font-serif">Usuários Admin</h1>
          <p className="text-sm text-[#51635F] mt-1">Controle de acesso, papel e ativação.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3]"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#123f44]"
          >
            <Plus className="h-4 w-4" />
            Novo usuário
          </button>
        </div>
      </div>

      {generatedPassword && (
        <div className="bg-amber-50 border border-amber-200 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-amber-900">Senha temporária gerada</p>
            <p className="font-mono text-sm text-amber-950 break-all">{generatedPassword}</p>
          </div>
          <button
            onClick={copyPassword}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-amber-300 bg-white hover:bg-amber-100"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por e-mail ou ID"
          className="w-full max-w-md px-3 py-2 border border-[#E9E1D2] bg-white text-sm outline-none focus:border-[#B07B1E]"
        />
      </div>

      {isFetching ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#B07B1E]" />
        </div>
      ) : (
        <div className="bg-white border border-[#E9E1D2] overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_120px_160px] gap-3 px-4 py-3 bg-[#F5F3EE] text-[10px] uppercase tracking-wider text-[#51635F] font-medium">
            <div>E-mail</div>
            <div>Papel</div>
            <div>Ativo</div>
            <div>Criado em</div>
          </div>
          {orderedUsers.length === 0 ? (
            <div className="p-10 text-sm text-[#8A938E]">Nenhum usuário encontrado.</div>
          ) : (
            orderedUsers.map((user) => (
              <div
                key={user.userId}
                className="grid grid-cols-[2fr_1fr_120px_160px] gap-3 px-4 py-4 border-t border-[#E9E1D2] items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#1C302E] truncate">{user.email ?? user.userId}</p>
                  <p className="text-[11px] text-[#8A938E] font-mono truncate">{user.userId}</p>
                </div>
                <div>
                  {editingRoleUser?.userId === user.userId ? (
                    <select
                      defaultValue={user.role}
                      onChange={(e) => onRoleChange(user.userId, e.target.value)}
                      className="w-full border border-[#E9E1D2] px-2 py-1 text-sm bg-white"
                    >
                      <option value="total">Total</option>
                      <option value="social">Social</option>
                      <option value="logistica">Logística</option>
                    </select>
                  ) : (
                    <button
                      onClick={() => setEditingRoleUser(user)}
                      className="inline-flex items-center gap-2 text-sm px-2 py-1 border border-[#E9E1D2] hover:bg-[#F3EEE3]"
                    >
                      <PencilLine className="h-4 w-4" />
                      {ROLE_LABELS[user.role] || user.role}
                    </button>
                  )}
                </div>
                <div>
                  <button
                    disabled={activeBusyId === user.userId}
                    onClick={() => toggleActive(user)}
                    className={cn(
                      "inline-flex items-center gap-2 px-2 py-1 text-sm border",
                      user.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-rose-200 bg-rose-50 text-rose-800",
                    )}
                  >
                    {activeBusyId === user.userId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : user.isActive ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <ShieldOff className="h-4 w-4" />
                    )}
                    {user.isActive ? "Ativo" : "Desativado"}
                  </button>
                </div>
                <div className="text-sm text-[#51635F]">{formatDate(user.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={onCreate}
            className="w-full max-w-lg bg-white border border-[#E9E1D2] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F3A3E]">Criar usuário admin</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-[#51635F]">
                Fechar
              </button>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-[#51635F]">
                E-mail
              </label>
              <input
                required
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border border-[#E9E1D2] px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-[#51635F]">Papel</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full border border-[#E9E1D2] px-3 py-2 text-sm bg-white"
              >
                <option value="total">Total</option>
                <option value="social">Social</option>
                <option value="logistica">Logística</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 text-sm border border-[#E9E1D2]"
              >
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-[#0F3A3E] text-white">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
