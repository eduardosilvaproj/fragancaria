import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

export const Route = createFileRoute("/minha-conta/notificacoes/")({
  component: NotificationsPage,
});

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: userData } = useSupabaseUser();
  const user = userData?.user;

  const notifications = useQuery({
    queryKey: ["my-notifications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotificationRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, message, link, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        type: r.type ?? "general",
        title: r.title ?? "",
        message: r.message ?? "",
        link: r.link ?? null,
        read: Boolean(r.read),
        createdAt: r.created_at ?? "",
      }));
    },
    refetchOnWindowFocus: false,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["my-notifications", user?.id] }),
  });

  if (notifications.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-16 bg-white rounded-2xl border border-[#E9E1D2] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const items = notifications.data ?? [];
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-[#0F3A3E]" />
          <h2 className="text-lg font-semibold text-[#0F3A3E]">
            Notificacoes
          </h2>
          {unread > 0 && (
            <span className="text-xs text-white bg-red-600 px-2 py-0.5 rounded-full">
              {unread} novas
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E9E1D2] text-xs text-[#0F3A3E] hover:bg-[#F5F3EE]"
          >
            <Check className="h-3 w-3" />
            Marcar todas como lidas
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E9E1D2] p-12 text-center">
          <Bell className="h-10 w-10 text-[#8A938E] mx-auto mb-3" />
          <p className="text-sm text-[#51635F]">
            Sem notificacoes por enquanto.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`bg-white rounded-2xl border p-4 ${
                n.read ? "border-[#E9E1D2]" : "border-[#0F3A3E]"
              }`}
            >
              <div className="flex items-start gap-3">
                {!n.read && (
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0F3A3E]">
                    {n.title}
                  </p>
                  <p className="text-sm text-[#51635F] mt-1">{n.message}</p>
                  <p className="text-[11px] text-[#8A938E] mt-2">
                    {new Date(n.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {n.link &&
                    (n.link.startsWith("http://") ||
                    n.link.startsWith("https://") ? (
                      <a
                        href={n.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-xs text-[#0F3A3E] underline"
                      >
                        Ver detalhes
                      </a>
                    ) : (
                      <Link
                        to={n.link}
                        className="inline-block mt-2 text-xs text-[#0F3A3E] underline"
                      >
                        Ver detalhes
                      </Link>
                    ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationsPage;