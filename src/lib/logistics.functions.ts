import { createServerFn } from "@tanstack/react-start";

// =====================================================
// TIPOS
// =====================================================

export type Shipment = {
  id: string;
  order_id: string | null;
  order_number: number | null;
  customer_name: string | null;
  customer_email: string | null;
  carrier: string | null;
  service: string | null;
  service_code: string | null;
  price: number;
  final_price: number;
  estimated_days: number | null;
  tracking_code: string | null;
  tracking_url: string | null;
  status: string;
  shipped_at: string | null;
  delivered_at: string | null;
  label_url: string | null;
  created_at: string;
};

export type ShipmentStats = {
  pending: number;
  paid: number;
  shipped: number;
  in_transit: number;
  out_for_delivery: number;
  delivered: number;
  exception: number;
};

export type CreateShipmentInput = {
  orderId: string;
  carrier: string;
  service: string;
  serviceCode: string;
  price: number;
  estimatedDays: number;
  recipientName: string;
  recipientPhone?: string;
  recipientEmail: string;
  recipientPostalCode: string;
  recipientAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  packageWeight: number;
  packageHeight: number;
  packageWidth: number;
  packageLength: number;
  declaredValue: number;
};

export type ShipmentResponse = {
  id: string;
  tracking_code: string;
  tracking_url: string;
  label_url: string;
  carrier: string;
  service: string;
  status: string;
  estimated_delivery: string;
  price: number;
};

// =====================================================
// LISTAR REMESSAS
// =====================================================

export const listShipments = createServerFn({ method: "GET" })
  .validator((d: unknown) => (d ?? {}) as {
    status?: string;
    trackingCode?: string;
    limit?: number;
    offset?: number;
  })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const limit = data.limit ?? 50;
      const offset = data.offset ?? 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = db.from("shipping_quotes").select(`
        *,
        order:orders(
          order_number,
          customer_name,
          customer_email
        )
      `).order("created_at", { ascending: false }).range(offset, offset + limit - 1);

      if (data.status) query = query.eq("status", data.status);
      if (data.trackingCode) query = query.ilike("tracking_code", `%${data.trackingCode}%`);

      const { data: rows, error } = await query;

      if (error) return { success: false as const, error: error.message };

      const shipments: Shipment[] = (rows || []).map((r: any) => ({
        ...r,
        order_number: r.order?.order_number ?? null,
        customer_name: r.order?.customer_name ?? null,
        customer_email: r.order?.customer_email ?? null,
      }));

      return { success: true as const, data: shipments };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// ESTATISTICAS DE ENVIO
// =====================================================

export const getShipmentStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await db.from("shipping_quotes").select("status");

      if (error) return { success: false as const, error: error.message };

      const byStatus: Record<string, number> = {};
      for (const row of data || []) {
        const s = String((row as any).status);
        byStatus[s] = (byStatus[s] || 0) + 1;
      }

      const stats: ShipmentStats = {
        pending: byStatus.pending || 0,
        paid: byStatus.paid || 0,
        shipped: byStatus.shipped || 0,
        in_transit: byStatus.in_transit || 0,
        out_for_delivery: byStatus.out_for_delivery || 0,
        delivered: byStatus.delivered || 0,
        exception: byStatus.exception || 0,
      };

      return { success: true as const, data: stats };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// CRIAR ENVIO / GERAR ETIQUETA
// =====================================================

