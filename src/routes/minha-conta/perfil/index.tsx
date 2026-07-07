import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { User, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

export const Route = createFileRoute("/minha-conta/perfil/")({
  component: ProfilePage,
});

type CustomerRow = {
  id: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
};

// Mascara visual de CPF (000.000.000-00). Armazena so digitos.
function maskCPF(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// Mascara visual de telefone BR (fixo 10 / celular 11). Armazena so digitos.
function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function ProfilePage() {
  const qc = useQueryClient();
  const { data: userData } = useSupabaseUser();
  const user = userData?.user;

  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CustomerRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone, cpf, birth_date")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CustomerRow | null;
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.name ?? "");
    setPhone(maskPhone(profile.data.phone ?? ""));
    setCpf(maskCPF(profile.data.cpf ?? ""));
    setBirthDate(profile.data.birth_date ?? "");
  }, [profile.data]);

  const dirty = useMemo(() => {
    const p = profile.data;
    if (!p) return false;
    const phoneDigits = phone.replace(/\D/g, "");
    const cpfDigits = cpf.replace(/\D/g, "");
    return (
      fullName !== (p.name ?? "") ||
      phoneDigits !== (p.phone ?? "") ||
      cpfDigits !== (p.cpf ?? "") ||
      birthDate !== (p.birth_date ?? "")
    );
  }, [fullName, phone, cpf, birthDate, profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nao autenticado");
      const payload: Record<string, unknown> = {
        auth_user_id: user.id,
        email: user.email ?? null,
        name: fullName,
        phone: phone.replace(/\D/g, "") || null,
        cpf: cpf.replace(/\D/g, "") || null,
        birth_date: birthDate || null,
      };
      const { error } = await supabase
        .from("customers")
        .upsert(payload, { onConflict: "auth_user_id" });
      if (error) throw error;

      // Atualiza tambem o user_metadata do Supabase Auth (nome aparece em
      // outros pontos do app via auth.user_metadata).
      await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-profile", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-dashboard", user?.id] });
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
    },
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <User className="h-5 w-5 text-[#0F3A3E]" aria-hidden />
        <h2 className="text-lg font-semibold text-[#0F3A3E]">Meus dados</h2>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="bg-white rounded-2xl border border-[#E9E1D2] p-5 space-y-4"
      >
        <div>
          <label
            htmlFor="profile-email"
            className="block text-sm font-medium text-[#0F3A3E] mb-1"
          >
            E-mail
          </label>
          <input
            id="profile-email"
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm bg-[#F5F3EE] text-[#51635F] cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-[#8A938E]">
            Para alterar o e-mail, fale com o suporte.
          </p>
        </div>

        <div>
          <label
            htmlFor="profile-name"
            className="block text-sm font-medium text-[#0F3A3E] mb-1"
          >
            Nome completo
          </label>
          <input
            id="profile-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profile-phone"
              className="block text-sm font-medium text-[#0F3A3E] mb-1"
            >
              Telefone
            </label>
            <input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
            />
          </div>
          <div>
            <label
              htmlFor="profile-cpf"
              className="block text-sm font-medium text-[#0F3A3E] mb-1"
            >
              CPF
            </label>
            <input
              id="profile-cpf"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
            />
          </div>
        </div>

        <div className="max-w-xs">
          <label
            htmlFor="profile-birth"
            className="block text-sm font-medium text-[#0F3A3E] mb-1"
          >
            Data de nascimento
          </label>
          <input
            id="profile-birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
          />
        </div>

        {save.isSuccess && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800"
          >
            Dados salvos as {savedAt}.
          </p>
        )}
        {save.isError && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800"
          >
            Erro ao salvar: {String((save.error as any)?.message ?? save.error)}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={save.isPending || !dirty}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F3A3E] text-white text-sm font-medium hover:bg-[#0c2e31] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" aria-hidden />
            {save.isPending ? "Salvando..." : "Salvar"}
          </button>
          {dirty && !save.isPending && (
            <span className="text-xs text-[#8A938E]">
              Voce tem alteracoes nao salvas.
            </span>
          )}
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-1">
          Sair da conta
        </h3>
        <p className="text-xs text-[#51635F] mb-3">
          Encerrar a sessao neste navegador.
        </p>
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-800 text-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
