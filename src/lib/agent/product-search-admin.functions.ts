import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server function para busca de produtos no admin. O supabaseAdmin fica
// exclusivamente no .handler() — nunca vai pro bundle do cliente.
// Protegida por requireAdmin (cookie httpOnly).

export const searchProductsAdmin = createServerFn({ method: "GET" })
  .validator((d: unknown) =>
    z.object({ query: z.string(), limit: z.number().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { searchProducts } = await import("./product-search");
    return searchProducts(supabaseAdmin, data);
  });
