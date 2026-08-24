import { createFileRoute } from "@tanstack/react-router";
import { runReorderReminders, runBirthdayCoupons } from "@/lib/marketing-automation.functions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Cron-Secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const CRON_SECRET = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const Route = createFileRoute("/api/cron/marketing-automation")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) => handleCron(request),
      POST: async ({ request }) => handleCron(request),
    },
  },
});

async function handleCron(request: Request) {
  const secret = request.headers.get("X-Cron-Secret") || new URL(request.url).searchParams.get("secret");

  if (CRON_SECRET && secret !== CRON_SECRET && process.env.NODE_ENV === "production") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  try {
    console.log("[MarketingCron] Iniciando execução das automações diárias...");
    const reorderResult = await runReorderReminders();
    const birthdayResult = await runBirthdayCoupons();

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      reorder: reorderResult,
      birthday: birthdayResult,
    };

    console.log("[MarketingCron] Execução concluída:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("[MarketingCron] Erro fatal na execução:", err?.message || err);
    return new Response(JSON.stringify({ success: false, error: err?.message || "Internal Error" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
}
