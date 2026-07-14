import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { requestReturn, listMyReturns, type MyReturn } from "@/lib/returns.functions";

export const Route = createFileRoute("/minha-conta/devolucoes/")({
  component: ReturnsPage,
});

type OrderRow = {
  id: string;
  createdAt: string;
  status: string;
  items: any[];
};

const REASONS = [
  { value: "arrependimento", label: "Desisti da compra (arrependimento)" },
  { value: "defeito", label: "Produto com defeito" },
  { value: "produto_errado", label: "Recebi o produto errado" },
  { value: "avaria_transporte", label: "Produto avariado no transporte" },
  { value: "outro", label: "Outro motivo" },
] as const;

const RESOLUTIONS = [
  { value: "reembolso", label: "Reembolso" },
  { value: "troca", label: "Troca por outro produto" },
  { value: "vale_compra", label: "Vale-compra" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  requested: "Solicitada",
  approved: "Aprovada",
  rejected: "Recusada",
  awaiting_return: "Aguardando envio",
  received: "Recebida",
  completed: "Concluída",
  cancelled: "Cancelada",
};

function ReturnsPage() {
  const qc = useQueryClient();
  const { data: userData } = useSupabaseUser();
  const user = userData?.user;
  const requestFn = useServerFn(requestReturn);
  const listFn = useServerFn(listMyReturns);

  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState<string>("");
  const [resolution, setResolution] = useState<string>("reembolso");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Só pedidos enviados/entregues podem ser devolvidos (espelha requestReturn).
  const orders = useQuery({
    queryKey: ["my-orders-returnable", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrderRow[]> => {
      if (!user) return [];
      const { data, error: e } = await supabase
        .from("orders")
        .select("id, created_at, status, items")
        .or(`auth_user_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`)
        .in("status", ["shipped", "delivered"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (e) throw e;
      return (data ?? []).map((o: any) => ({
        id: o.id,
        createdAt: o.created_at ?? "",
        status: o.status ?? "",
        items: Array.isArray(o.items) ? o.items : [],
      }));
    },
  });

  const myReturns = useQuery({
    queryKey: ["my-returns", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyReturn[]> => {
      const res = await listFn();
      if (!res.success) throw new Error(res.error || "Erro");
      return res.data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const order = (orders.data ?? []).find((o) => o.id === orderId);
      const res = await requestFn({
        data: {
          orderId,
          reason: reason as any,
          resolution: resolution as any,
          items: (order?.items ?? []).map((it: any) => ({
            id: String(it.id ?? ""),
            title: it.title ?? it.name ?? undefined,
            quantity: Number(it.quantity ?? 1),
            price: Number(it.price ?? 0),
          })),
          description: description || undefined,
        },
      });
      if (!res.success) throw new Error(res.error || "Erro ao solicitar devolução");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-returns", user?.id] });
      setOrderId("");
      setReason("");
      setResolution("reembolso");
      setDescription("");
      setError(null);
    },
    onError: (e: any) => setError(e?.message ?? "Erro"),
  });

  const returnable = orders.data ?? [];
  const past = myReturns.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <RefreshCcw className="h-5 w-5 text-[#0F3A3E]" aria-hidden />
        <h2 className="text-lg font-semibold text-[#0F3A3E]">Devoluções e trocas</h2>
      </header>

      <section className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3">Solicitar devolução</h3>
        {returnable.length === 0 ? (
          <p className="text-sm text-[#51635F]">
            Você não tem pedidos elegíveis para devolução. Só pedidos enviados ou entregues podem ser devolvidos.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!orderId) return setError("Selecione um pedido.");
              if (!reason) return setError("Selecione um motivo.");
              setError(null);
              submit.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-[#0F3A3E] mb-1">Pedido</label>
              <select
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecione um pedido...</option>
                {returnable.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id.slice(0, 8).toUpperCase()} · {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#0F3A3E] mb-1">Motivo</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm bg-white"
                >
                  <option value="">Selecione...</option>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#0F3A3E] mb-1">Resolução desejada</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm bg-white"
                >
                  {RESOLUTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0F3A3E] mb-1">Detalhes (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
                placeholder="Descreva o problema, se houver."
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={submit.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F3A3E] text-white text-sm font-medium hover:bg-[#0c2e31] disabled:opacity-60"
            >
              {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Solicitar devolução
            </button>
          </form>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3">Minhas devoluções</h3>
        {past.length === 0 ? (
          <p className="text-sm text-[#51635F]">Nenhuma devolução até agora.</p>
        ) : (
          <div className="space-y-3">
            {past.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-[#E9E1D2] p-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-[#51635F]">
                      Pedido #{r.orderId.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm text-[#0F3A3E] mt-1">
                      {REASONS.find((x) => x.value === r.reason)?.label ?? r.reason} ·{" "}
                      {RESOLUTIONS.find((x) => x.value === r.resolution)?.label ?? r.resolution}
                    </p>
                    <p className="text-xs text-[#51635F] mt-1">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ReturnsPage;
