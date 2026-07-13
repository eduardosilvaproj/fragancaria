import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Hook reativo de sessão Supabase. Lê a sessão atual + escuta mudanças
// (login, logout, token refresh). Não persiste em store global — o
// próprio client Supabase já persiste a sessão em localStorage.

export type SupabaseSessionState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

// Garante que exista um registro em `customers` para o usuário autenticado.
// Necessário porque o login via Google OAuth cria o auth.users mas não passa
// pelo formulário de perfil — sem isso, o cliente ficaria invisível no admin.
// Idempotente (onConflict: auth_user_id) e disparado só uma vez por user.id.
async function ensureCustomerRecord(user: User) {
  const meta = user.user_metadata ?? {};
  const name =
    (meta.full_name as string) || (meta.name as string) || null;
  await supabase
    .from("customers")
    .upsert(
      {
        auth_user_id: user.id,
        email: user.email ?? null,
        name,
      },
      { onConflict: "auth_user_id", ignoreDuplicates: true },
    );
}

export function useSupabaseSession(): SupabaseSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const ensuredFor = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const maybeEnsure = (next: Session | null) => {
      const uid = next?.user?.id;
      if (uid && ensuredFor.current !== uid) {
        ensuredFor.current = uid;
        void ensureCustomerRecord(next!.user);
      }
    };

    // Sessão inicial (pode estar no localStorage).
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        maybeEnsure(data.session ?? null);
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
      maybeEnsure(next ?? null);
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
