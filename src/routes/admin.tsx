import { createFileRoute, Link, Outlet, useLocation, redirect } from "@tanstack/react-router";
import {
  Users,
  UserCog,
  MessageSquare,
  Bot,
  Share2,
  BarChart3,
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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { getAdminSession } = await import("@/lib/admin.functions");
    const session = await getAdminSession();
    if (!session) {
      throw redirect({ to: "/admin-login" });
    }
    return { admin: session };
  },
  component: AdminLayout,
});

const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: Home, exact: true },
  { section: "E-commerce" },
  { label: "Produtos", href: "/admin/produtos", icon: Package },
  { label: "Categorias", href: "/admin/categorias", icon: Layers },
  { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
  { label: "Cupons", href: "/admin/cupons", icon: Tag },
  { label: "Logística", href: "/admin/logistica", icon: Truck },
  { section: "Relacionamento" },
  { label: "Clientes", href: "/admin/clientes", icon: UserCog },
  { label: "Afiliados", href: "/admin/afiliados", icon: Users },
  { label: "SAC", href: "/admin/sac", icon: MessageSquare },
  { label: "Atendimento IA", href: "/admin/atendimento-ia", icon: Bot },
  { label: "CRM & Email", href: "/admin/crm", icon: Mail },
  { label: "Loyalty", href: "/admin/loyalty", icon: Gift },
  { section: "Marketing" },
  { label: "Redes Sociais", href: "/admin/redes-sociais", icon: Share2 },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { section: "Sistema" },
  { label: "Pagamentos", href: "/admin/pagamentos", icon: CreditCard },
  { label: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { admin } = Route.useRouteContext();
  const adminEmail = admin?.email || "admin@fragranciaria.com";
  const adminInitial = adminEmail.charAt(0).toUpperCase();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href;
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EE] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0F3A3E] text-white">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="Fragranciaria"
              className="h-8 w-auto brightness-0 invert"
            />
          </Link>
          <p className="text-[10px] uppercase tracking-wider text-white/50 mt-2">
            Painel Administrativo
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item, index) =>
            'section' in item ? (
              <div key={item.section} className={cn("pt-4 pb-2", index > 0 && "mt-2")}>
                <p className="px-4 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                  {item.section}
                </p>
              </div>
            ) : (
              <Link
                key={item.href}
                to={item.href!}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                  isActive(item.href!, item.exact)
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.icon && <item.icon className="h-5 w-5" />}
                {item.label}
              </Link>
            )
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
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0F3A3E] text-white">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <Link to="/">
                <img
                  src="/images/logo.png"
                  alt="Fragranciaria"
                  className="h-8 w-auto brightness-0 invert"
                />
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
                'section' in item ? (
                  <div key={item.section} className={cn("pt-4 pb-2", index > 0 && "mt-2")}>
                    <p className="px-4 text-[10px] uppercase tracking-wider text-white/40 font-medium">
                      {item.section}
                    </p>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    to={item.href!}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
                      isActive(item.href!, item.exact)
                        ? "bg-white/15 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {item.icon && <item.icon className="h-5 w-5" />}
                    {item.label}
                  </Link>
                )
              )}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#E9E1D2] px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-[#0F3A3E] hover:bg-[#F3EEE3] rounded-lg"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden md:flex items-center gap-2 text-sm text-[#51635F]">
            <Link to="/admin" className="hover:text-[#0F3A3E]">
              Admin
            </Link>
            {location.pathname !== "/admin" && (
              <>
                <ChevronRight className="h-4 w-4" />
                <span className="text-[#0F3A3E] capitalize">
                  {location.pathname.split("/").pop()?.replace(/-/g, " ")}
                </span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-[#F5F3EE] rounded-lg px-4 py-2">
            <Search className="h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-transparent text-sm outline-none w-48"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 text-[#51635F] hover:text-[#0F3A3E] hover:bg-[#F3EEE3] rounded-lg">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#B07B1E] flex items-center justify-center text-white text-sm font-medium">
              {adminInitial}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
