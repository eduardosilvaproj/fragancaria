import {
  Navigate,
  Outlet,
  createFileRoute,
} from "@tanstack/react-router";
import { SidebarAccount } from "@/components/account/SidebarAccount";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

// Layout de /minha-conta. NAO tem beforeLoad SSR (evita supabaseUrl is required).
// Auth check no client via useSupabaseUser: sem sessao -> redireciona /login.
export const Route = createFileRoute("/minha-conta")({
  component: AccountLayout,
});

function AccountLayout() {
  const { data, isLoading } = useSupabaseUser();
  const user = data?.user ?? null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F3EE] flex items-center justify-center">
        <div className="text-sm text-[#51635F]">Carregando sua conta...</div>
      </div>
    );
  }

  if (!user) {
    // Render-time redirect: sem flash de "Carregando" extra.
    return <Navigate to="/login" search={{ redirect: "/minha-conta" } as any} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F3EE]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-[#0F3A3E]">
            Minha conta
          </h1>
          <p className="text-sm text-[#51635F] mt-1">
            Gerencie seus dados, pedidos, favoritos e notificacoes.
          </p>
        </header>
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
