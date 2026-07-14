import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus, Trash2, Star, Loader2 } from "lucide-react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import {
  listMyAddresses,
  saveAddress,
  deleteAddress,
  setDefaultAddress,
  type CustomerAddress,
} from "@/lib/account.functions";

export const Route = createFileRoute("/minha-conta/enderecos/")({
  component: AddressesPage,
});

function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

const EMPTY = {
  label: "",
  recipientName: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  isDefault: false,
};

function AddressesPage() {
  const qc = useQueryClient();
  const { data: userData } = useSupabaseUser();
  const user = userData?.user;
  const listFn = useServerFn(listMyAddresses);
  const saveFn = useServerFn(saveAddress);
  const deleteFn = useServerFn(deleteAddress);
  const defaultFn = useServerFn(setDefaultAddress);

  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addresses = useQuery({
    queryKey: ["my-addresses", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CustomerAddress[]> => {
      const res = await listFn();
      if (!res.success) throw new Error(res.error || "Erro");
      return res.data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await saveFn({
        data: {
          ...(editingId ? { id: editingId } : {}),
          label: form.label || undefined,
          recipientName: form.recipientName,
          cep: form.cep.replace(/\D/g, ""),
          street: form.street,
          number: form.number,
          complement: form.complement || undefined,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          isDefault: form.isDefault,
        },
      });
      if (!res.success) throw new Error(res.error || "Erro ao salvar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-addresses", user?.id] });
      setForm({ ...EMPTY });
      setEditingId(null);
      setShowForm(false);
      setError(null);
    },
    onError: (e: any) => setError(e?.message ?? "Erro"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteFn({ data: { id } });
      if (!res.success) throw new Error(res.error || "Erro");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-addresses", user?.id] }),
  });

  const makeDefault = useMutation({
    mutationFn: async (id: string) => {
      const res = await defaultFn({ data: { id } });
      if (!res.success) throw new Error(res.error || "Erro");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-addresses", user?.id] }),
  });

  function startEdit(a: CustomerAddress) {
    setEditingId(a.id);
    setForm({
      label: a.label ?? "",
      recipientName: a.recipientName,
      cep: maskCep(a.cep),
      street: a.street,
      number: a.number,
      complement: a.complement ?? "",
      neighborhood: a.neighborhood,
      city: a.city,
      state: a.state,
      isDefault: a.isDefault,
    });
    setShowForm(true);
    setError(null);
  }

  const items = addresses.data ?? [];
  const inputCls =
    "w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]";

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-[#0F3A3E]" aria-hidden />
          <h2 className="text-lg font-semibold text-[#0F3A3E]">Meus endereços</h2>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setForm({ ...EMPTY });
              setEditingId(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0F3A3E] text-white text-sm font-medium hover:bg-[#0c2e31]"
          >
            <Plus className="h-4 w-4" aria-hidden /> Novo
          </button>
        )}
      </header>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            save.mutate();
          }}
          className="bg-white rounded-2xl border border-[#E9E1D2] p-5 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className={inputCls}
              placeholder="Apelido (ex.: Casa)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <input
              required
              className={inputCls}
              placeholder="Nome do destinatário"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              className={inputCls}
              placeholder="CEP"
              value={form.cep}
              onChange={(e) => setForm({ ...form, cep: maskCep(e.target.value) })}
            />
            <input
              required
              className={`${inputCls} sm:col-span-2`}
              placeholder="Rua"
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              className={inputCls}
              placeholder="Número"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Complemento"
              value={form.complement}
              onChange={(e) => setForm({ ...form, complement: e.target.value })}
            />
            <input
              required
              className={inputCls}
              placeholder="Bairro"
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              required
              className={`${inputCls} sm:col-span-2`}
              placeholder="Cidade"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <input
              required
              maxLength={2}
              className={inputCls}
              placeholder="UF"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[#51635F]">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Definir como endereço padrão
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F3A3E] text-white text-sm font-medium hover:bg-[#0c2e31] disabled:opacity-60"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Salvar alterações" : "Adicionar endereço"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setError(null);
              }}
              className="px-4 py-2 rounded-lg border border-[#E9E1D2] text-sm text-[#51635F] hover:bg-[#F5F3EE]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {addresses.isLoading ? (
        <div className="h-24 bg-white rounded-2xl border border-[#E9E1D2] animate-pulse" />
      ) : items.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-[#E9E1D2] p-10 text-center">
          <MapPin className="h-10 w-10 text-[#8A938E] mx-auto mb-3" />
          <p className="text-sm text-[#51635F]">Você ainda não cadastrou endereços.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-[#E9E1D2] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#0F3A3E]">
                      {a.label || a.recipientName}
                    </p>
                    {a.isDefault && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#F3EEE3] text-[#B07B1E] font-medium">
                        <Star className="h-3 w-3" aria-hidden /> Padrão
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#51635F] mt-1">
                    {a.street}, {a.number}
                    {a.complement ? ` — ${a.complement}` : ""} · {a.neighborhood}
                  </p>
                  <p className="text-sm text-[#51635F]">
                    {a.city}/{a.state} · CEP {maskCep(a.cep)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(a)}
                    className="text-xs text-[#0F3A3E] hover:underline"
                  >
                    Editar
                  </button>
                  {!a.isDefault && (
                    <button
                      onClick={() => makeDefault.mutate(a.id)}
                      className="text-xs text-[#B07B1E] hover:underline"
                    >
                      Tornar padrão
                    </button>
                  )}
                  <button
                    onClick={() => remove.mutate(a.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-900"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden /> Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AddressesPage;
