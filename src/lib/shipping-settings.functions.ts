import { createServerFn } from "@tanstack/react-start";

// =====================================================
// TIPOS
// =====================================================

export type ShippingSettings = {
  freeShippingThreshold: number;
  freeShippingEnabled: boolean;
  handlingDays: { min: number; max: number };
  senderInfo: {
    name: string;
    document: string;
    phone: string;
    email: string;
    address: {
      street: string;
      number: string;
      complement: string;
      neighborhood: string;
      city: string;
      state: string;
      postal_code: string;
    };
  };
  apiConfig: {
    envioFacilApiKey: string;
    envioFacilEnabled: boolean;
    useFallback: boolean;
  };
  carriers: Array<{
    id: string;
    name: string;
    code: string;
    enabled: boolean;
    services: string[];
  }>;
};

export type UpdateSettingInput = {
  key: string;
  value: unknown;
};

// =====================================================
// OBTER CONFIGURACOES DE FRETE
// =====================================================

export const getShippingSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data, error } = await db
        .from("shipping_settings")
        .select("key, value");

      if (error) return { success: false as const, error: error.message };

      // Montar objeto de configuracoes
      const settings: ShippingSettings = {
        freeShippingThreshold: 19900, // em centavos
        freeShippingEnabled: true,
        handlingDays: { min: 1, max: 3 },
        senderInfo: {
          name: "Fragranciaria",
          document: "",
          phone: "",
          email: "contato@fragranciaria.com",
          address: {
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: "",
            postal_code: "01310100",
          },
        },
        apiConfig: {
          envioFacilApiKey: "",
          envioFacilEnabled: false,
          useFallback: true,
        },
        carriers: [
          { id: "correios", name: "Correios", code: "correios", enabled: true, services: ["PAC", "SEDEX", "SEDEX10"] },
          { id: "jadlog", name: "Jadlog", code: "jadlog", enabled: false, services: ["Expresso", "Economico"] },
          { id: "azul", name: "Azul Cargo", code: "azul", enabled: false, services: ["Azul"] },
          { id: "loggi", name: "Loggi", code: "loggi", enabled: false, services: ["Economico"] },
        ],
      };

      // Preencher com dados do banco
      for (const row of data || []) {
        const key = row.key as string;
        const value = row.value;

        switch (key) {
          case "free_shipping_threshold":
            settings.freeShippingThreshold = value?.value ?? 19900;
            settings.freeShippingEnabled = value?.enabled ?? true;
            break;
          case "default_handling_days":
            settings.handlingDays = value ?? { min: 1, max: 3 };
            break;
          case "sender_info":
            settings.senderInfo = value ?? settings.senderInfo;
            break;
          case "api_config":
            settings.apiConfig = {
              envioFacilApiKey: value?.enviofacil_api_key ?? "",
              envioFacilEnabled: value?.enviofacil_enabled ?? false,
              useFallback: value?.use_fallback ?? true,
            };
            break;
          case "carriers":
            settings.carriers = value ?? settings.carriers;
            break;
        }
      }

      return { success: true as const, data: settings };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// ATUALIZAR CONFIGURACAO
// =====================================================

export const updateShippingSetting = createServerFn({ method: "PATCH" })
  .validator((d: unknown) => d as UpdateSettingInput)
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Validar chave
      const validKeys = [
        "free_shipping_threshold",
        "default_handling_days",
        "sender_info",
        "api_config",
        "carriers",
      ];

      if (!validKeys.includes(data.key)) {
        return { success: false as const, error: "Chave de configuração inválida" };
      }

      // Converter camelCase para snake_case se necessario
      let dbKey = data.key;
      let dbValue = data.value;

      // Normalizar valor para o formato do banco
      if (data.key === "apiConfig") {
        dbKey = "api_config";
        dbValue = {
          enviofacil_api_key: (data.value as any)?.envioFacilApiKey ?? "",
          enviofacil_enabled: (data.value as any)?.envioFacilEnabled ?? false,
          use_fallback: (data.value as any)?.useFallback ?? true,
        };
      } else if (data.key === "senderInfo") {
        dbKey = "sender_info";
        const si = data.value as any;
        dbValue = {
          name: si?.name ?? "",
          document: si?.document ?? "",
          phone: si?.phone ?? "",
          email: si?.email ?? "",
          address: si?.address ?? {},
        };
      } else if (data.key === "freeShippingThreshold") {
        dbKey = "free_shipping_threshold";
        dbValue = {
          value: (data.value as any)?.value ?? 19900,
          enabled: (data.value as any)?.enabled ?? true,
        };
      } else if (data.key === "handlingDays") {
        dbKey = "default_handling_days";
        dbValue = (data.value as any) ?? { min: 1, max: 3 };
      } else if (data.key === "carriers") {
        dbKey = "carriers";
        dbValue = (data.value as any) ?? [];
      }

      const { error } = await db
        .from("shipping_settings")
        .upsert({
          key: dbKey,
          value: dbValue,
          updated_at: new Date().toISOString(),
        });

      if (error) return { success: false as const, error: error.message };

      return { success: true as const, data: { key: data.key } };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// OBTER CONFIGURACOES PUBLICAS (sem dados sensiveis)
// =====================================================

export const getPublicShippingConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data, error } = await db
        .from("shipping_settings")
        .select("key, value");

      if (error) return { success: false as const, error: error.message };

      // Retornar apenas configuracoes publicas
      const publicConfig = {
        freeShippingThreshold: 19900,
        freeShippingEnabled: true,
        handlingDays: { min: 1, max: 3 },
        carriers: [] as any[],
      };

      for (const row of data || []) {
        if (row.key === "free_shipping_threshold") {
          publicConfig.freeShippingThreshold = row.value?.value ?? 19900;
          publicConfig.freeShippingEnabled = row.value?.enabled ?? true;
        } else if (row.key === "default_handling_days") {
          publicConfig.handlingDays = row.value ?? { min: 1, max: 3 };
        } else if (row.key === "carriers") {
          // Filtrar apenas transportadoras habilitadas
          publicConfig.carriers = (row.value || []).filter((c: any) => c.enabled);
        }
      }

      return { success: true as const, data: publicConfig };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });