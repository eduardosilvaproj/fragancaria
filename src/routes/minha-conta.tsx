import {
  Outlet,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarAccount } from "@/components/account/SidebarAccount";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

// Layout de /minha-conta. NAO tem beforeLoad SSR (evita supabaseUrl is required).
// Auth check no client via useSupabaseUser: sem sessao -> redireciona /login.
export const Route = createFileRoute("/minha-conta")({
  component: AccountLayout,
});

function AccountLayout() {
  const navigate = useNavigate();
  const { data, isLoading } = useSupabaseUser();
  const user = data?.user ?? null;

  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/login", search: { redirect: "/minha-conta" } as any });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <div className="text-sm text-[#51635F]">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-2xl font-semibold text-[#0F3A3E] mb-6">
          Minha conta
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <SidebarAccount />
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AccountLayout;