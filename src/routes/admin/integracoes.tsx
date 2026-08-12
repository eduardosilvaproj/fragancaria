import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listZernioAccounts,
  upsertZernioAccount,
  deleteZernioAccount,
  type ZernioAccount,
} from "@/lib/zernio-accounts.functions";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Globe, BarChart3, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/integracoes")({
  component: AdminIntegracoes,
});

function AdminIntegracoes() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listZernioAccounts);
  const upsertFn = useServerFn(upsertZernioAccount);
  const deleteFn = useServerFn(deleteZernioAccount);

  // ... rest of the code ...

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="font-serif text-3xl text-[#0F3A3E] mb-8">Integrações</h1>

      {/* Seção Zernio */}
      <h2 className="text-xl font-serif text-[#0F3A3E] mb-6">Contas Conectadas (Zernio)</h2>
      <div className="bg-white border border-[#E9E1D2] p-6 mb-8">
        <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">Cadastrar nova conta</h3>
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Plataforma</label>
            <select className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none" value={form.platform} onChange={(e) => setForm({...form, platform: e.target.value as any})}>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Apelido (Label)</label>
            <input type="text" className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none" value={form.label} onChange={(e) => setForm({...form, label: e.target.value})} placeholder="ex: Atendimento" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Zernio Account ID</label>
            <input type="text" className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none" value={form.account_id} onChange={(e) => setForm({...form, account_id: e.target.value})} placeholder="ID da conta" />
          </div>
          <button className="bg-[#0F3A3E] text-white p-2.5 rounded-lg text-sm hover:bg-[#16504F] col-span-3 md:col-span-1" onClick={() => upsertMutation.mutate(form)}>
            <Plus className="h-4 w-4 mr-2 inline" /> Salvar Conta
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E9E1D2] mb-12">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F5F3EE] text-[#51635F] text-[11px] uppercase">
              <th className="p-4 text-left">Plataforma</th>
              <th className="p-4 text-left">Apelido</th>
              <th className="p-4 text-left">Account ID</th>
              <th className="p-4 text-center">Ativa</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id} className="border-t border-[#E9E1D2]">
                <td className="p-4">{acc.platform}</td>
                <td className="p-4">{acc.label}</td>
                <td className="p-4">{acc.account_id}</td>
                <td className="p-4 text-center">
                  <button onClick={() => upsertMutation.mutate({ ...acc, is_active: !acc.is_active })}>
                    {acc.is_active ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => deleteMutation.mutate(acc.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Seção Analytics */}
      <h2 className="text-xl font-serif text-[#0F3A3E] mb-6">Analytics</h2>
      <div className="bg-white border border-[#E9E1D2] p-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-[#E9E1D2] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-[#0F3A3E] flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Google Analytics</p>
              <p className={cn("text-sm", import.meta.env.VITE_GA_MEASUREMENT_ID ? "text-emerald-600" : "text-[#8A938E]")}>
                {import.meta.env.VITE_GA_MEASUREMENT_ID ? "✓ Configurado" : "Não configurado"}
              </p>
            </div>
          </div>
          <div className="border border-[#E9E1D2] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-[#0F3A3E] flex items-center gap-2"><Target className="h-4 w-4" /> Meta Pixel</p>
              <p className={cn("text-sm", import.meta.env.VITE_META_PIXEL_ID ? "text-emerald-600" : "text-[#8A938E]")}>
                {import.meta.env.VITE_META_PIXEL_ID ? "✓ Configurado" : "Não configurado"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
