// Server-only admin auth helpers. NEVER import from client/route components
// except through server functions — this reads the service-role key and signs
// the session cookie.
//
// Flow: loginAdmin() signs in via Supabase Auth, confirms the user is in the
// `admins` table, then stores {access_token, refresh_token} in an httpOnly
// cookie. requireAdmin() validates that cookie on every protected server
// function (and the /admin beforeLoad), refreshing the token when expired.
import { getCookie, setCookie, deleteCookie, getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Node < 22 has no native WebSocket. supabase-js constructs a RealtimeClient on
// createClient() and throws "Node.js N detected without native WebSocket
// support" unless the global is polyfilled AND a transport is provided. This
// file's createClient runs before client.server.ts is imported, so we must
// polyfill here too. Server-only module.
if (typeof (globalThis as { WebSocket?: unknown }).WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = ws;
}

export const ADMIN_COOKIE = "fa_admin_session";

type SessionTokens = { access_token: string; refresh_token: string };

export type AdminUser = { userId: string; email: string };

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

// Auth client built with the anon/publishable key — used only for
// signInWithPassword and refreshSession (token operations), never for data.
function getAuthClient() {
  const url = process.env.SUPABASE_URL;
  const anon =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing Supabase env: SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (ou VITE_SUPABASE_ANON_KEY) são necessários para o login admin.",
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    realtime: {
      // Node < 22 has no native WebSocket; supabase-js still constructs a
      // RealtimeClient and throws unless a transport is provided.
      transport: ws as unknown as typeof WebSocket,
    },
  });
}

function readCookie(): SessionTokens | null {
  const raw = getCookie(ADMIN_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionTokens;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCookie(tokens: SessionTokens) {
  setCookie(ADMIN_COOKIE, JSON.stringify(tokens), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAdminCookie() {
  deleteCookie(ADMIN_COOKIE, { path: "/" });
}

// True if this auth user id is listed in the admins table. Uses service role
// (bypasses RLS); admins is not readable by anon/authenticated.
async function isAdminUser(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("isAdminUser error:", error.message);
    return false;
  }
  return !!data;
}

// Validates the session cookie and returns the admin, or null. If the access
// token is expired but the refresh token is valid, transparently refreshes and
// rewrites the cookie. Returns null (and clears the cookie) on any failure.
export async function resolveAdmin(): Promise<AdminUser | null> {
  const tokens = readCookie();
  if (!tokens) return null;

  const auth = getAuthClient();

  // First try the access token as-is.
  let userId: string | undefined;
  let email: string | undefined;

  const { data: userData } = await auth.auth.getUser(tokens.access_token);
  if (userData?.user) {
    userId = userData.user.id;
    email = userData.user.email ?? "";
  } else {
    // Access token invalid/expired — try to refresh.
    const { data: refreshed, error: refreshError } =
      await auth.auth.refreshSession({ refresh_token: tokens.refresh_token });
    if (refreshError || !refreshed?.session || !refreshed.user) {
      clearAdminCookie();
      return null;
    }
    userId = refreshed.user.id;
    email = refreshed.user.email ?? "";
    writeCookie({
      access_token: refreshed.session.access_token,
      refresh_token: refreshed.session.refresh_token,
    });
  }

  if (!userId || !(await isAdminUser(userId))) {
    clearAdminCookie();
    return null;
  }

  return { userId, email: email ?? "" };
}

// Throws when there is no valid admin session. Use at the top of every
// protected server function: `await requireAdmin();`
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await resolveAdmin();
  if (!admin) {
    throw new Error("NAO_AUTORIZADO");
  }
  return admin;
}

export function logoutAdmin(): void {
  clearAdminCookie();
}


export async function loginAdmin(
  email: string,
  password: string,
): Promise<AdminUser> {
  // Rate limit por e-mail + IP: no máximo 5 tentativas a cada 15 min. Trava
  // brute-force. O bucket é zerado num login bem-sucedido. Em memória (uma
  // instância no Railway); migrar p/ Redis se escalar horizontalmente.
  const { rateLimit, rateLimitReset } = await import("@/lib/rate-limit");
  const ip =
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    getRequestHeader("x-real-ip") ||
    "unknown";
  const rlKey = `admin-login:${email.toLowerCase()}:${ip}`;
  const rl = rateLimit(rlKey, 5, 15 * 60 * 1000);
  if (!rl.allowed) {
    throw new Error(
      `MUITAS_TENTATIVAS: tente novamente em ${Math.ceil(rl.retryAfterSeconds / 60)} min`,
    );
  }

  const auth = getAuthClient();
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data?.user || !data?.session) {
      throw new Error("CREDENCIAIS_INVALIDAS");
  }

  const userId = data.user.id;
  if (!(await isAdminUser(userId))) {
    throw new Error("NAO_AUTORIZADO");
  }

  writeCookie({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  rateLimitReset(rlKey);
  return { userId, email: data.user.email ?? "" };
}
