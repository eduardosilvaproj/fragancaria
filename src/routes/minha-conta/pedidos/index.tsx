import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { OrderCard } from "@/components/account/OrderCard";

export const Route = createFileRoute("/minha-conta/pedidos/")({
  component: OrdersLayout,
});

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  payment_status: string;
  refund_status: string | null;
  total: number;
  tracking_code: string | null;
  tracking_url: string | null;
};

function OrdersLayout() {
  const loc = useLocation();
  const isDetail = loc.pathname.match(/\/minha-conta\/pedidos\/[^/]+$/);
  if (isDetail) {
    return (
      <div>
        <Link
          to="/minha-conta/pedidos"
          className="inline-flex items-center gap-1 text-sm text-[#51635F] hover:text-[#0F3A3E] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para pedidos
        </Link>
        <Outlet />
      </div>
    );
  }

  const { data: userData } = useSupabaseUser();
  const user = userData?.user;

  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, status, payment_status, refund_status, total, tracking_code, tracking_url"
        )
        .or(
          `auth_user_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const orderIds = (data ?? []).map((o: any) => o.id);
      const itemsByOrder = new Map<
        string,
        Array<{ name: string; quantity: number; price: number }>
      >();
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id, name, quantity, price")
          .in("order_id", orderIds);
        for (const it of items ?? []) {
          const arr = itemsByOrder.get((it as any).order_id) ?? [];
          arr.push({
            name: (it as any).name ?? "",
            quantity: Number((it as any).quantity ?? 0),
            price: Number((it as any).price ?? 0),
          });
          itemsByOrder.set((it as any).order_id, arr);
        }
      }

      return (data ?? []).map((o: any) => ({
        id: o.id,
        createdAt: o.created_at ?? "",
        status: o.status ?? "pending",
        paymentStatus: o.payment_status ?? "pending",
        refundStatus: o.refund_status ?? null,
        total: Number(o.total ?? 0),
        trackingCode: o.tracking_code ?? null,
        trackingUrl: o.tracking_url ?? null,
        items: itemsByOrder.get(o.id) ?? [],
      }));
    },
    refetchOnWindowFocus: false,
  });

  if (orders.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-32 bg-white rounded-2xl border border-[#E9E1D2] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const data = orders.data ?? [];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Package className="h-5 w-5 text-[#0F3A3E]" />
        <h2 className="text-lg font-semibold text-[#0F3A3E]">
          Meus pedidos
        </h2>
        <span className="text-xs text-[#8A938E]">{data.length} no total</span>
      </header>

      {data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9E1D2] p-12 text-center">
          <Package className="h-10 w-10 text-[#8A938E] mx-auto mb-3" />
          <p className="text-sm text-[#51635F]">
            Voce ainda nao tem pedidos por aqui.
          </p>
          <Link
            to="/"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-[#0F3A3E] text-white text-sm hover:bg-[#0c2e31]"
          >
            Explorar a loja
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersLayout;