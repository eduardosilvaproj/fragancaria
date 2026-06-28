// WebSocket polyfill — MUST run before any Supabase client is constructed.
// Node < 22 has no global WebSocket; @supabase/realtime-js throws on construct.
// Inlined (not a side-effect import) so the bundler can't tree-shake it away.
import ws from "ws";
{
  const g = globalThis as { WebSocket?: unknown };
  if (typeof g.WebSocket === "undefined") {
    g.WebSocket = ws;
  }
}

import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const BUILD_VERSION = new Date().toISOString().replace(/[:.-]/g, "").slice(0, 14);

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Handle version.json requests immediately (no SSR needed)
      const url = new URL(request.url);
      if (url.pathname === "/version.json") {
        return new Response(
          JSON.stringify({
            version: BUILD_VERSION,
          }),
          {
            headers: {
              "content-type": "application/json",
              "cache-control": "no-cache, no-store, must-revalidate",
            },
          }
        );
      }

      // SSR with timeout protection
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalizedResponse = await normalizeCatastrophicSsrResponse(response);

      return normalizedResponse;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
