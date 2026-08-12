import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listNotificationSettings,
  upsertNotificationSetting,
  deleteNotificationSetting,
  type NotificationSetting,
} from "@/lib/notifications.functions";
import { toast } from "sonner";
import { Bell, Plus, Trash2, Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/notificacoes")({
  component: AdminNotificacoes,
});

function AdminNotificacoes() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listNotificationSettings);
  const upsertFn = useServerFn(upsertNotificationSetting);
  const deleteFn = useServerFn(deleteNotificationSetting);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => listFn({}),
  });

  const [form, setForm] = useState<Partial<NotificationSetting>>({
    event: 'order.approved',
    audience: 'internal',
    channel: 'email',
    enabled: false
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Regra salva!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Regra removida!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <h1 className="font-serif text-3xl text-[#0F3A3E] mb-8">Notificações</h1>

      <div className="bg-white border border-[#E9E1D2] p-6 mb-8">
        <h3 className="font-serif text-lg text-[#0F3A3E] mb-6">Adicionar nova regra</h3>
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Evento</label>
            <select className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none" value={form.event} onChange={(e) => setForm({...form, event: e.target.value as any})}>
              <option value="order.approved">Venda Aprovada</option>
              <option value="order.shipped">Pedido Enviado</option>
              <option value="order.created">Pedido Criado</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Canal</label>
            <select className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none" value={form.channel} onChange={(e) => setForm({...form, channel: e.target.value as any})}>
              <option value="email">E-mail</option>
              <option value="whatsapp" disabled>WhatsApp (em breve)</option>
              <option value="telegram" disabled>Telegram (em breve)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Destino (E-mail)</label>
            <input type="text" className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none" value={form.destination || ""} onChange={(e) => setForm({...form, destination: e.target.value})} placeholder="ex: contato@loja.com" />
          </div>
          <button className="bg-[#0F3A3E] text-white p-2.5 rounded-lg text-sm hover:bg-[#16504F]" onClick={() => upsertMutation.mutate(form)}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E9E1D2]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F5F3EE] text-[#51635F] text-[11px] uppercase">
              <th className="p-4 text-left">Evento</th>
              <th className="p-4 text-left">Canal</th>
              <th className="p-4 text-left">Destino</th>
              <th className="p-4 text-center">Ativo</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.id} className="border-t border-[#E9E1D2]">
                <td className="p-4">{s.event}</td>
                <td className="p-4">{s.channel}</td>
                <td className="p-4">{s.destination || "-"}</td>
                <td className="p-4 text-center">
                  <button onClick={() => upsertMutation.mutate({ ...s, enabled: !s.enabled })}>
                    {s.enabled ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => deleteMutation.mutate(s.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
