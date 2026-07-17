import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, MapPin, User } from "lucide-react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { getMyOrder } from "@/lib/account.functions";
import { OrderTimeline } from "@/components/account/OrderTimeline";

export const Route = createFileRoute("/minha-conta/pedidos/$orderId")({
  component: OrderDetailPage,
});

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function OrderDetailPage() {
  const { orderId } = Route.useParams();
  const { user } = useSupabaseSession();
  const getMyOrderFn = useServerFn(getMyOrder);

  const order = useQuery({
    queryKey: ["my-order", orderId, user?.id],
    enabled: !!user && !!orderId,
    queryFn: async () => {
      const result = await getMyOrderFn({ data: { orderId } });
      return result.success ? result.data ?? null : null;
    },
    refetchOnWindowFocus: false,
  });

  if (order.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-white rounded-2xl border border-[#E9E1D2] animate-pulse" />
        <div className="h-32 bg-white rounded-2xl border border-[#E9E1D2] animate-pulse" />
      </div>
    );
  }

  if (!order.data) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
        <p className="text-red-700">Pedido nao encontrado.</p>
        <Link
          to="/minha-conta/pedidos"
          className="inline-block mt-3 text-sm text-[#0F3A3E] underline"
        >
          Voltar para pedidos
        </Link>
      </div>
    );
  }

  const o = order.data;
  return (
    <div className="space-y-5">
      <header className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#51635F]">
              Pedido #{o.id.slice(0, 8).toUpperCase()}
            </p>
            <h2 className="text-xl font-semibold text-[#0F3A3E] mt-1">
              {formatBRL(o.total)}
            </h2>
            <p className="text-xs text-[#51635F] mt-1">
              {new Date(o.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Package className="h-6 w-6 text-[#0F3A3E]" />
            <p className="text-xs text-[#51635F]">
              Status: <strong>{o.status}</strong>
            </p>
            {o.trackingCode && (
              <p className="text-xs text-[#51635F]">
                Rastreio: <code>{o.trackingCode}</code>
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-4">
          Andamento do pedido
        </h3>
        <OrderTimeline current={o.status} history={o.history} />
      </div>

      <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3">Itens</h3>
        <ul className="divide-y divide-[#E9E1D2]">
          {o.items.map((it, i: number) => (
            <li key={i} className="flex justify-between py-3 text-sm">
              <span className="text-[#0F3A3E]">
                {it.quantity}x {it.name}
              </span>
              <span className="text-[#51635F]">{formatBRL(it.price)}</span>
            </li>
          ))}
        </ul>
      </div>

      {o.shippingAddress && (
        <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
          <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereco de entrega
          </h3>
          <p className="text-sm text-[#51635F]">
            {o.shippingAddress.street}, {o.shippingAddress.number}
            {o.shippingAddress.complement && (
              <> &mdash; {o.shippingAddress.complement}</>
            )}
            <br />
            {o.shippingAddress.neighborhood} &mdash;{" "}
            {o.shippingAddress.city}/{o.shippingAddress.state}
            <br />
            CEP {o.shippingAddress.cep}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E9E1D2] p-5">
        <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3 flex items-center gap-2">
          <User className="h-4 w-4" />
          Dados do cliente
        </h3>
        <p className="text-sm text-[#51635F]">
          {o.customer.name} ({o.customer.email})
          {o.customer.phone && <> &middot; {o.customer.phone}</>}
        </p>
      </div>
    </div>
  );
}

export default OrderDetailPage;