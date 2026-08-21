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
import { sendTestWhatsApp } from "@/lib/whatsapp-test.functions";
import { toast } from "sonner";
import { Plus, Trash2, Check, X, Globe, BarChart3, Target, Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/integracoes")({
  component: AdminIntegracoes,
});

function AdminIntegracoes() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listZernioAccounts);
  const upsertFn = useServerFn(upsertZernioAccount);
  const deleteFn = useServerFn(deleteZernioAccount);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["zernio-accounts"],
    queryFn: () => listFn({}),
  });

  const [form, setForm] = useState<Partial<ZernioAccount>>({
    platform: 'instagram',
    label: '',
    account_id: '',
    is_active: true
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => upsertFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zernio-accounts"] });
      toast.success("Conta salva!");
      setForm({ platform: 'instagram', label: '', account_id: '', is_active: true });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["zernio-accounts"] });
      toast.success("Conta removida!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });

  // --- Teste de WhatsApp ---
  const sendTestWhatsAppFn = useServerFn(sendTestWhatsApp);
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState<"venda_aprovada" | "pedido_enviado">("venda_aprovada");
  const [testParams, setTestParams] = useState({
    venda_aprovada: {
      param1: "Gabriel Dias",
      param2: "PED-98745",
      param3: "R$ 189,90",
    },
    pedido_enviado: {
      param1: "Gabriel Dias",
      param2: "PED-98745",
      param3: "BR987654321BR",
    },
  });
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  const testWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const p = testParams[testTemplate];
      return sendTestWhatsAppFn({
        data: {
          phone: testPhone,
          templateName: testTemplate,
          param1: p.param1,
          param2: p.param2,
          param3: p.param3,
        },
      });
    },
    onSuccess: (res) => {
      setRawResponse(JSON.stringify(res, null, 2));
      if (res?.success) {
        toast.success("WhatsApp enviado com sucesso!");
      } else {
        toast.error(`Falha no envio: ${res?.error || "Erro desconhecido"}`);
      }
    },
    onError: (e: any) => {
      setRawResponse(JSON.stringify(e, null, 2));
      toast.error(e?.message || "Exceção ao testar");
    },
  });

  if (isLoading) return <div>Carregando...</div>;

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
      <div className="bg-white border border-[#E9E1D2] p-6 mb-8">
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

      {/* Seção de Teste de WhatsApp */}
      <h2 className="text-xl font-serif text-[#0F3A3E] mb-6 flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Teste de WhatsApp Transacional</h2>
      <div className="bg-white border border-[#E9E1D2] p-6">
        <p className="text-sm text-[#51635F] mb-6">
          Dispare um template de teste diretamente para um número específico, sem passar pela trava de idempotência. Ótimo para validar a entrega dos parâmetros no Meta Business Suite.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Telefone (Formato E.164 ou DDD)</label>
              <input
                type="text"
                className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-[#0F3A3E]"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="ex: +5511999999999"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">Template</label>
              <select
                className="w-full bg-[#F5F3EE] rounded-lg p-2.5 text-sm outline-none border border-transparent focus:border-[#0F3A3E]"
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value as any)}
              >
                <option value="venda_aprovada">venda_aprovada (3 variáveis)</option>
                <option value="pedido_enviado">pedido_enviado (3 variáveis)</option>
              </select>
            </div>

            <div className="bg-[#F5F3EE] p-4 rounded-lg space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#51635F]">Variáveis do Template</p>
              <div>
                <label className="block text-[10px] text-[#8A938E] mb-1">
                  {'{1}'} Nome do Cliente
                </label>
                <input
                  type="text"
                  className="w-full bg-white rounded-lg p-2 text-sm outline-none"
                  value={testParams[testTemplate].param1}
                  onChange={(e) =>
                    setTestParams({
                      ...testParams,
                      [testTemplate]: { ...testParams[testTemplate], param1: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#8A938E] mb-1">
                  {'{2}'} ID do Pedido
                </label>
                <input
                  type="text"
                  className="w-full bg-white rounded-lg p-2 text-sm outline-none"
                  value={testParams[testTemplate].param2}
                  onChange={(e) =>
                    setTestParams({
                      ...testParams,
                      [testTemplate]: { ...testParams[testTemplate], param2: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] text-[#8A938E] mb-1">
                  {'{3}'} {testTemplate === "venda_aprovada" ? "Valor Total" : "Código de Rastreio"}
                </label>
                <input
                  type="text"
                  className="w-full bg-white rounded-lg p-2 text-sm outline-none"
                  value={testParams[testTemplate].param3}
                  onChange={(e) =>
                    setTestParams({
                      ...testParams,
                      [testTemplate]: { ...testParams[testTemplate], param3: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            <button
              disabled={testWhatsAppMutation.isPending || !testPhone}
              onClick={() => testWhatsAppMutation.mutate()}
              className="w-full bg-[#0F3A3E] text-white p-3 rounded-lg text-sm hover:bg-[#16504F] transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              {testWhatsAppMutation.isPending ? "Disparando teste..." : "Enviar Disparo de Teste"}
            </button>
          </div>

          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 min-h-[220px] bg-[#1E293B] text-[#F8FAFC] rounded-lg p-4 font-mono text-xs overflow-auto">
              <p className="text-[#94A3B8] mb-2">// Resposta crua da API Zernio</p>
              {rawResponse ? (
                <pre>{rawResponse}</pre>
              ) : (
                <span className="text-[#64748B]">Nenhum teste disparado ainda.</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
