import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { listMyOrders, type MyOrder } from "@/lib/account.functions";
import { Package, ChevronRight, ShoppingBag, LogIn } from "lucide-react";

export const Route = createFileRoute("/minha-conta/pedidos/")({
  // A guarda de auth é client-side: o supabase.auth.getUser() precisa do
  // header Authorization com o token da sessão, que só existe no browser
  // (a sessão Supabase fica no localStorage). No SSR, caímos em
  // "Carregando..." até o client hidratar e useSupabaseSession resolver.
  // O beforeLoad que usava requireSupabaseAuth quebrou o SSR ("Cannot
  // convert object to primitive value") porque o client criado com a
  // chave publishable exige Bearer para getClaims.
  component: MinhaContaPedidosPage,
});

function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function shortId(id: string): string {
  return id ? id.slice(0, 8).toUpperCase() : "";
}

// Cor do badge por status (espelha os estados do Mercado Pago).
function statusClass(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "paid" || s === "pago") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s === "rejected" || s === "cancelled" || s === "cancelado") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  if (s === "pending" || s === "pendente" || s === "in_process") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-[#F5F3EE] text-[#51635F] border-[#E9E1D2]";
}

function statusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "paid" || s === "pago") return "Pago";
  if (s === "pending" || s === "pendente" || s === "in_process") return "Pendente";
  if (s === "rejected" || s === "cancelled" || s === "cancelado") return "Cancelado";
  return status || "—";
}

function MinhaContaPedidosPage() {
  const { user, loading: sessionLoading } = useSupabaseSession();
  const listMyOrdersFn = useServerFn(listMyOrders);
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listMyOrdersFn();
      if (res.success) {
        setOrders(res.data);
      } else {
        setError(res.error || "Erro ao carregar pedidos");
        setOrders([]);
      }
    } catch (err: any) {
      setError(err?.message || "Erro inesperado");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setOrders(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load();
  }, [user?.id]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <p className="text-sm text-[#51635F]">Carregando...</p>
      </div>
    );
  }

  // Sem user (cliente deslogado): fallback amigável.
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 text-center">
          <LogIn className="h-10 w-10 text-[#0F3A3E] mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-[#0F3A3E] mb-2">
            Entre para ver seus pedidos
          </h1>
          <p className="text-sm text-[#51635F] mb-6">
            Acesse sua conta para acompanhar o histórico de compras.
          </p>
          <Link
            to="/login"
            search={{ redirect: "/minha-conta/pedidos" }}
            className="inline-block w-full rounded-lg bg-[#0F3A3E] text-white py-2.5 text-sm font-medium hover:bg-[#0c2e31]"
          >
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  // Carrega sob demanda (botão "carregar" na primeira vez) OU se ainda não carregou.
  if (orders === null && !loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center px-4">
        <button
          onClick={load}
          className="rounded-lg bg-[#0F3A3E] text-white px-6 py-2.5 text-sm font-medium"
        >
          Carregar meus pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-6 w-6 text-[#0F3A3E]" />
          <h1 className="text-2xl font-semibold text-[#0F3A3E]">Meus Pedidos</h1>
        </div>
        <p className="text-sm text-[#51635F] mb-8">
          Acompanhe o histórico das suas compras em {String(user?.email ?? "")}.
        </p>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E9E1D2] p-8 text-center text-sm text-[#51635F]">
            Carregando pedidos...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-6">
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={load}
              className="rounded-lg bg-[#0F3A3E] text-white px-5 py-2 text-sm font-medium"
            >
              Tentar de novo
            </button>
          </div>
        ) : orders!.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {orders!.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[#E9E1D2] p-10 text-center">
      <ShoppingBag className="h-12 w-12 text-[#B07B1E] mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-[#0F3A3E] mb-2">
        Você ainda não tem pedidos
      </h2>
      <p className="text-sm text-[#51635F] mb-6">
        Que tal explorar nossas fragrâncias e fazer a primeira compra?
      </p>
      <Link
        to="/"
        className="inline-block rounded-lg bg-[#0F3A3E] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#0c2e31]"
      >
        Continuar comprando
      </Link>
    </div>
  );
}

function OrderCard({ order }: { order: MyOrder }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const firstThree = items.slice(0, 3);
  const more = items.length - firstThree.length;

  return (
    <Link
      to="/minha-conta/pedidos/$orderId"
      params={{ orderId: order.id }}
      className="block bg-white rounded-2xl border border-[#E9E1D2] p-5 hover:border-[#0F3A3E] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-[#51635F]">
              #{shortId(order.id)}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusClass(
                order.status
              )}`}
            >
              {statusLabel(order.status)}
            </span>
          </div>
          <p className="text-sm text-[#0F3A3E]">
            {formatDate(order.createdAt)}
          </p>

          {firstThree.length > 0 && (
            <p className="text-xs text-[#51635F] mt-2 line-clamp-1">
              {firstThree
                .map((it: any) => it?.name || it?.title || "Produto")
                .join(", ")}
              {more > 0 ? ` e mais ${more}` : ""}
            </p>
          )}
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <p className="text-sm font-semibold text-[#0F3A3E]">
            {formatPrice(Number(order.total || 0))}
          </p>
          <ChevronRight className="h-4 w-4 text-[#51635F]" />
        </div>
      </div>
    </Link>
  );
}

export default MinhaContaPedidosPage;
