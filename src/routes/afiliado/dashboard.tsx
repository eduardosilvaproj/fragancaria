import { createFileRoute, Link, useNavigate, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Link as LinkIcon,
  DollarSign,
  ShoppingBag,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAffiliateStore } from "@/stores/affiliateStore";

export const Route = createFileRoute("/afiliado/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Portal do Afiliado | Fragranciaria" },
    ],
  }),
  component: DashboardLayout,
});

const NAV_ITEMS = [
  { label: "Visão Geral", href: "/afiliado/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Meus Links", href: "/afiliado/dashboard/links", icon: LinkIcon },
  { label: "Vendas", href: "/afiliado/dashboard/vendas", icon: ShoppingBag },
  { label: "Pagamentos", href: "/afiliado/dashboard/pagamentos", icon: DollarSign },
  { label: "Configurações", href: "/afiliado/dashboard/configuracoes", icon: Settings },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, affiliate, dashboardSummary, unreadNotificationsCount, logout, checkAuth } =
    useAffiliateStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsLoading(false);
    };
    init();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/afiliado/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/afiliado/login" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3EEE3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0F3A3E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[14px] text-[#75827E] mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !affiliate) {
    return null;
  }

  const currentTier = dashboardSummary?.tier_name || "Bronze";
  const commissionRate = ((dashboardSummary?.current_commission_rate || 0.08) * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-[#F3EEE3]">
      {/* Top Bar */}
      <header className="bg-[#0F3A3E] text-white px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/logo-white.png"
              alt="Fragranciaria"
              className="h-8 w-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="font-serif text-xl hidden sm:inline">Fragranciaria</span>
          </Link>

          <span className="text-[11px] uppercase tracking-[0.15em] bg-[#B07B1E] px-2.5 py-1">
            Afiliado
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-white/10 rounded transition-colors">
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-[#B07B1E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-white/20">
            <div className="text-right">
              <p className="text-[13px] font-medium">{affiliate.full_name?.split(" ")[0]}</p>
              <p className="text-[11px] text-white/60">
                {dashboardSummary?.tier_icon} {currentTier} • {commissionRate}%
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-[#E9E1D2] min-h-[calc(100vh-64px)] sticky top-16">
          <nav className="p-4">
            <ul className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-[13px] transition-colors group",
                      "text-[#51635F] hover:text-[#0F3A3E] hover:bg-[#F3EEE3]"
                    )}
                    activeProps={{
                      className: "bg-[#0F3A3E] text-white hover:bg-[#16504F] hover:text-white",
                    }}
                    activeOptions={{ exact: item.exact }}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Tier Progress */}
          <div className="p-4 border-t border-[#E9E1D2] mt-4">
            <div className="bg-[#F8F4EA] p-4 border border-[#E9E1D2]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-[0.1em] text-[#75827E]">
                  Seu Nível
                </span>
                <span className="text-lg">{dashboardSummary?.tier_icon || "🥉"}</span>
              </div>
              <p className="font-serif text-[18px] text-[#0F3A3E]">{currentTier}</p>
              <p className="text-[12px] text-[#75827E] mt-1">
                Comissão: <strong className="text-[#B07B1E]">{commissionRate}%</strong>
              </p>
            </div>
          </div>

          {/* Quick Link */}
          <div className="p-4">
            <Link
              to="/produtos"
              className="flex items-center justify-between px-4 py-3 bg-[#B07B1E] text-white text-[12px] uppercase tracking-[0.1em] hover:bg-[#C68C28] transition-colors"
            >
              Ver Produtos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2]">
                <span className="font-serif text-lg text-[#0F3A3E]">Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-[#75827E] hover:text-[#0F3A3E]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-4 bg-[#F8F4EA] border-b border-[#E9E1D2]">
                <p className="font-medium text-[#0F3A3E]">{affiliate.full_name}</p>
                <p className="text-[12px] text-[#75827E] mt-1">
                  {dashboardSummary?.tier_icon} {currentTier} • {commissionRate}%
                </p>
              </div>

              <nav className="p-4">
                <ul className="space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-[13px] text-[#51635F] hover:text-[#0F3A3E] hover:bg-[#F3EEE3] transition-colors"
                        activeProps={{
                          className: "bg-[#0F3A3E] text-white hover:bg-[#16504F] hover:text-white",
                        }}
                        activeOptions={{ exact: item.exact }}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="p-4 border-t border-[#E9E1D2]">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-[13px] text-[#C4433A] hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  Sair da Conta
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
