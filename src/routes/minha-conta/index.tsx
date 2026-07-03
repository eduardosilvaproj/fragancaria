import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  Heart,
  Bell,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { StatCard, PointsProgress } from "@/components/account/StatCard";

export const Route = createFileRoute("/minha-conta/")({
  component: DashboardPage,
});

// Dashboard do cliente. Consome Supabase direto no browser (RLS isola por
// auth.uid()). Evita server functions para nao depender de SSR / cookies.
function DashboardPage() {
  const { data: userData } = useSupabaseUser();
  const user = userData?.user;

  const dashboard = useQuery({
    queryKey: ["my-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const [customer, ordersCount, activeCount, wishlistCount, unreadCount] =
        await Promise.all([
          supabase
            .from("customers")
            .select("loyalty_points, loyalty_tier, name")
            .eq("auth_user_id", user.id)
            .maybeSingle(),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .or(
              `auth_user_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`
            ),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .or(
              `auth_user_id.eq.${user.id},customer_email.eq.${user.email ?? ""}`
            )
            .in("status", ["paid", "processing", "shipped"]),
          supabase
            .from("wishlist")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false),
        ]);
      return {
        customer: customer.data as any,
        ordersCount: ordersCount.count ?? 0,
        activeCount: activeCount.count ?? 0,
        wishlistCount: wishlistCount.count ?? 0,
        unreadCount: unreadCount.count ?? 0,
      };
    },
    refetchOnWindowFocus: false,
  });

  if (dashboard.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-white rounded-2xl border border-[#E9E1D2] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const d = dashboard.data;
  const points = Number(d?.customer?.loyalty_points ?? 0);
  const tier = d?.customer?.loyalty_tier ?? "bronze";
  const tiers = [
    { name: "bronze", min: 0, next: "prata", nextMin: 500 },
    { name: "prata", min: 500, next: "ouro", nextMin: 1500 },
    { name: "ouro", min: 1500, next: "diamante", nextMin: 5000 },
    { name: "diamante", min: 5000, next: null, nextMin: null },
  ];
  const t = tiers.find((x) => x.name === tier) ?? tiers[0];
  const fullName =
    d?.customer?.name ||
    (user?.user_metadata as any)?.full_name ||
    (user?.user_metadata as any)?.name ||
    user?.email;

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-[#0F3A3E] to-[#0c2e31] text-white rounded-2xl p-6">
        <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
          Ola,
        </p>
        <h2 className="text-2xl font-semibold mt-1">{fullName}</h2>
        <p className="text-sm text-white/70 mt-1">{user?.email}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pedidos"
          value={d?.ordersCount ?? 0}
          hint={
            (d?.activeCount ?? 0) > 0
              ? `${d?.activeCount} em andamento`
              : "Sem pedidos em andamento"
          }
          accent="#0F3A3E"
          icon={<Package className="h-5 w-5" />}
        />
        <StatCard
          label="Favoritos"
          value={d?.wishlistCount ?? 0}
          hint="Itens salvos"
          accent="#B07B1E"
          icon={<Heart className="h-5 w-5" />}
        />
        <StatCard
          label="Notificacoes"
          value={d?.unreadCount ?? 0}
          hint={(d?.unreadCount ?? 0) > 0 ? "Novas mensagens" : "Tudo em dia"}
          accent="#51635F"
          icon={<Bell className="h-5 w-5" />}
        />
        <StatCard
          label="Pontos"
          value={points}
          hint={`Nivel ${tier}`}
          accent="#B07B1E"
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      <PointsProgress
        points={points}
        tier={tier}
        tierMin={t.min}
        nextTier={t.next}
        nextMin={t.nextMin}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/minha-conta/pedidos"
          className="bg-white rounded-2xl border border-[#E9E1D2] p-5 hover:border-[#0F3A3E] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8A938E] font-semibold">
                Acompanhar
              </p>
              <p className="text-base font-semibold text-[#0F3A3E] mt-1">
                Meus pedidos
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#0F3A3E] group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          to="/minha-conta/favoritos"
          className="bg-white rounded-2xl border border-[#E9E1D2] p-5 hover:border-[#0F3A3E] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8A938E] font-semibold">
                Salvos
              </p>
              <p className="text-base font-semibold text-[#0F3A3E] mt-1">
                Lista de favoritos
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-[#0F3A3E] group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}

export default DashboardPage;