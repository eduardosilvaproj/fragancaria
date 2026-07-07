import { createFileRoute } from "@tanstack/react-router";
import { listFeatured } from "@/lib/home-featured.functions";

export const Route = createFileRoute("/api/debug/featured")({
  server: {
    handlers: {
      GET: async () => {
        const slots = ["bestsellers", "new_arrivals", "on_sale", "kits"] as const;
        const results: Record<string, { success: boolean; count: number; error?: string; sample?: any }> = {};
        for (const slot of slots) {
          const r = await listFeatured({ data: slot });
          results[slot] = {
            success: r.success,
            count: r.data?.length ?? 0,
            error: r.error,
            sample: r.data?.slice(0, 2).map((p) => ({ id: p.id, name: p.name })) ?? [],
          };
        }
        return new Response(JSON.stringify(results, null, 2), {
          headers: { "content-type": "application/json; charset=utf-8" },
        });
      },
    },
  },
});