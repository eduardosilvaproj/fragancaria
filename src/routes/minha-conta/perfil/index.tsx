import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data?.name) setFullName(profile.data.name);
    if (profile.data?.phone) setPhone(profile.data.phone);
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nao autenticado");
      // Upsert: cria customer se ainda nao existir; caso contrario atualiza.
      const payload: any = {
        auth_user_id: user.id,
        email: user.email ?? null,
        name: fullName,
        phone: phone || null,
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
        <User className="h-5 w-5 text-[#0F3A3E]" />
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
          <label className="block text-sm font-medium text-[#0F3A3E] mb-1">
            E-mail
          </label>
          <input
            type="email"
            value={user?.email ?? ""}
            disabled
            className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm bg-[#F5F3EE] text-[#51635F]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0F3A3E] mb-1">
            Nome completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0F3A3E] mb-1">
            Telefone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
          />
        </div>

        {save.isSuccess && (
          <p className="text-sm text-emerald-700">Dados salvos as {savedAt}.</p>
        )}
        {save.isError && (
          <p className="text-sm text-red-700">
            Erro ao salvar: {String((save.error as any)?.message ?? save.error)}
          </p>
        )}

        <button
          type="submit"
          disabled={save.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F3A3E] text-white text-sm font-medium hover:bg-[#0c2e31] disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {save.isPending ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-2">
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
          className="px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;