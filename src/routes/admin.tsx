import { createFileRoute, Link, Outlet, useLocation, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  UserCog,
  MessageSquare,
  Bot,
  Share2,
  BarChart3,
  Globe,
  Star,
  Mail,
  Gift,
  Settings,
  Home,
  ChevronRight,
  Menu,
  X,
  Bell,
  Search,
  Package,
  ShoppingBag,
  Truck,
  Tag,
  CreditCard,
  Layers,
  RotateCcw,
  History,
  DollarSign,
  FileText,
  LogOut,
  Image,
  Sparkles,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAdmin } from "@/lib/admin.functions";
import { allowedAreasForRole, ADMIN_AREA_ROLES } from "@/lib/admin-roles";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const { getAdminSession } = await import("@/lib/admin.functions");
    const session = await getAdminSession();
    if (!session) {
      throw redirect({ to: "/admin-login" });
    }
    // Conveniência: papel limitado que cai no dashboard é levado para a
    // área dele. A barreira real continua sendo o requireRole nas server fns.
    // Só redireciona no /admin exato — rotas filhas também passam pelo
    // beforeLoad do layout e não devem sofrer redirect (senão loop).
    if (location.pathname === "/admin") {
      if (session.role === "logistica") {
        throw redirect({ to: "/admin/logistica" });
      }
      if (session.role === "social") {
        throw redirect({ to: "/admin/produtos" });
      }
    }
    return { admin: session };
  },
  component: AdminLayout,
});

type SidebarArea = keyof typeof ADMIN_AREA_ROLES;

type SidebarItem =
  | { label: string; href: string; icon: typeof Home; exact?: boolean; area?: SidebarArea }
  | { section: string };

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", href: "/admin", icon: Home, exact: true, area: "dashboard" },
  { section: "E-commerce" },
  { label: "Produtos", href: "/admin/produtos", icon: Package, area: "products" },
  { label: "Categorias", href: "/admin/categorias", icon: Layers, area: "categories" },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag, area: "orders" },
  { label: "Reembolsos", href: "/admin/reembolsos", icon: RotateCcw, area: "refund" },
  { label: "Cupons", href: "/admin/cupons", icon: Tag, area: "coupons" },
  { label: "Logística", href: "/admin/logistica", icon: Truck, area: "logistics" },
  { section: "Relacionamento" },
  { label: "Clientes", href: "/admin/clientes", icon: UserCog, area: "customers" },
  { label: "Afiliados", href: "/admin/afiliados", icon: Users, area: "affiliates" },
  { label: "SAC", href: "/admin/sac", icon: MessageSquare, area: "sac" },
  { label: "Atendimento IA", href: "/admin/atendimento-ia", icon: Bot, area: "sac" },
  { label: "CRM & Email", href: "/admin/crm", icon: Mail, area: "socialPublish" },
  { label: "Loyalty", href: "/admin/loyalty", icon: Gift, area: "socialPublish" },
  { section: "Marketing" },
  { label: "Fran Recomenda", href: "/admin/fran-recomenda", icon: Sparkles, area: "storeSettings" },
  { label: "Banners Home", href: "/admin/banners", icon: Image, area: "storeSettings" },
  { label: "Campanhas", href: "/admin/campanhas", icon: Megaphone, area: "storeSettings" },
  { label: "Redes Sociais", href: "/admin/redes-sociais", icon: Share2, area: "socialPublish" },
  { label: "Reviews", href: "/admin/reviews", icon: Star, area: "reviews" },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, area: "financeiro" },
  { section: "Sistema" },
  { label: "Financeiro", href: "/admin/financeiro", icon: DollarSign, area: "financeiro" },
  { label: "Logs", href: "/admin/logs", icon: History, area: "auditLogs" },
  { label: "NF-e", href: "/admin/nfe", icon: FileText, area: "nfe" },
  { label: "Integrações", href: "/admin/integracoes", icon: Globe, area: "integrations" },
  { label: "Notificações", href: "/admin/notificacoes", icon: Bell, area: "notifications" },
  { label: "Pagamentos", href: "/admin/pagamentos", icon: CreditCard, area: "payments" },
  { label: "Usuários", href: "/admin/usuarios", icon: Users, area: "adminUsers" },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings, area: "storeSettings" },
];

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { admin } = Route.useRouteContext();
  const adminEmail = admin?.email || "admin@fragranciaria.com";
  const adminInitial = adminEmail.charAt(0).toUpperCase();
  const allowedAreas = allowedAreasForRole(admin?.role ?? "total");

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  const logoutFn = useServerFn(logoutAdmin);

  const handleLogout = async () => {
    await logoutFn();
    window.location.href = "/admin-login";
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0F3A3E] text-white">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo variant="compact" className="h-8 brightness-0 invert" />
          </Link>
          <p className="text-[10px] uppercase tracking-wider text-white/50 mt-2">
            Painel Administrativo
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item, index) =>
            "section" in item ? (
              <div key={item.section} className={cn("pt-4 pb-2", index > 0 && "mt-2")}>
                <p className="px-4 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  {item.section}
                </p>
              </div>
            ) : !item.area || allowedAreas.includes(item.area) ? (
              <Link
                key={item.href}
                to={item.href!}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                  isActive(item.href!, item.exact)
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.label}
              </Link>
            ) : null,
          )}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#B07B1E] flex items-center justify-center text-white font-medium">
              {adminInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">Admin</p>
              <p className="text-xs text-white/50 truncate">{adminEmail}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0F3A3E] text-white">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <Link to="/">
                <BrandLogo variant="compact" className="h-8 brightness-0 invert" />
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 text-white/70 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="py-6 px-4 space-y-1 overflow-y-auto">
              {SIDEBAR_ITEMS.map((item, index) =>
                "section" in item ? (
                  <div key={item.section} className={cn("pt-4 pb-2", index > 0 && "mt-2")}>
                    <p className="px-4 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                      {item.section}
                    </p>
                  </div>
                ) : !item.area || allowedAreas.includes(item.area) ? (
                  <Link
                    key={item.href}
                    to={item.href!}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                      isActive(item.href!, item.exact)
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    {item.label}
                  </Link>
                ) : null,
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-[#E9E1D2] px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[#51635F] hover:text-[#0F3A3E]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2 w-64 bg-[#F5F3EE] border border-transparent focus:bg-white focus:border-[#E9E1D2] outline-none text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-[#51635F] hover:text-[#0F3A3E] relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#B07B1E] rounded-full" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-[#E9E1D2]">
              <div className="w-8 h-8 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white text-sm font-medium">
                {adminInitial}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-[#0F3A3E] font-medium">Admin</p>
                <p className="text-xs text-[#8A938E]">{adminEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3]"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
