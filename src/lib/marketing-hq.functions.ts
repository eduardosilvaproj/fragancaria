import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// =============================================
// MARKETING HQ SERVER FUNCTIONS
// =============================================

export const exportParamsSchema = z.object({
  period: z.enum(["7d", "30d", "90d", "custom"]).optional().default("30d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: z.enum(["csv", "xlsx", "json"]).optional().default("csv"),
  dataType: z.enum(["products", "sales", "funnel", "metrics", "traffic", "all"]).optional().default("all"),
  sku: z.string().optional(),
});

export type ExportParams = z.infer<typeof exportParamsSchema>;

export type ExportResult = {
  success: boolean;
  data?: {
    url?: string;
    filename: string;
    format: string;
    generatedAt: string;
  };
  error?: string;
};

// Função para obter snapshot de marketing
export const getMarketingSnapshot = createServerFn({ method: "GET" })
  .validator((params: unknown) => params as {
    period?: "7d" | "30d" | "90d" | "custom";
    startDate?: string;
    endDate?: string;
    sku?: string;
  } | undefined)
  .handler(async ({ data: params }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { period = "30d", startDate, endDate, sku } = params ?? {};

      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;

      if (!startDate || !endDate) {
        const now = new Date();
        const end = now;
        const start = new Date(now);

        if (period === "7d") {
          start.setDate(now.getDate() - 7);
        } else if (period === "30d") {
          start.setDate(now.getDate() - 30);
        } else if (period === "90d") {
          start.setDate(now.getDate() - 90);
        }

        effectiveStartDate = start.toISOString().slice(0, 10);
        effectiveEndDate = end.toISOString().slice(0, 10);
      }

      const { data, error } = await (supabaseAdmin as any).rpc("get_marketing_hq_snapshot", {
        start_date_param: effectiveStartDate,
        end_date_param: effectiveEndDate,
        sku_param: sku || null,
      });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: data?.[0] || null,
      };
    } catch (error) {
      console.error("Erro ao obter snapshot de marketing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função para exportar dados de marketing
export const exportMarketingData = createServerFn({ method: "POST" })
  .validator((params: unknown) => exportParamsSchema.parse(params ?? {}))
  .handler(async ({ data: validatedParams }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { period, startDate, endDate, format, dataType, sku } = validatedParams;

      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;

      if (!startDate || !endDate) {
        const now = new Date();
        const end = now;
        const start = new Date(now);

        if (period === "7d") {
          start.setDate(now.getDate() - 7);
        } else if (period === "30d") {
          start.setDate(now.getDate() - 30);
        } else if (period === "90d") {
          start.setDate(now.getDate() - 90);
        }

        effectiveStartDate = start.toISOString().slice(0, 10);
        effectiveEndDate = end.toISOString().slice(0, 10);
      }

      const snapshotResult = await getMarketingSnapshot({
        data: {
          period: "custom",
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          sku,
        },
      });

      if (!snapshotResult.success || !snapshotResult.data) {
        throw new Error(snapshotResult.error || "Não foi possível obter dados de marketing");
      }

      const snapshot = snapshotResult.data;
      let additionalData: Record<string, unknown> = {};

      if (dataType === "products" || dataType === "all") {
        const { data: products, error: productsError } = await (supabaseAdmin as any)
          .from("hq_product_metrics")
          .select("*");

        if (productsError) throw productsError;
        additionalData = { ...additionalData, products };
      }

      if (dataType === "sales" || dataType === "all") {
        const { data: sales, error: salesError } = await (supabaseAdmin as any)
          .from("hq_sales_daily")
          .select("*")
          .gte("date", effectiveStartDate!)
          .lte("date", effectiveEndDate!);

        if (salesError) throw salesError;
        additionalData = { ...additionalData, sales };
      }

      if (dataType === "traffic" || dataType === "all") {
        const { data: traffic, error: trafficError } = await (supabaseAdmin as any)
          .from("hq_traffic_sources")
          .select("*");

        if (trafficError) throw trafficError;
        additionalData = { ...additionalData, traffic };
      }

      const exportData = {
        snapshot,
        ...additionalData,
        metadata: {
          period,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          generatedAt: new Date().toISOString(),
        },
      };

      let fileUrl: string | undefined;
      let filename: string;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const baseFilename = `marketing_hq_export_${timestamp}`;

      if (format === "json") {
        filename = `${baseFilename}.json`;
        const content = JSON.stringify(exportData, null, 2);

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("marketing-exports")
          .upload(filename, content, {
            contentType: "application/json",
          });

        if (uploadError) throw uploadError;
        fileUrl = uploadData.path;
      } else if (format === "csv") {
        const csvData = convertToCsv(exportData);
        filename = `${baseFilename}.csv`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("marketing-exports")
          .upload(filename, csvData, {
            contentType: "text/csv",
          });

        if (uploadError) throw uploadError;
        fileUrl = uploadData.path;
      } else {
        filename = `${baseFilename}.json`;
        const content = JSON.stringify(exportData, null, 2);
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from("marketing-exports")
          .upload(filename, content, {
            contentType: "application/json",
          });

        if (uploadError) throw uploadError;
        fileUrl = uploadData.path;
      }

      return {
        success: true,
        data: {
          url: fileUrl,
          filename,
          format,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("Erro ao exportar dados de marketing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função para registrar sincronização com Marketing HQ
export const requestMarketingHqSync = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data, error } = await (supabaseAdmin as any)
        .from("marketing_hq_sync_requests")
        .insert({
          requested_at: new Date().toISOString(),
          status: "pending",
          metadata: {
            user_agent: "admin-panel",
          },
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          syncId: data.id,
          requestedAt: data.requested_at,
        },
      };
    } catch (error) {
      console.error("Erro ao solicitar sincronização:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função para obter status de sincronização
export const getMarketingHqSyncStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data, error } = await (supabaseAdmin as any)
        .from("marketing_hq_sync_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Erro ao obter status de sincronização:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função para obter dados de tráfego
export const getTrafficSources = createServerFn({ method: "GET" })
  .validator((params: unknown) => params as {
    period?: "7d" | "30d" | "90d" | "custom";
    startDate?: string;
    endDate?: string;
  } | undefined)
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await (supabaseAdmin as any).from("hq_traffic_sources").select("*");

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Erro ao obter fontes de tráfego:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função para obter métricas de produtos
export const getProductMetrics = createServerFn({ method: "GET" })
  .validator((params: unknown) => params as {
    period?: "7d" | "30d" | "90d" | "custom";
    startDate?: string;
    endDate?: string;
    sku?: string;
  } | undefined)
  .handler(async ({ data: params }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sku } = params ?? {};

      const { data, error } = await (supabaseAdmin as any).from("hq_product_metrics").select("*");

      if (error) throw error;

      let filteredData = data;
      if (sku) {
        filteredData = (data || []).filter((item: Record<string, unknown>) => item.product_sku === sku);
      }

      return {
        success: true,
        data: filteredData,
      };
    } catch (error) {
      console.error("Erro ao obter métricas de produtos:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função para obter vendas diárias
export const getDailySales = createServerFn({ method: "GET" })
  .validator((params: unknown) => params as {
    period?: "7d" | "30d" | "90d" | "custom";
    startDate?: string;
    endDate?: string;
  } | undefined)
  .handler(async ({ data: params }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { period = "30d", startDate, endDate } = params ?? {};

      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;

      if (!startDate || !endDate) {
        const now = new Date();
        const end = now;
        const start = new Date(now);

        if (period === "7d") {
          start.setDate(now.getDate() - 7);
        } else if (period === "30d") {
          start.setDate(now.getDate() - 30);
        } else if (period === "90d") {
          start.setDate(now.getDate() - 90);
        }

        effectiveStartDate = start.toISOString().slice(0, 10);
        effectiveEndDate = end.toISOString().slice(0, 10);
      }

      const { data, error } = await (supabaseAdmin as any)
        .from("hq_sales_daily")
        .select("*")
        .gte("date", effectiveStartDate!)
        .lte("date", effectiveEndDate!)
        .order("date", { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Erro ao obter vendas diárias:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função para calcular métricas diárias
export const calculateDailyMetrics = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await (supabaseAdmin as any).rpc("calculate_daily_metrics");

      if (error) throw error;

      return {
        success: true,
        data: {
          message: "Métricas diárias calculadas com sucesso",
        },
      };
    } catch (error) {
      console.error("Erro ao calcular métricas diárias:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  });

// Função auxiliar para converter dados para CSV
function convertToCsv(data: Record<string, unknown>): string {
  const rows: string[] = [];

  const metadata = data.metadata as Record<string, unknown> | undefined;
  rows.push("Metadados");
  rows.push(`Período,${metadata?.period ?? "N/A"}`);
  rows.push(`Data Inicial,${metadata?.startDate ?? "N/A"}`);
  rows.push(`Data Final,${metadata?.endDate ?? "N/A"}`);
  rows.push(`Gerado em,${metadata?.generatedAt ?? "N/A"}`);
  rows.push("");

  const snapshot = data.snapshot as Record<string, unknown> | undefined;
  if (snapshot) {
    rows.push("Snapshot");
    rows.push("Métrica,Valor");
    rows.push(`Sessões,${snapshot.sessions ?? 0}`);
    rows.push(`Visualizações de Produto,${snapshot.product_views ?? 0}`);
    rows.push(`Adições ao Carrinho,${snapshot.add_to_cart ?? 0}`);
    rows.push(`Inícios de Checkout,${snapshot.checkout_started ?? 0}`);
    rows.push(`Compras,${snapshot.purchases ?? 0}`);
    rows.push(`Receita,${snapshot.revenue ?? 0}`);
    rows.push("");
  }

  const products = data.products as Array<Record<string, unknown>> | undefined;
  if (products) {
    rows.push("Produtos");
    rows.push("Nome,Visualizações,Adições ao Carrinho,Compras,Receita");
    products.forEach((product) => {
      rows.push(
        `"${product.product_name ?? ""}","${product.views ?? 0}","${product.add_to_cart ?? 0}","${product.purchases ?? 0}","${product.revenue ?? 0}"`
      );
    });
    rows.push("");
  }

  const sales = data.sales as Array<Record<string, unknown>> | undefined;
  if (sales) {
    rows.push("Vendas Diárias");
    rows.push("Data,Pedidos,Receita Bruta,Receita Líquida,Unidades Vendidas");
    sales.forEach((sale) => {
      rows.push(
        `${sale.date ?? ""},${sale.orders ?? 0},${sale.gross_revenue ?? 0},${sale.net_revenue ?? 0},${sale.units_sold ?? 0}`
      );
    });
    rows.push("");
  }

  const traffic = data.traffic as Array<Record<string, unknown>> | undefined;
  if (traffic) {
    rows.push("Fontes de Tráfego");
    rows.push("Fonte,Meio,Sessões,Receita");
    traffic.forEach((source) => {
      rows.push(`"${source.source ?? ""}","${source.medium ?? ""}","${source.sessions ?? 0}","${source.revenue ?? 0}"`);
    });
  }

  return rows.join("\n");
}

export { convertToCsv };
