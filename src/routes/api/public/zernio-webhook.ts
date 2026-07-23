import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Zernio-Signature, X-Zernio-Event-Id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_SECRET = process.env.ZERNIO_WEBHOOK_SECRET;

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader || !WEBHOOK_SECRET) return false;
  const computed = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/zernio-webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("X-Zernio-Signature");

        if (!verifySignature(rawBody, signature)) {
          console.log("[zernio-webhook] 401 — assinatura inválida ou secret ausente");
          return new Response("Invalid signature", {
            status: 401,
            headers: { ...corsHeaders, "content-type": "text/plain" },
          });
        }

        const payload = JSON.parse(rawBody);
        console.log("[zernio-webhook] evento recebido:", JSON.stringify(payload));

        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      },
    },
  },
});
