import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Heart,
  Bell,
  RotateCcw,
  User,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SectionHeader = { kind: "section"; title: string };
type SectionLink = {
  kind: "link";
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};
type SectionItem = SectionHeader | SectionLink;

const SECTIONS: SectionItem[] = [
  { kind: "section", title: "Geral" },
  {
    kind: "link",
    label: "Visao geral",
    href: "/minha-conta",
    icon: LayoutDashboard,
    exact: true,
  },
  { kind: "link", label: "Meus dados", href: "/minha-conta/perfil", icon: User },
  { kind: "section", title: "Compras" },
  {
    kind: "link",
    label: "Pedidos",
    href: "/minha-conta/pedidos",
    icon: Package,
  },
  {
    kind: "link",
    label: "Cancelamentos",
    href: "/minha-conta/cancelamentos",
    icon: RotateCcw,
  },
  { kind: "section", title: "Engajamento" },
  {
    kind: "link",
    label: "Favoritos",
    href: "/minha-conta/favoritos",
    icon: Heart,
  },
  {
    kind: "link",
    label: "Notificacoes",
    href: "/minha-conta/notificacoes",
    icon: Bell,
  },
];

function isActive(path: string, href: string, exact?: boolean): boolean {
  return exact ? path === href : path.startsWith(href);
}

export function SidebarAccount() {
  const loc = useLocation();
  const path = loc.pathname;

  return (
    <aside
      className="bg-white rounded-2xl border border-[#E9E1D2] p-3 self-start"
      aria-label="Navegacao da conta"
    >
      <p className="px-3 pt-3 pb-2 text-[10px] uppercase tracking-[0.08em] text-[#8A938E] font-semibold">
        Minha conta
      </p>
      <nav className="mt-1 flex flex-col gap-0.5" aria-label="Secoes">
        {SECTIONS.map((item) =>
          item.kind === "section" ? (
            <p
              key={`s-${item.title}`}
              className="px-3 pt-4 pb-1 first:pt-0 text-[10px] uppercase tracking-[0.08em] text-[#8A938E] font-semibold"
            >
              {item.title}
            </p>
          ) : (
            <Link
              key={item.href}
              to={item.href}
              aria-current={isActive(path, item.href, item.exact) ? "page" : undefined}
              className={cn(
                "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive(path, item.href, item.exact)
                  ? "bg-[#F3EEE3] text-[#0F3A3E] font-medium"
                  : "text-[#51635F] hover:bg-[#F5F3EE] hover:text-[#0F3A3E]"
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive(path, item.href, item.exact)
                      ? "text-[#0F3A3E]"
                      : "text-[#8A938E] group-hover:text-[#0F3A3E]"
                  )}
                  aria-hidden
                />
                {item.label}
              </span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-opacity",
                  isActive(path, item.href, item.exact) ? "opacity-80" : "opacity-40 group-hover:opacity-70"
                )}
                aria-hidden
              />
            </Link>
          )
        )}
      </nav>
    </aside>
  );
}

export default SidebarAccount;
