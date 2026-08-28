import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting in-memory map (IP -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // 60 requests per minute per IP

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(clientIp);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  record.count++;
  return true;
}

export const Route = createFileRoute("/api/marketing/track")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          // Check body size limit (max 10KB)
          const contentLength = request.headers.get("content-length");
          if (contentLength && parseInt(contentLength, 10) > 10240) {
            return new Response(null, { status: 413, headers: corsHeaders });
          }

          // Rate limit by IP
          const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
          if (!checkRateLimit(clientIp)) {
            return new Response(null, { status: 429, headers: corsHeaders });
          }

          const body = await request.json().catch(() => null);
          if (!body || !body.event_type || !body.session_id || !body.anonymous_user_id) {
            return new Response(null, { status: 204, headers: corsHeaders }); // Fail silently to client
          }

          const {
            session_id,
            anonymous_user_id,
            customer_id = null,
            event_type,
            product_id = null,
            sku = null,
            source = null,
            medium = null,
            campaign = null,
            content = null,
            term = null,
            device_type = 'other',
            page_url = null,
            referrer = null,
            metadata = {},
          } = body;

          // Call RPC via service_role admin client
          const { error } = await (supabaseAdmin.rpc as any)("track_event", {
            p_session_id: session_id,
            p_anonymous_user_id: anonymous_user_id,
            p_customer_id: customer_id,
            p_event_type: event_type,
            p_product_id: product_id ? String(product_id) : null,
            p_sku: sku ? String(sku) : null,
            p_source: source,
            p_medium: medium,
            p_campaign: campaign,
            p_content: content,
            p_term: term,
            p_device_type: device_type,
            p_page_url: page_url,
            p_referrer: referrer,
            p_metadata: metadata,
          });

          if (error) {
            console.error("[MarketingTrackAPI] Error executing track_event RPC:", error.message);
          }
        } catch (err: any) {
          console.error("[MarketingTrackAPI] Internal error:", err?.message || err);
        }

        // Always return 204 No Content to never break client UX
        return new Response(null, { status: 204, headers: corsHeaders });
      },
    },
  },
});