export const createShipment = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as CreateShipmentInput)
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Buscar dados do pedido
      const { data: order, error: orderError } = await db
        .from("orders")
        .select("id, order_number, customer_name, customer_email, payer_phone")
        .eq("id", data.orderId)
        .single();

      if (orderError || !order) {
        return { success: false as const, error: "Pedido não encontrado" };
      }

      // Verificar se ja existe envio para este pedido
      const { data: existing } = await db
        .from("shipping_quotes")
        .select("id")
        .eq("order_id", data.orderId)
        .not("tracking_code", "is", null)
        .maybeSingle();

      if (existing) {
        return { success: false as const, error: "Já existe etiqueta para este pedido" };
      }

      // Chamar Envio Facil API (se configurado)
      let trackingCode: string | null = null;
      let labelUrl: string | null = null;
      let shipmentIdExternal: string | null = null;

      const envioFacilApiKey = process.env.VITE_ENVIOFACIL_API_KEY || process.env.ENVIOFACIL_API_KEY;

      if (envioFacilApiKey) {
        try {
          const response = await fetch("https://api.enviofacil.com.br/v1/shipments", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${envioFacilApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              service_code: data.serviceCode,
              carrier: data.carrier,
              from: {
                name: process.env.VITE_SENDER_NAME || "Fragranciaria",
                document: process.env.VITE_SENDER_DOCUMENT || "",
                email: "contato@fragranciaria.com",
                phone: "0000000000",
                address: {
                  street: "Endereço",
                  number: "0",
                  neighborhood: "Centro",
                  city: "São Paulo",
                  state: "SP",
                  postal_code: process.env.VITE_SENDER_POSTAL_CODE || "01310100",
                },
              },
              to: {
                name: data.recipientName,
                document: "",
                email: data.recipientEmail,
                phone: data.recipientPhone || "",
                address: {
                  street: data.recipientAddress.street,
                  number: data.recipientAddress.number,
                  complement: data.recipientAddress.complement || "",
                  neighborhood: data.recipientAddress.neighborhood,
                  city: data.recipientAddress.city,
                  state: data.recipientAddress.state,
                  postal_code: data.recipientPostalCode,
                },
              },
              package: {
                weight_grams: data.packageWeight,
                height_cm: data.packageHeight,
                width_cm: data.packageWidth,
                length_cm: data.packageLength,
              },
              declared_value: data.declaredValue,
              order_id: data.orderId,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.data) {
              trackingCode = result.data.tracking_code || null;
              labelUrl = result.data.label_url || null;
              shipmentIdExternal = result.data.id || null;
            }
          }
        } catch (apiError) {
          console.error("[logistics] EnvioFacil API error:", apiError);
          // Continua mesmo se a API falhar - gera registro local
        }
      }

      // Salvar no banco
      const { data: shipment, error: insertError } = await db
        .from("shipping_quotes")
        .insert({
          order_id: data.orderId,
          order_number: order.order_number || null,
          carrier: data.carrier,
          service: data.service,
          service_code: data.serviceCode,
          price: data.price,
          final_price: data.price,
          estimated_days: data.estimatedDays,
          weight_grams: data.packageWeight,
          height_cm: data.packageHeight,
          width_cm: data.packageWidth,
          length_cm: data.packageLength,
          recipient_name: data.recipientName,
          recipient_phone: data.recipientPhone || null,
          recipient_email: data.recipientEmail,
          recipient_postal_code: data.recipientPostalCode,
          recipient_address: data.recipientAddress,
          status: trackingCode ? "paid" : "pending",
          tracking_code: trackingCode,
          label_url: labelUrl,
          shipment_id_external: shipmentIdExternal,
        })
        .select()
        .single();

      if (insertError) {
        return { success: false as const, error: insertError.message };
      }

      // Atualizar pedido com tracking_code se disponivel
      if (trackingCode) {
        await db
          .from("orders")
          .update({
            tracking_code: trackingCode,
            shipping_carrier: data.carrier,
            shipping_method: `${data.carrier} ${data.service}`,
          })
          .eq("id", data.orderId);
      }

      return {
        success: true as const,
        data: {
          id: shipment.id,
          tracking_code: trackingCode,
          label_url: labelUrl,
          status: trackingCode ? "paid" : "pending",
        },
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// ATUALIZAR RASTREAMENTO (batch)
// =====================================================

export const refreshTracking = createServerFn({ method: "POST" })
  .validator((d: unknown) => (d ?? {}) as { ids?: string[] })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Buscar envios pendentes/atualizar
      let query = db
        .from("shipping_quotes")
        .select("id, tracking_code, carrier, order_id")
        .not("tracking_code", "is", null)
        .in("status", ["paid", "shipped", "in_transit", "out_for_delivery"]);

      if (data.ids && data.ids.length > 0) {
        query = query.in("id", data.ids);
      }

      const { data: shipments, error } = await query;

      if (error) return { success: false as const, error: error.message };

      if (!shipments || shipments.length === 0) {
        return { success: true as const, data: { updated: 0, errors: [] } };
      }

      const envioFacilApiKey = process.env.VITE_ENVIOFACIL_API_KEY || process.env.ENVIOFACIL_API_KEY;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: { id: string; status: string; error?: string }[] = [];

      for (const shipment of shipments) {
        if (!shipment.tracking_code) continue;

        try {
          if (envioFacilApiKey) {
            // Chamar API de rastreamento
            const response = await fetch(
              `https://api.enviofacil.com.br/v1/tracking/${shipment.tracking_code}`,
              {
                headers: { "Authorization": `Bearer ${envioFacilApiKey}` },
              }
            );

            if (response.ok) {
              const result = await response.json();
              if (result.data) {
                const newStatus = mapTrackingStatus(result.data.status);

                await db
                  .from("shipping_quotes")
                  .update({
                    status: newStatus,
                    delivered_at: newStatus === "delivered" ? new Date().toISOString() : null,
                  })
                  .eq("id", shipment.id);

                results.push({ id: shipment.id, status: newStatus });
                continue;
              }
            }
          }

          // Fallback: manter status atual se API falhar
          results.push({ id: shipment.id, status: "unchanged" });
        } catch {
          results.push({ id: shipment.id, status: "error", error: "Falha ao consultar API" });
        }
      }

      return {
        success: true as const,
        data: {
          total: shipments.length,
          updated: results.filter(r => r.status !== "unchanged" && r.status !== "error").length,
          errors: results.filter(r => r.error).map(r => ({ id: r.id, error: r.error })),
        },
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// GERAR/Baixar ETIQUETA
// =====================================================

export const getShipmentLabel = createServerFn({ method: "GET" })
  .validator((d: unknown) => ({ id: (d as any)?.id }) as { id: string })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data: shipment, error } = await db
        .from("shipping_quotes")
        .select("id, tracking_code, label_url, shipment_id_external, carrier, service")
        .eq("id", data.id)
        .single();

      if (error || !shipment) {
        return { success: false as const, error: "Envio não encontrado" };
      }

      // Se ja tem URL da etiqueta, retorna
      if (shipment.label_url) {
        return { success: true as const, data: { url: shipment.label_url } };
      }

      // Senao, tenta gerar via API
      const envioFacilApiKey = process.env.VITE_ENVIOFACIL_API_KEY || process.env.ENVIOFACIL_API_KEY;

      if (!envioFacilApiKey || !shipment.shipment_id_external) {
        return { success: false as const, error: "Etiqueta não disponível. Cadastre a chave da API Envio Fácil." };
      }

      const response = await fetch(
        `https://api.enviofacil.com.br/v1/shipments/${shipment.shipment_id_external}/label?format=pdf`,
        {
          headers: { "Authorization": `Bearer ${envioFacilApiKey}` },
        }
      );

      if (!response.ok) {
        return { success: false as const, error: "Erro ao gerar etiqueta" };
      }

      const result = await response.json();

      if (result.data?.url) {
        // Atualizar URL no banco
        await db
          .from("shipping_quotes")
          .update({ label_url: result.data.url })
          .eq("id", data.id);

        return { success: true as const, data: { url: result.data.url } };
      }

      return { success: false as const, error: "Etiqueta não disponível" };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// ATUALIZAR STATUS DO ENVIO (manual)
// =====================================================

export const updateShipmentStatus = createServerFn({ method: "PATCH" })
  .validator((d: unknown) => (d ?? {}) as { id: string; status: string })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const validStatuses = [
        "pending", "paid", "shipped", "in_transit",
        "out_for_delivery", "delivered", "exception", "cancelled"
      ];

      if (!validStatuses.includes(data.status)) {
        return { success: false as const, error: "Status inválido" };
      }

      const updateData: Record<string, any> = { status: data.status };

      if (data.status === "shipped") {
        updateData.shipped_at = new Date().toISOString();
      } else if (data.status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await db
        .from("shipping_quotes")
        .update(updateData)
        .eq("id", data.id);

      if (error) return { success: false as const, error: error.message };

      return { success: true as const, data: { id: data.id, status: data.status } };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// UTILIDADES
// =====================================================

function mapTrackingStatus(apiStatus: string): string {
  const statusMap: Record<string, string> = {
    "posted": "shipped",
    "in_transit": "in_transit",
    "out_for_delivery": "out_for_delivery",
    "delivered": "delivered",
    "exception": "exception",
    "returned": "exception",
    "canceled": "cancelled",
  };
  return statusMap[apiStatus.toLowerCase()] || "in_transit";
}

export function buildTrackingUrl(carrier: string, trackingCode: string): string {
  const cleanCode = trackingCode.replace(/\D/g, "");

  switch (carrier.toLowerCase()) {
    case "correios":
    case "ECT":
    case "Brazil Post":
      return `https://www.linkcorreto.com.br/sistemas/rastreamento/?objeto=${cleanCode}`;
    case "jadlog":
      return `https://www.jadlog.com.br/tracking/?numbers=${cleanCode}`;
    case "azul":
      return `https://www.azulcargo.com.br/rastreio?codigo=${cleanCode}`;
    case "loggi":
      return `https://app.loggi.com/rastrear?tracking=${cleanCode}`;
    default:
      return `https://www.linkcorreto.com.br/sistemas/rastreamento/?objeto=${cleanCode}`;
  }
}

// =====================================================
// TIPOS SIGEP
// =====================================================

export type SigepCredentials = {
  usuario: string;
  senha: string;
  codAdministrativo: string;
  numeroCartao: string;
  cepOrigem: string;
};

export type SigepLabel = {
  id: string;
  codigo: string;
  service: string;
  status: string;
  created_at: string;
};

// =====================================================
// VERIFICAR CONFIGURAÇÃO SIGEP
// =====================================================

export const getSigepInfo = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data, error } = await supabaseAdmin
        .from("payment_settings")
        .select("settings")
        .eq("key", "sigep_credentials")
        .single();

      if (error && error.code !== "PGRST116") {
        return { success: false, error: error.message };
      }

      const configured = !!(data?.settings?.usuario && data?.settings?.senha);

      return {
        success: true as const,
        data: {
          configured,
          lastUpdated: data?.updated_at || null,
        },
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// SALVAR CREDENCIAIS SIGEP
// =====================================================

export const saveSigepCredentials = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as SigepCredentials)
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { error } = await supabaseAdmin
        .from("payment_settings")
        .upsert({
          key: "sigep_credentials",
          settings: {
            usuario: data.usuario,
            senha: data.senha,
            codAdministrativo: data.codAdministrativo,
            numeroCartao: data.numeroCartao,
            cepOrigem: data.cepOrigem,
          },
        }, {
          onConflict: "key",
        });

      if (error) return { success: false as const, error: error.message };

      return { success: true as const };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// SOLICITAR ETIQUETAS AO SIGEP
// =====================================================

export const requestSigepLabels = createServerFn({ method: "POST" })
  .validator((d: unknown) => ({
    quantidade: (d as any)?.quantidade || 10,
    servico: (d as any)?.servico || "PAC",
  }))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Buscar credenciais
      const { data: creds, error: credsError } = await supabaseAdmin
        .from("payment_settings")
        .select("settings")
        .eq("key", "sigep_credentials")
        .single();

      if (credsError || !creds?.settings?.usuario || !creds?.settings?.senha) {
        return { success: false as const, error: "Credenciais SIGEP não configuradas" };
      }

      const credentials = creds.settings;

      // Simular geração de etiquetas (na prática, chamaria API dos Correios)
      // Por enquanto, geramos etiquetas mock locally
      const serviceCode = data.servico === "SEDEX" ? "04014" : "04510";
      const labels: SigepLabel[] = [];

      for (let i = 0; i < Math.min(data.quantidade, 100); i++) {
        const randomNum = Math.floor(Math.random() * 9000000000) + 1000000000;
        const codigo = `${serviceCode}${randomNum}`;

        labels.push({
          id: crypto.randomUUID(),
          codigo,
          service: data.servico,
          status: "available",
          created_at: new Date().toISOString(),
        });
      }

      // Salvar etiquetas no banco
      const { error: insertError } = await supabaseAdmin
        .from("shipping_tags")
        .insert(labels.map(l => ({
          tracking_code: l.codigo,
          service: l.service,
          status: l.status,
        })));

      if (insertError) {
        console.error("[SIGEP] Error saving labels:", insertError);
      }

      return {
        success: true as const,
        data: {
          requested: data.quantidade,
          generated: labels.length,
          labels,
        },
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// LISTAR ETIQUETAS DISPONÍVEIS
// =====================================================

export const listSigepLabels = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data, error } = await supabaseAdmin
        .from("shipping_tags")
        .select("*")
        .eq("status", "disponivel")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) return { success: false as const, error: error.message };

      return {
        success: true as const,
        data: data?.map(l => ({
          id: l.id,
          codigo: l.tracking_code,
          service: l.service,
          status: l.status,
          created_at: l.created_at,
        })) || [],
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// GERAR ETIQUETA A PARTIR DO PEDIDO (UI wrapper)
// =====================================================

export type GenerateLabelInput = {
  orderId: string;
  service: "PAC" | "SEDEX" | "SEDEX10";
  packageWeight: number;
  packageHeight: number;
  packageWidth: number;
  packageLength: number;
};

export const generateOrderLabel = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const z = require("zod");
    return z.object({
      orderId: z.string().uuid(),
      service: z.enum(["PAC", "SEDEX", "SEDEX10"]),
      packageWeight: z.number().positive(),
      packageHeight: z.number().positive(),
      packageWidth: z.number().positive(),
      packageLength: z.number().positive(),
    }).parse(d);
  })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Buscar pedido com endereço
      const { data: order, error: orderError } = await db
        .from("orders")
        .select("id, customer_name, customer_email, payer_phone, shipping_address, items, total")
        .eq("id", data.orderId)
        .single();

      if (orderError || !order) {
        return { success: false, error: "Pedido não encontrado" };
      }

      if (order.tracking_code) {
        return { success: false, error: "Este pedido já possui código de rastreio" };
      }

      const addr = order.shipping_address as Record<string, string> | null;
      if (!addr || !addr.zipCode) {
        return { success: false, error: "Endereço de entrega não encontrado no pedido" };
      }

      const serviceMap: Record<string, { code: string; carrier: string; price: number; days: number }> = {
        PAC: { code: "04510", carrier: "Correios", price: 0, days: 7 },
        SEDEX: { code: "04014", carrier: "Correios", price: 0, days: 3 },
        SEDEX10: { code: "40215", carrier: "Correios", price: 0, days: 1 },
      };

      const svc = serviceMap[data.service];

      // Chamar EnvioFacil se API key existir, senão simular etiqueta mock
      let trackingCode: string | null = null;
      let labelUrl: string | null = null;

      const envioFacilApiKey = process.env.VITE_ENVIOFACIL_API_KEY || process.env.ENVIOFACIL_API_KEY;

      if (envioFacilApiKey) {
        try {
          const response = await fetch("https://api.enviofacil.com.br/v1/shipments", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${envioFacilApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              service_code: svc.code,
              carrier: svc.carrier,
              from: {
                name: process.env.VITE_SENDER_NAME || "Fragranciaria",
                document: process.env.VITE_SENDER_DOCUMENT || "",
                email: "contato@fragranciaria.com",
                phone: "0000000000",
                address: {
                  street: process.env.VITE_SENDER_STREET || "Endereço",
                  number: process.env.VITE_SENDER_NUMBER || "0",
                  neighborhood: process.env.VITE_SENDER_NEIGHBORHOOD || "Centro",
                  city: process.env.VITE_SENDER_CITY || "São Paulo",
                  state: process.env.VITE_SENDER_STATE || "SP",
                  postal_code: process.env.VITE_SENDER_POSTAL_CODE || "01310100",
                },
              },
              to: {
                name: order.customer_name || "Cliente",
                document: "",
                email: order.customer_email || "",
                phone: order.payer_phone || "",
                address: {
                  street: addr.street || "",
                  number: addr.number || "",
                  complement: addr.complement || "",
                  neighborhood: addr.neighborhood || "",
                  city: addr.city || "",
                  state: addr.state || "",
                  postal_code: addr.zipCode || addr.cep || "",
                },
              },
              package: {
                weight_grams: data.packageWeight,
                height_cm: data.packageHeight,
                width_cm: data.packageWidth,
                length_cm: data.packageLength,
              },
              declared_value: order.total || 0,
              order_id: order.id,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.data) {
              trackingCode = result.data.tracking_code || null;
              labelUrl = result.data.label_url || null;
            }
          }
        } catch (apiError) {
          console.error("[generateOrderLabel] EnvioFacil API error:", apiError);
        }
      } else {
        // Modo mock: gerar código fake para desenvolvimento
        trackingCode = `PI${Math.random().toString().slice(2, 13)}BR`;
      }

      // Salvar shipping_quote
      const { data: shipment, insertError } = await db
        .from("shipping_quotes")
        .insert({
          order_id: order.id,
          carrier: svc.carrier,
          service: data.service,
          service_code: svc.code,
          price: svc.price,
          final_price: svc.price,
          estimated_days: svc.days,
          weight_grams: data.packageWeight,
          height_cm: data.packageHeight,
          width_cm: data.packageWidth,
          length_cm: data.packageLength,
          recipient_name: order.customer_name || "Cliente",
          recipient_email: order.customer_email || "",
          recipient_phone: order.payer_phone || null,
          recipient_postal_code: addr.zipCode || addr.cep || "",
          recipient_address: addr,
          status: trackingCode ? "paid" : "pending",
          tracking_code: trackingCode,
          label_url: labelUrl,
        })
        .select()
        .single();

      if (insertError) {
        return { success: false, error: "Erro ao salvar etiqueta: " + insertError.message };
      }

      // Atualizar pedido com tracking
      if (trackingCode) {
        await db
          .from("orders")
          .update({
            tracking_code: trackingCode,
            shipping_carrier: svc.carrier,
            shipping_method: `${svc.carrier} ${data.service}`,
          })
          .eq("id", order.id);
      }

      return {
        success: true,
        data: {
          id: shipment.id,
          tracking_code: trackingCode,
          label_url: labelUrl,
          status: trackingCode ? "paid" : "pending",
          service: data.service,
          carrier: svc.carrier,
        },
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false, error: "Não autorizado" };
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });
// =====================================================
// BUSCAR ETIQUETA DO PEDIDO
// =====================================================

export const getOrderShipment = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const z = require("zod");
    return z.object({ orderId: z.string().uuid() }).parse(d);
  })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data: shipment, error } = await db
        .from("shipping_quotes")
        .select("id, carrier, service, tracking_code, label_url, status, created_at")
        .eq("order_id", data.orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { success: false, error: error.message };

      return {
        success: true,
        data: shipment
          ? {
              id: shipment.id,
              carrier: shipment.carrier,
              service: shipment.service,
              trackingCode: shipment.tracking_code,
              labelUrl: shipment.label_url,
              status: shipment.status,
              createdAt: shipment.created_at,
            }
          : null,
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false, error: "Nao autorizado" };
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });
