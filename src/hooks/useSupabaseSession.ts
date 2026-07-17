import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { linkCurrentAccount } from "@/lib/account.functions";

// Hook reativo de sessão Supabase. Lê a sessão atual + escuta mudanças
// (login, logout, token refresh). Não persiste em store global — o
// próprio client Supabase já persiste a sessão em localStorage.

export type SupabaseSessionState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export function useSupabaseSession(): SupabaseSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const linkedFor = useRef<string | null>(null);
  const linkCurrentAccountFn = useServerFn(linkCurrentAccount);

  useEffect(() => {
    let mounted = true;

    const maybeLink = (next: Session | null) => {
      const uid = next?.user?.id;
      if (uid && linkedFor.current !== uid) {
        linkedFor.current = uid;
        void linkCurrentAccountFn().then((result) => {
          if (!result.success) {
            console.warn("Não foi possível vincular conta e pedidos", result.error);
          }
        });
      }
    };

    // Sessão inicial (pode estar no localStorage).
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        maybeLink(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    // Listener de mudanças (login, logout, token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next ?? null);
      maybeLink(next ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
  };
}
