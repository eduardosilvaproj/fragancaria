/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NF-e (Nota Fiscal Eletrônica) Integration — notaas.com.br
 *
 * Provider: notaas (REST API, assinatura + transmissão SEFAZ gerenciadas).
 * Regime tributário: Regime Normal (CST, não CSOSN).
 *
 * Fluxo:
 *   1. Admin clica "Emitir NF-e" no pedido.
 *   2. Server fn monta o payload JSON e POST /nfe/emitir (assíncrono).
 *   3. Polling GET /nfe/invoices/{id}/status até "issued" ou "error".
 *   4. Salva chave/número/status/URLs no pedido.
 *
 * Prerequisites:
 *   - NOTAAS_API_KEY no Railway (formato ntaas_...)
 *   - nfe_settings configurado (CNPJ, IE, endereço do emitente)
 *   - Migration 20260714_nfe_notaas.sql aplicada (colunas nfe_* em orders)
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

const NOTAAS_BASE = "https://platform.notaas.com.br/api/v1";

// =====================================================
// TIPOS
// =====================================================

export type NfeSettings = {
  id: string;
  cnpj: string;
  inscricao_estadual: string;
  inscricao_municipal?: string;
  razao_social: string;
  nome_fantasia?: string;
  endereco: NfeEndereco;
  ambiente_sefaz: "homologacao" | "producao";
  estado_uf: string;
  nfe_serie: number;
  modalidade_frete?: number;
  crt?: number;
  webservice_url?: string;
  certificado_path?: string;
  // IBS/CBS (Reforma Tributária — NT 2025.002-RTC). Preenchidos pela contadora.
  cst_ibscbs_padrao?: string;
  cclasstrib_padrao?: string;
  aliquota_ibs_estadual?: number;
  aliquota_ibs_municipal?: number;
  aliquota_cbs?: number;
  codigo_beneficio_fiscal_padrao?: string;
};

export type NfeEndereco = {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pais?: string;
  telefone?: string;
};

export type NfeResult = {
  success: boolean;
  data?: {
    nfeKey: string;
    nfeNumber: number;
    nfeSeries: number;
    nfeStatus: string;
    protocol?: string;
    pdfUrl?: string;
    xmlUrl?: string;
  };
  error?: string;
};

// =====================================================
// UTILIDADES
// =====================================================

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "").padStart(14, "0");
}

function formatCEP(cep: string): string {
  return cep.replace(/\D/g, "").padStart(8, "0");
}

// Código IBGE de cidade — usado tanto para emitente quanto destinatário.
// Idealmente viria de uma tabela de cidades; por enquanto lookup por cidade.
const CITY_CODES: Record<string, number> = {
  "São Paulo": 3550308,
  "São Paulo, SP": 3550308,
  "Rio de Janeiro": 3304557,
  "Rio de Janeiro, RJ": 3304557,
  "Belo Horizonte": 3106200,
  "Belo Horizonte, MG": 3106200,
  Campinas: 3509502,
  Guarulhos: 3518800,
  "São Bernardo do Campo": 3548702,
  "Santo André": 3547803,
  Osasco: 3534401,
  "Ribeirão Preto": 3541402,
  Araraquara: 3503208,
  "Araraquara, SP": 3503208,
};

function getCityCode(city: string): number {
  return CITY_CODES[city] || 3550308; // default SP
}

// Código de pagamento para a notaas (tabela 4.4.7 do Manual NF-e).
function paymentType(method: string): string {
  const map: Record<string, string> = {
    pix: "17",
    credit_card: "03",
    debit_card: "04",
    boleto: "15",
  };
  return map[method?.toLowerCase()] || "99";
}

// =====================================================
// RATEIO DE DESCONTO POR ITEM
// =====================================================

/**
 * Distribui o desconto total do pedido proporcionalmente entre os itens.
 * O último item absorve qualquer centavo residual de arredondamento,
 * garantindo que a soma dos descontos rateados seja EXATAMENTE igual
 * ao desconto do pedido (evita rejeição da SEFAZ por divergência de R$ 0,01).
 *
 * Exportado para permitir testes unitários isolados.
 */
export function distributeDiscount<T extends { valorTotal: number }>(
  items: readonly T[],
  discount: number,
): Array<T & { desconto?: number }> {
  if (discount <= 0 || items.length === 0) return items as Array<T & { desconto?: number }>;

  const totalProd = items.reduce((s, i) => s + i.valorTotal, 0);
  if (totalProd <= 0) return items as Array<T & { desconto?: number }>;

  let allocatedDiscount = 0;
  return items.map((item, idx) => {
    let itemDiscount = 0;
    if (idx === items.length - 1) {
      // Último item absorve o resíduo: garante soma EXATA
      itemDiscount = Number((discount - allocatedDiscount).toFixed(2));
    } else {
      itemDiscount = Number(((item.valorTotal / totalProd) * discount).toFixed(2));
      allocatedDiscount += itemDiscount;
    }
    return {
      ...item,
      ...(itemDiscount > 0 ? { desconto: itemDiscount } : {}),
    };
  });
}

// =====================================================
// OBTER CONFIGURAÇÕES NF-E
// =====================================================

export const getNfeSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    { success: true; data: NfeSettings | null } | { success: false; error: string }
  > => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data, error } = await (supabaseAdmin as any)
        .from("nfe_settings")
        .select("*")
        .eq("id", "main")
        .single();

      if (error && error.code !== "PGRST116") {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data
          ? {
              id: (data as any).id,
              cnpj: (data as any).cnpj || "",
              inscricao_estadual: (data as any).inscricao_estadual || "",
              inscricao_municipal: (data as any).inscricao_municipal,
              razao_social: (data as any).razao_social || "",
              nome_fantasia: (data as any).nome_fantasia,
              endereco: ((data as any).endereco as NfeEndereco) || {
                logradouro: "",
                numero: "",
                bairro: "",
                cidade: "",
                uf: "",
                cep: "",
              },
              ambiente_sefaz: (data as any).ambiente_sefaz || "homologacao",
              estado_uf: (data as any).estado_uf || "",
              nfe_serie: (data as any).nfe_serie || 1,
              modalidade_frete: (data as any).modalidade_frete ?? undefined,
              crt: (data as any).crt ?? undefined,
              webservice_url: (data as any).webservice_url ?? undefined,
              certificado_path: (data as any).certificado_path ?? undefined,
              cst_ibscbs_padrao: (data as any).cst_ibscbs_padrao ?? undefined,
              cclasstrib_padrao: (data as any).cclasstrib_padrao ?? undefined,
              aliquota_ibs_estadual: (data as any).aliquota_ibs_estadual != null ? Number((data as any).aliquota_ibs_estadual) : undefined,
              aliquota_ibs_municipal: (data as any).aliquota_ibs_municipal != null ? Number((data as any).aliquota_ibs_municipal) : undefined,
              aliquota_cbs: (data as any).aliquota_cbs != null ? Number((data as any).aliquota_cbs) : undefined,
              codigo_beneficio_fiscal_padrao: (data as any).codigo_beneficio_fiscal_padrao ?? undefined,
            }
          : null,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  },
);

// =====================================================
// SALVAR CONFIGURAÇÕES NF-E
// =====================================================

export const saveNfeSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z
      .object({
        cnpj: z.string().min(14).max(18),
        inscricao_estadual: z.string().min(1).max(15),
        inscricao_municipal: z.string().optional(),
        razao_social: z.string().min(1).max(120),
        nome_fantasia: z.string().max(60).optional(),
        endereco: z.object({
          logradouro: z.string().max(60),
          numero: z.string().max(60),
          complemento: z.string().max(60).optional(),
          bairro: z.string().max(60),
          cidade: z.string().max(60),
          uf: z.string().length(2),
          cep: z.string().min(8).max(9),
          pais: z.string().max(60).optional(),
          telefone: z.string().max(14).optional(),
        }),
        ambiente_sefaz: z.enum(["homologacao", "producao"]).default("homologacao"),
        estado_uf: z.string().length(2),
        nfe_serie: z.number().int().positive().default(1),
        modalidade_frete: z.number().int().nullable().optional(),
        crt: z.number().int().nullable().optional(),
        webservice_url: z.string().optional(),
        certificado_path: z.string().optional(),
        cst_ibscbs_padrao: z.string().max(3).optional().nullable(),
        cclasstrib_padrao: z.string().max(6).optional().nullable(),
        aliquota_ibs_estadual: z.number().nonnegative().optional().nullable(),
        aliquota_ibs_municipal: z.number().nonnegative().optional().nullable(),
        aliquota_cbs: z.number().nonnegative().optional().nullable(),
        codigo_beneficio_fiscal_padrao: z.string().max(15).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAdminAction, redactedFieldDiff } = await import("@/lib/admin-audit");

      const { data: before, error: beforeErr } = await (supabaseAdmin as any)
        .from("nfe_settings")
        .select("*")
        .eq("id", "main")
        .maybeSingle();
      if (beforeErr) {
        console.warn("[saveNfeSettings] falha ao ler before para auditoria", beforeErr.message);
      }

      const { error } = await (supabaseAdmin as any).from("nfe_settings").upsert(
        {
          id: "main",
          cnpj: data.cnpj,
          inscricao_estadual: data.inscricao_estadual,
          inscricao_municipal: data.inscricao_municipal || null,
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia || null,
          endereco: data.endereco,
          ambiente_sefaz: data.ambiente_sefaz,
          estado_uf: data.estado_uf,
          nfe_serie: data.nfe_serie || 15,
          modalidade_frete: data.modalidade_frete ?? null,
          crt: data.crt ?? null,
          webservice_url: data.webservice_url || null,
          certificado_path: data.certificado_path || null,
          cst_ibscbs_padrao: data.cst_ibscbs_padrao || null,
          cclasstrib_padrao: data.cclasstrib_padrao || null,
          aliquota_ibs_estadual: data.aliquota_ibs_estadual ?? null,
          aliquota_ibs_municipal: data.aliquota_ibs_municipal ?? null,
          aliquota_cbs: data.aliquota_cbs ?? null,
          codigo_beneficio_fiscal_padrao: data.codigo_beneficio_fiscal_padrao || null,
        },
        { onConflict: "id" },
      );

      if (error) return { success: false, error: error.message };

      if (before) {
        const afterRow = {
          cnpj: data.cnpj,
          inscricao_estadual: data.inscricao_estadual,
          inscricao_municipal: data.inscricao_municipal || null,
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia || null,
          endereco: data.endereco,
          ambiente_sefaz: data.ambiente_sefaz,
          estado_uf: data.estado_uf,
          nfe_serie: data.nfe_serie || 15,
        };
        const diff = redactedFieldDiff(
          before as Record<string, unknown>,
          afterRow as unknown as Record<string, unknown>,
        );
        if (diff) {
          logAdminAction(
            admin,
            "nfe_settings.update",
            "nfe_settings",
            "main",
            diff as unknown as Json,
            null,
          );
        }
      }

      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  });

// =====================================================
// EMITIR NF-E VIA NOTAAS
// =====================================================

export const getNfePreview = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ orderId: z.string().uuid(), tipoOperacao: z.enum(["venda", "devolucao"]) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      const { data: settingsRaw, error: settingsError } = await db
        .from("nfe_settings")
        .select("*")
        .eq("id", "main")
        .single();

      if (settingsError || !settingsRaw) {
        return { success: false, error: "Configurações NF-e não encontradas." };
      }

      const settings = {
        cnpj: settingsRaw.cnpj,
        inscricao_estadual: settingsRaw.inscricao_estadual,
        inscricao_municipal: settingsRaw.inscricao_municipal,
        razao_social: settingsRaw.razao_social,
        nome_fantasia: settingsRaw.nome_fantasia,
        endereco: (settingsRaw.endereco as NfeEndereco) || { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" },
        ambiente_sefaz: settingsRaw.ambiente_sefaz || "homologacao",
        estado_uf: settingsRaw.estado_uf,
        nfe_serie: settingsRaw.nfe_serie || 1,
        modalidade_frete: settingsRaw.modalidade_frete ?? 0,
        crt: settingsRaw.crt ?? 3,
      };

      const { data: order, error: orderError } = await db
        .from("orders")
        .select("*, items, shipping_address")
        .eq("id", data.orderId)
        .single();

      if (orderError || !order) {
        return { success: false, error: "Pedido não encontrado" };
      }

      const items = (order.items as Array<Record<string, unknown>>) || [];
      if (items.length === 0) {
        return { success: false, error: "Pedido sem itens para faturar" };
      }

      const emitAddr = settings.endereco;
      const shippingAddr = order.shipping_address as Record<string, string> | null;
      const destDoc = order.customer_cpf || order.customer_document || "";
      const destDocClean = destDoc.replace(/\D/g, "");
      const isCPF = destDocClean.length <= 11;
      const isCNPJ = !isCPF && destDocClean.length > 0;
      const destName = String(order.customer_name || "Consumidor");
      const destUf = String(shippingAddr?.state || settings.estado_uf || "").toUpperCase();
      const emitUf = String(settings.estado_uf || "SP").toUpperCase();
      const isWithinState = destUf === emitUf;
      const tipoOperacao = data.tipoOperacao;
      if (tipoOperacao !== "venda" && tipoOperacao !== "devolucao") {
        return { success: false, error: "tipoOperacao é obrigatório e deve ser 'venda' ou 'devolucao'." };
      }
      const isDevolucao = tipoOperacao === "devolucao";

      const resolveAliquotaIcms = (item: Record<string, unknown>): number => {
        const prodAliq = Number(item.aliquota_icms) || 0;
        if (isDevolucao || isWithinState || isCPF) {
          return prodAliq;
        }
        const origemNum = Number(item.origem ?? 0);
        if ([1, 2, 6, 7].includes(origemNum)) {
          return 4;
        }
        const sulSudesteExcetoEs = ["PR", "SC", "RS", "RJ", "MG"];
        if (sulSudesteExcetoEs.includes(destUf)) {
          return 12;
        }
        return 7;
      };

      const resolveCfop = (item: Record<string, unknown>): string | undefined => {
        if (isDevolucao) {
          return isWithinState ? "1202" : "2202";
        }
        const source = isWithinState
          ? item.cfop_venda_pj_dentro
          : isCPF
            ? item.cfop_venda_pf_fora
            : item.cfop_venda_pj_fora;
        const v = source == null ? "" : String(source).trim();
        return v || undefined;
      };

      const previewItems = items.map((item: any, idx: number) => {
        const itemName = String(item.title || item.name || `Item #${idx + 1}`);
        const cfop = resolveCfop(item);
        if (!cfop) {
          throw new Error(`CFOP não configurado para este cenário — pendente de definição fiscal (Item: "${itemName}").`);
        }
        return {
          id: item.id || item.product_id || `item-${idx}`,
          descricao: itemName,
          ncm: item.ncm || "",
          cfop,
          quantidade: Number(item.quantity) || 1,
          valorUnitario: Number(item.price) || 0,
          valorTotal: (Number(item.quantity) || 1) * (Number(item.price) || 0),
          unidade: item.unidade || "UN",
          cst: item.cst_icms || item.csosn || "",
          origem: item.origem !== undefined && item.origem !== null ? Number(item.origem) : 0,
          aliquotaIcms: resolveAliquotaIcms(item),
          aliquotaPis: Number(item.aliquota_pis) || 0,
          aliquotaCofins: Number(item.aliquota_cofins) || 0,
          cest: item.cest || "",
          cstIbscbs: item.cst_ibscbs || "",
          cClassTrib: item.cclasstrib || "",
          aliquotaIbsEstadual: Number(item.aliquota_ibs_estadual) || 0,
          aliquotaIbsMunicipal: Number(item.aliquota_ibs_municipal) || 0,
          aliquotaCbs: Number(item.aliquota_cbs) || 0,
          codigoBeneficioFiscal: item.codigo_beneficio_fiscal || "",
        };
      });

      return {
        success: true,
        data: {
          orderId: order.id,
          tipoOperacao,
          isCNPJ,
          destName,
          destDoc: destDocClean,
          destUf,
          emitUf,
          items: previewItems,
          shippingPrice: Number(order.shipping_price) || 0,
          discount: Number(order.discount) || 0,
          indicadorIE: isCNPJ ? 1 : 9,
          consumidorFinal: isCNPJ ? 0 : 1,
        },
      };
    } catch (e: any) {
      return { success: false, error: e?.message || "Erro ao gerar prévia fiscal" };
    }
  });

export const emitNFe = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({ orderId: z.string().uuid(), tipoOperacao: z.enum(["venda", "devolucao"]), itensEditados: z.array(z.any()).optional(), reducaoBaseIcms: z.number().optional(), indicadorIE: z.number().optional(), consumidorFinal: z.number().optional() }).parse(d))
  .handler(async ({ data }): Promise<NfeResult> => {
    const tipoOperacao = data.tipoOperacao;
    if (tipoOperacao !== "venda" && tipoOperacao !== "devolucao") {
      return { success: false, error: "tipoOperacao é obrigatório e deve ser 'venda' ou 'devolucao'." };
    }
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as any;

      const apiKey = process.env.NOTAAS_API_KEY;
      if (!apiKey) {
        return { success: false, error: "NOTAAS_API_KEY não configurada no servidor." };
      }

      // 1. Load settings
      const { data: settingsRaw, error: settingsError } = await db
        .from("nfe_settings")
        .select("*")
        .eq("id", "main")
        .single();

      if (settingsError || !settingsRaw) {
        return {
          success: false,
          error: "Configurações NF-e não encontradas. Configure em Configurações.",
        };
      }

      const settings: NfeSettings = {
        id: settingsRaw.id,
        cnpj: settingsRaw.cnpj,
        inscricao_estadual: settingsRaw.inscricao_estadual,
        inscricao_municipal: settingsRaw.inscricao_municipal,
        razao_social: settingsRaw.razao_social,
        nome_fantasia: settingsRaw.nome_fantasia,
        endereco: (settingsRaw.endereco as NfeEndereco) || {
          logradouro: "",
          numero: "",
          bairro: "",
          cidade: "",
          uf: "",
          cep: "",
        },
        ambiente_sefaz: settingsRaw.ambiente_sefaz || "homologacao",
        estado_uf: settingsRaw.estado_uf,
        nfe_serie: settingsRaw.nfe_serie || 1,
        modalidade_frete: settingsRaw.modalidade_frete ?? undefined,
        crt: settingsRaw.crt ?? undefined,
      };

      if (!settings.cnpj || !settings.inscricao_estadual || !settings.razao_social) {
        return {
          success: false,
          error: "Dados do emitente incompletos. Configure CNPJ, IE e Razão Social.",
        };
      }

      // 2. Load order
      const { data: order, error: orderError } = await (db as any)
        .from("orders")
        .select("*, items, shipping_address")
        .eq("id", data.orderId)
        .single();

      if (orderError || !order) {
        return { success: false, error: "Pedido não encontrado" };
      }

      if ((order as any).nfe_key) {
        return {
          success: false,
          error: `NF-e já emitida para este pedido. Chave: ${(order as any).nfe_key}`,
        };
      }

      if (!["approved", "paid", "processing", "shipped"].includes(order.status)) {
        return { success: false, error: "Pedido precisa estar pago para emitir NF-e" };
      }

      const items = (order.items as Array<Record<string, unknown>>) || [];
      if (items.length === 0) {
        return { success: false, error: "Pedido sem itens para faturar" };
      }

      // 3. Monta payload para a notaas
      const emitAddr = settings.endereco;
      const shippingAddr = order.shipping_address as Record<string, string> | null;
      const destDoc = order.customer_cpf || order.customer_document || "";
      const destDocClean = destDoc.replace(/\D/g, "");
      const isCPF = destDocClean.length <= 11;
      const isCNPJ = !isCPF && destDocClean.length > 0;
      const destName = String(order.customer_name || "Consumidor");
      const destUf = String(shippingAddr?.state || settings.estado_uf || "").toUpperCase();
      const emitUf = String(settings.estado_uf || "SP").toUpperCase();
      const isWithinState = destUf === emitUf;
      const isDevolucao = (tipoOperacao as "venda" | "devolucao") === "devolucao";

      // CFOP é resolvido pela combinação operação × tipo de destinatário × UF,
      // usando as 8 colunas contextuais gravadas no snapshot do item.
      const resolveCfop = (item: Record<string, unknown>): string | undefined => {
        if (isDevolucao) {
          return isWithinState ? "1202" : "2202";
        }
        const source = isWithinState
          ? item.cfop_venda_pj_dentro
          : isCPF
            ? item.cfop_venda_pf_fora
            : item.cfop_venda_pj_fora;
        const v = source == null ? "" : String(source).trim();
        return v || undefined;
      };

      const resolveAliquotaIcms = (item: Record<string, unknown>): number => {
        const prodAliq = Number(item.aliquota_icms) || 0;
        if (isDevolucao || isWithinState || isCPF) {
          return prodAliq;
        }
        const origemNum = Number(item.origem ?? 0);
        if ([1, 2, 6, 7].includes(origemNum)) {
          return 4;
        }
        const sulSudesteExcetoEs = ["PR", "SC", "RS", "RJ", "MG"];
        if (sulSudesteExcetoEs.includes(destUf)) {
          return 12;
        }
        return 7;
      };

      // Se houver itens editados no modal, usa eles; caso contrário, usa o snapshot padrão.
      const sourceItems = Array.isArray(data.itensEditados) && data.itensEditados.length > 0 ? data.itensEditados : items;

      // TODO: Guardamos a redução de base do ICMS informada pelo usuário, mas não enviamos para
      // a notaas ainda pois a especificação do campo pRedBC/redução na API da notaas está pendente de suporte.
      const reducaoBaseIcms = data.reducaoBaseIcms;
      if (reducaoBaseIcms !== undefined && reducaoBaseIcms !== null) {
        console.log("[nfe] Redução de base de ICMS informada no modal:", reducaoBaseIcms);
      }

      const notaasItemsOrErrors = sourceItems.map((item: any, idx: number) => {
        const qtd = Number(item.quantidade ?? item.quantity) || 1;
        const vUn = Number(item.valorUnitario ?? item.price) || 0;
        const vTotal = qtd * vUn;
        const rawId = String(item.id || item.product_id || "");
        const prodId = rawId.split("::")[0];

        const ncm = item.ncm;
        const cfop = item.cfop || resolveCfop(item);
        const isSimples = Number(settings.crt) === 1;
        const cstVal = item.cst || (isSimples ? item.csosn : item.cst_icms);
        const cest = item.cest;
        const origem = item.origem;
        const unidade = item.unidade;
        const cstPis = item.cst_pis_cofins || "01";
        const rawIcms = item.aliquotaIcms ?? resolveAliquotaIcms(item);
        const rawPis = item.aliquotaPis ?? item.aliquota_pis;
        const rawCofins = item.aliquotaCofins ?? item.aliquota_cofins;
        const itemName = String(item.descricao || item.title || item.name || `Item #${idx + 1}`);
        if (!ncm) {
          return {
            success: false,
            error: `NCM não configurado para o item "${itemName}".`,
          };
        }
        if (!cfop) {
          return {
            success: false,
            error: `CFOP contextual não configurado para o item "${itemName}".`,
          };
        }
        if (!cstVal) {
          return {
            success: false,
            error: `${isSimples ? "CSOSN" : "CST ICMS"} não configurado para o item "${itemName}".`,
          };
        }
        if (origem === undefined || origem === null || origem === "" || isNaN(Number(origem))) {
          return {
            success: false,
            error: `Origem da mercadoria não configurada para o item "${itemName}".`,
          };
        }
        if (!unidade) {
          return {
            success: false,
            error: `Unidade não configurada para o item "${itemName}".`,
          };
        }
        if (!cstPis) {
          return {
            success: false,
            error: `CST PIS/COFINS não configurado para o item "${itemName}".`,
          };
        }
        if (rawIcms === undefined || rawIcms === null || rawIcms === "" || isNaN(Number(rawIcms)) || Number(rawIcms) < 0) {
          return { success: false, error: `Alíquota ICMS inválida ou ausente para o item "${itemName}".` };
        }
        if (rawPis === undefined || rawPis === null || rawPis === "" || isNaN(Number(rawPis)) || Number(rawPis) < 0) {
          return { success: false, error: `Alíquota PIS inválida ou ausente para o item "${itemName}".` };
        }
        if (rawCofins === undefined || rawCofins === null || rawCofins === "" || isNaN(Number(rawCofins)) || Number(rawCofins) < 0) {
          return { success: false, error: `Alíquota COFINS inválida ou ausente para o item "${itemName}".` };
        }

        const aliquotaIcms = Number(rawIcms);
        const aliquotaPis = Number(rawPis);
        const aliquotaCofins = Number(rawCofins);

        const cstIbscbs = item.cstIbscbs ?? item.cst_ibscbs;
        const cClassTrib = item.cClassTrib ?? item.cclasstrib;
        const rawIbsEst = item.aliquotaIbsEstadual ?? item.aliquota_ibs_estadual;
        const rawIbsMun = item.aliquotaIbsMunicipal ?? item.aliquota_ibs_municipal;
        const rawCbs = item.aliquotaCbs ?? item.aliquota_cbs;
        const cBenef = item.codigoBeneficioFiscal ?? item.codigo_beneficio_fiscal;

        // VALIDAÇÃO OBRIGATÓRIA DE IBS/CBS PARA REGIME NORMAL (Vigente desde 03/08/2026)
        if (!cstIbscbs) {
          return { success: false, error: `CST IBS/CBS obrigatório e ausente no item "${itemName}".` };
        }
        if (!/^\d{3}$/.test(String(cstIbscbs).trim())) {
          return { success: false, error: `CST IBS/CBS do item "${itemName}" deve ter exatamente 3 dígitos numéricos (ex: 000).` };
        }
        if (!cClassTrib) {
          return { success: false, error: `Código de Enquadramento IBS/CBS obrigatório e ausente no item "${itemName}".` };
        }
        if (!/^\d{6}$/.test(String(cClassTrib).trim())) {
          return { success: false, error: `Código de Enquadramento do item "${itemName}" deve ter exatamente 6 dígitos numéricos (ex: 000001).` };
        }
        if (rawIbsEst === undefined || rawIbsEst === null || isNaN(Number(rawIbsEst))) {
          return { success: false, error: `Alíquota IBS Estadual obrigatória e ausente no item "${itemName}".` };
        }
        if (rawCbs === undefined || rawCbs === null || isNaN(Number(rawCbs))) {
          return { success: false, error: `Alíquota CBS obrigatória e ausente no item "${itemName}".` };
        }

        let ibscbsObj: Record<string, unknown> | undefined = {
          cst: String(cstIbscbs).trim(),
          cClassTrib: String(cClassTrib).trim(),
          aliquotaIbsEstadual: Number(rawIbsEst),
          aliquotaIbsMunicipal: rawIbsMun !== undefined && rawIbsMun !== null ? Number(rawIbsMun) : 0,
          aliquotaCbs: Number(rawCbs),
        };

        return {
          descricao: itemName,
          ncm,
          cfop,
          quantidade: qtd,
          valorUnitario: vUn,
          valorTotal: vTotal,
          unidade,
          codigo: String(prodId || `PRD${idx + 1}`).slice(0, 9),
          ...(isSimples ? { csosn: cstVal } : { cst: cstVal }),
          ...(cest ? { cest } : {}),
          origem: Number(origem),
          aliquotaIcms,
          aliquotaPis,
          aliquotaCofins,
          cstPis,
          ...(cBenef ? { codigoBeneficioFiscal: String(cBenef) } : {}),
          ...(ibscbsObj ? { ibscbs: ibscbsObj } : {}),
        };
      });

      if (!order.shipping_ibge_code) {
        return {
          success: false,
          error: `Código IBGE do município não encontrado para o pedido ${order.id}. Execute o backfill de IBGE ou preencha o endereço.`,
        };
      }

      // Separa itens válidos de erros de validação
      const itemError = notaasItemsOrErrors.find((i: any) => i && !("descricao" in i));
      if (itemError) return itemError as NfeResult;

      const baseItems = notaasItemsOrErrors as Array<{
        descricao: string;
        valorTotal: number;
        [k: string]: unknown;
      }>;

      const totalProd = baseItems.reduce((s, i) => s + i.valorTotal, 0);
      const shippingPrice = Number(order.shipping_price) || 0;
      const discount = Number(order.discount) || 0;
      const totalNf = Number((totalProd + shippingPrice - discount).toFixed(2));

      // Desconto (cupom) é declarado por item na notaas (items[].desconto —
      // não existe desconto na raiz). Utiliza distributeDiscount para rateio
      // proporcional com ajuste de resíduo de centavos no último item.
      const notaasItemsFinal = distributeDiscount(baseItems, discount);

      if (
        settings.modalidade_frete === null ||
        isNaN(Number(settings.modalidade_frete))
      ) {
        return {
          success: false,
          error: "Modalidade de frete não configurada em Configurações > NF-e.",
        };
      }

      // Nota: Regra assume que todo CNPJ compra para revenda (consumidorFinal = 0, indicadorIE = 1).
      // Caso um CNPJ compre para uso/consumo interno, o operador pode corrigir manualmente no modal.
      const defaultConsumidorFinal = isCNPJ ? 0 : 1;
      const defaultIndicadorIE = isCNPJ ? 1 : 9;

      const consumidorFinal = data.consumidorFinal !== undefined && data.consumidorFinal !== null ? Number(data.consumidorFinal) : defaultConsumidorFinal;
      const indicadorIE = data.indicadorIE !== undefined && data.indicadorIE !== null ? Number(data.indicadorIE) : defaultIndicadorIE;

      const payload: Record<string, unknown> = {
        modelo: 55,
        naturezaOperacao: "Venda de mercadoria",
        destinoOperacao: 1,
        tipoOperacao: 1,
        finalidade: 1,
        consumidorFinal,
        presencaComprador: 2,
        indicadorIntermediador: 0,
        tipoEmissao: 1,
        valorFrete: shippingPrice,
        emit: {
          cnpj: formatCNPJ(settings.cnpj),
          inscricaoEstadual: settings.inscricao_estadual,
          inscricaoMunicipal: settings.inscricao_municipal || undefined,
          razaoSocial: settings.razao_social,
          nomeFantasia: settings.nome_fantasia || undefined,
          endereco: {
            logradouro: emitAddr.logradouro,
            numero: emitAddr.numero,
            complemento: emitAddr.complemento || undefined,
            bairro: emitAddr.bairro,
            codigoMunicipio: getCityCode(emitAddr.cidade),
            cidade: emitAddr.cidade,
            uf: emitAddr.uf,
            cep: formatCEP(emitAddr.cep),
            pais: emitAddr.pais || "BR",
            telefone: emitAddr.telefone || undefined,
          },
        },
        dest: {
          ...(isCPF ? { cpf: destDocClean.padStart(11, "0") } : { cnpj: formatCNPJ(destDocClean) }),
          nome: destName,
          indicadorIE,
          endereco: {
            logradouro: shippingAddr?.street || "",
            numero: shippingAddr?.number || "SN",
            bairro: shippingAddr?.neighborhood || "",
            codigoMunicipio: Number(order.shipping_ibge_code),
            cidade: shippingAddr?.city || "",
            uf: shippingAddr?.state || settings.estado_uf,
            cep: formatCEP(shippingAddr?.zipCode || shippingAddr?.cep || ""),
          },
        },
        items: notaasItemsFinal,
        pagamentos: [{ tipoPagamento: paymentType(order.payment_method), valor: totalNf }],
        transporte: {
          modalidadeFrete: Number(settings.modalidade_frete),
        },
        ...(settings.crt !== undefined && settings.crt !== null ? { crt: settings.crt } : {}),
        infCpl: `Pedido Fragranciaria #${String(order.id).slice(0, 8).toUpperCase()}`,
      };

      // 4. Envia para a notaas (POST /nfe/emitir — assíncrono)
      const headers: Record<string, string> = {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": data.orderId,
      };

      const emitRes = await fetch(`${NOTAAS_BASE}/nfe/emitir`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!emitRes.ok) {
        const errBody = await emitRes.text().catch(() => "");
        return {
          success: false,
          error: `notaas rejeitou (${emitRes.status}): ${errBody.slice(0, 300)}`,
        };
      }

      const emitData: any = await emitRes.json();
      const invoiceId = emitData.invoiceId;
      if (!invoiceId) {
        return { success: false, error: "notaas não retornou invoiceId" };
      }

      // 5. Polling até a nota ser processada (máx 30s, 5 tentativas)
      let nfeResult: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        const statusRes = await fetch(`${NOTAAS_BASE}/nfe/invoices/${invoiceId}/status`, {
          headers,
        });
        if (!statusRes.ok) continue;
        const statusData: any = await statusRes.json();
        if (statusData.status === "issued" || statusData.status === "error") {
          nfeResult = statusData;
          break;
        }
      }

      if (!nfeResult) {
        // A nota foi aceita pela notaas mas ainda não processou. Salva como
        // "processando" — o admin pode consultar depois.
        await db
          .from("orders")
          .update({
            nfe_status: "processando",
            nfe_xml: JSON.stringify({ invoiceId }),
            nfe_emitted_at: new Date().toISOString(),
          } as never)
          .eq("id", data.orderId);
        return {
          success: false,
          error: "NF-e enviada para a notaas, mas ainda não processada. Verifique em instantes.",
        };
      }

      if (nfeResult.status === "error") {
        const errMsg = nfeResult.xMotivo || nfeResult.errorMessage || "Erro desconhecido na notaas";
        return { success: false, error: `notaas rejeitou: ${errMsg}` };
      }

      // 6. Sucesso — salva no pedido
      const nfeKey = nfeResult.chaveAcesso || "";
      const nfeNumber = nfeResult.nNf || 0;
      const protocol = nfeResult.nProt || "";

      await db
        .from("orders")
        .update({
          nfe_key: nfeKey,
          nfe_number: nfeNumber,
          nfe_series: settings.nfe_serie,
          nfe_status: "autorizada",
          nfe_danfe_url: nfeResult.pdfUrl || null,
          nfe_xml: nfeResult.xmlUrl || null,
          nfe_emitted_at: new Date().toISOString(),
        } as never)
        .eq("id", data.orderId);

      return {
        success: true,
        data: {
          nfeKey,
          nfeNumber,
          nfeSeries: settings.nfe_serie,
          nfeStatus: "autorizada",
          protocol,
          pdfUrl: nfeResult.pdfUrl,
          xmlUrl: nfeResult.xmlUrl,
        },
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      console.error("[nfe] emitNFe error:", e);
      return { success: false, error: msg };
    }
  });

export const getDanfePdf = createServerFn({ method: "GET" })
  .validator((d: unknown) => ({ orderId: (d as any)?.orderId }) as { orderId: string })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data: order } = await db
        .from("orders")
        .select("nfe_danfe_url, nfe_number")
        .eq("id", data.orderId)
        .single();

      if (!order?.nfe_danfe_url) {
        return { success: false as const, error: "Link da DANFE não encontrado." };
      }

      const danfeUrl = new URL(order.nfe_danfe_url);
      if (danfeUrl.origin !== "https://platform.notaas.com.br") {
        return { success: false as const, error: "Link da DANFE inválido." };
      }

      const apiKey = process.env.NOTAAS_API_KEY;
      if (!apiKey) {
        return { success: false as const, error: "NOTAAS_API_KEY não configurada no servidor." };
      }

      const res = await fetch(order.nfe_danfe_url, {
        headers: { "x-api-key": apiKey },
      });

      if (!res.ok) {
        const err = await res.text().catch(() => "");
        return { success: false as const, error: `Notaas (${res.status}): ${err.slice(0, 100)}` };
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");

      return {
        success: true as const,
        data: {
          base64,
          filename: `danfe-${order.nfe_number || data.orderId}.pdf`,
        },
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403)
        return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });
