import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

export const Route = createFileRoute("/minha-conta/cancelamentos/")({
  component: RefundsPage,
});

type OrderRow = {
  id: string;
  createdAt: string;
  status: string;
  refundStatus: string | null;
};

type RefundRow = {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

function RefundsPage() {
  const qc = useQueryClient();
  const { data: userData } = useSupabaseUser();
  const user = userData?.user;

  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrderRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, status, refund_status")
        .or(
          `auth_user_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((o: any) => ({
        id: o.id,
        createdAt: o.created_at ?? "",
        status: o.status ?? "pending",
        refundStatus: o.refund_status ?? null,
      }));
    },
  });

  const refunds = useQuery({
    queryKey: ["my-refunds", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RefundRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("refund_requests")
        .select("id, order_id, reason, status, admin_notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RefundRow[];
    },
  });

  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cand = (orders.data ?? []).filter((o) => {
    if (o.refundStatus) return false;
    return ["paid", "processing"].includes(o.status);
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Nao autenticado");
      const { error: e } = await supabase.from("refund_requests").insert({
        user_id: user.id,
        order_id: orderId,
        reason,
        status: "pending",
      });
      if (e) throw e;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-refunds", user?.id] });
      qc.invalidateQueries({ queryKey: ["my-orders", user?.id] });
      setOrderId("");
      setReason("");
      setError(null);
    },
    onError: (err: any) => setError(err?.message ?? "Erro"),
  });

  const pastRefunds = refunds.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <RotateCcw className="h-5 w-5 text-[#0F3A3E]" />
        <h2 className="text-lg font-semibold text-[#0F3A3E]">
          Cancelamentos e reembolsos
        </h2>
      </header>

      <section className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3">
          Solicitar cancelamento
        </h3>
        {cand.length === 0 ? (
          <p className="text-sm text-[#51635F]">
            Voce nao tem pedidos passiveis de cancelamento no momento.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.length < 10) {
                setError("Descreva o motivo com pelo menos 10 caracteres.");
                return;
              }
              setError(null);
              submit.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-[#0F3A3E] mb-1">
                Pedido
              </label>
              <select
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecione um pedido...</option>
                {cand.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.id.slice(0, 8).toUpperCase()} &middot;{" "}
                    {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#0F3A3E] mb-1">
                Motivo (min 10 caracteres)
              </label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#0F3A3E]"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submit.isPending}
              className="px-4 py-2 rounded-lg bg-[#0F3A3E] text-white text-sm font-medium hover:bg-[#0c2e31] disabled:opacity-60"
            >
              {submit.isPending ? "Enviando..." : "Solicitar cancelamento"}
            </button>
          </form>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3">
          Historico de solicitacoes
        </h3>
        {pastRefunds.length === 0 ? (
          <p className="text-sm text-[#51635F]">Nenhuma solicitacao ate agora.</p>
        ) : (
          <div className="space-y-3">
            {pastRefunds.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-[#E9E1D2] p-4"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs text-[#51635F]">
                      Pedido #{String(r.order_id).slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm text-[#0F3A3E] mt-1">{r.reason}</p>
                    <p className="text-xs text-[#51635F] mt-1">
                      Solicitado em{" "}
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </p>
                    {r.admin_notes && (
                      <p className="mt-2 text-xs text-[#0F3A3E] bg-[#F5F3EE] rounded p-2">
                        <AlertTriangle className="inline h-3 w-3 mr-1 text-amber-600" />
                        Resposta: {r.admin_notes}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
                    {r.status}
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

export default RefundsPage;