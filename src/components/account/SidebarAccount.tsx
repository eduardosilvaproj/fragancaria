import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  Bell,
  RotateCcw,
  User,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { section: "Geral" },
  { label: "Visao geral", href: "/minha-conta", icon: LayoutDashboard, exact: true },
  { label: "Meus dados", href: "/minha-conta/perfil", icon: User },
  { section: "Compras" },
  { label: "Pedidos", href: "/minha-conta/pedidos", icon: Package },
  { label: "Cancelamentos", href: "/minha-conta/cancelamentos", icon: RotateCcw },
  { section: "Engajamento" },
  { label: "Favoritos", href: "/minha-conta/favoritos", icon: Heart },
  { label: "Notificacoes", href: "/minha-conta/notificacoes", icon: Bell },
];

export function SidebarAccount() {
  const loc = useLocation();
  const path = loc.pathname;

  return (
    <aside className="bg-white rounded-2xl border border-[#E9E1D2] p-4">
      <p className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[#8A938E] font-semibold">
        Minha conta
      </p>
      <nav className="mt-2 space-y-1">
        {SECTIONS.map((item, idx) =>
          "section" in item ? (
            <p
              key={`s-${item.section}-${idx}`}
              className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider text-[#8A938E] font-semibold"
            >
              {item.section}
            </p>
          ) : (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                (item as any).exact
                  ? path === (item as any).href
                    ? "bg-[#F3EEE3] text-[#0F3A3E] font-medium"
                    : "text-[#51635F] hover:bg-[#F5F3EE]"
                  : path.startsWith((item as any).href)
                  ? "bg-[#F3EEE3] text-[#0F3A3E] font-medium"
                  : "text-[#51635F] hover:bg-[#F5F3EE]"
              )}
            >
              <span className="flex items-center gap-3">
                {(item as any).icon && (
                  <span className="h-4 w-4 inline-flex items-center justify-center">
                    <IconWrap Icon={(item as any).icon} />
                  </span>
                )}
                {(item as any).label}
              </span>
              <ChevronRight className="h-4 w-4 opacity-50" />
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}

function IconWrap({ Icon }: { Icon: any }) {
  return <Icon className="h-4 w-4" />;
}

export default SidebarAccount;
