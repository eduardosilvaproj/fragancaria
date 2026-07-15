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
  "São Paulo": 3550308, "São Paulo, SP": 3550308,
  "Rio de Janeiro": 3304557, "Rio de Janeiro, RJ": 3304557,
  "Belo Horizonte": 3106200, "Belo Horizonte, MG": 3106200,
  "Campinas": 3509502,
  "Guarulhos": 3518800,
  "São Bernardo do Campo": 3548702,
  "Santo André": 3547803,
  "Osasco": 3534401,
  "Ribeirão Preto": 3541402,
};

function getCityCode(city: string): number {
  return CITY_CODES[city] || 3550308; // default SP
}

// Código de pagamento para a notaas (tabela 4.4.7 do Manual NF-e).
function paymentType(method: string): string {
  const map: Record<string, string> = {
    pix: "17", credit_card: "03", debit_card: "04", boleto: "15",
  };
  return map[method?.toLowerCase()] || "99";
}

// =====================================================
// OBTER CONFIGURAÇÕES NF-E
// =====================================================

export const getNfeSettings = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ success: true; data: NfeSettings | null } | { success: false; error: string }> => {
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
                logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "",
              },
              ambiente_sefaz: (data as any).ambiente_sefaz || "homologacao",
              estado_uf: (data as any).estado_uf || "",
              nfe_serie: (data as any).nfe_serie || 1,
            }
          : null,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  });

// =====================================================
// SALVAR CONFIGURAÇÕES NF-E
// =====================================================

export const saveNfeSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
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
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { error } = await (supabaseAdmin as any)
        .from("nfe_settings")
        .upsert({
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
        }, { onConflict: "id" });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      return { success: false, error: msg };
    }
  });

// =====================================================
// EMITIR NF-E VIA NOTAAS
// =====================================================

export const emitNFe = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({ orderId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }): Promise<NfeResult> => {
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
        return { success: false, error: "Configurações NF-e não encontradas. Configure em Configurações." };
      }

      const settings: NfeSettings = {
        id: settingsRaw.id,
        cnpj: settingsRaw.cnpj,
        inscricao_estadual: settingsRaw.inscricao_estadual,
        inscricao_municipal: settingsRaw.inscricao_municipal,
        razao_social: settingsRaw.razao_social,
        nome_fantasia: settingsRaw.nome_fantasia,
        endereco: (settingsRaw.endereco as NfeEndereco) || { logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "" },
        ambiente_sefaz: settingsRaw.ambiente_sefaz || "homologacao",
        estado_uf: settingsRaw.estado_uf,
        nfe_serie: settingsRaw.nfe_serie || 1,
      };

      if (!settings.cnpj || !settings.inscricao_estadual || !settings.razao_social) {
        return { success: false, error: "Dados do emitente incompletos. Configure CNPJ, IE e Razão Social." };
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
        return { success: false, error: `NF-e já emitida para este pedido. Chave: ${(order as any).nfe_key}` };
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
      const destName = String(order.customer_name || "Consumidor");

      const notaasItems = items.map((item: any, idx: number) => {
        const qtd = Number(item.quantity) || 1;
        const vUn = Number(item.price) || 0;
        const vTotal = qtd * vUn;
        return {
          descricao: String(item.title || item.name || "Produto"),
          ncm: "33049990",
          cfop: "5102",
          quantidade: qtd,
          valorUnitario: vUn,
          valorTotal: vTotal,
          unidade: "UN",
          codigo: String(item.id || item.product_id || `PRD${idx + 1}`).slice(0, 9),
          cst: "00",
          aliquotaIcms: 18,
          aliquotaPis: 1.65,
          aliquotaCofins: 7.6,
        };
      });

      const totalProd = notaasItems.reduce((s, i) => s + i.valorTotal, 0);
      const shippingPrice = Number(order.shipping_price) || 0;
      const discount = Number(order.discount) || 0;
      const totalNf = Number((totalProd + shippingPrice - discount).toFixed(2));

      const payload: Record<string, unknown> = {
        modelo: 55,
        naturezaOperacao: "Venda de mercadoria",
        destinoOperacao: 1,
        tipoOperacao: 1,
        finalidade: 1,
        consumidorFinal: 1,
        presencaComprador: 1,
        tipoEmissao: 1,
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
          ...(isCPF
            ? { cpf: destDocClean.padStart(11, "0") }
            : { cnpj: formatCNPJ(destDocClean) }),
          nome: destName,
          indicadorIE: 9,   // 9=não contribuinte
          endereco: {
            logradouro: shippingAddr?.street || "",
            numero: shippingAddr?.number || "SN",
            bairro: shippingAddr?.neighborhood || "",
            codigoMunicipio: getCityCode(shippingAddr?.city || ""),
            cidade: shippingAddr?.city || "",
            uf: shippingAddr?.state || settings.estado_uf,
            cep: formatCEP(shippingAddr?.zipCode || shippingAddr?.cep || ""),
          },
        },
        items: notaasItems,
        pagamentos: [
          { tipoPagamento: paymentType(order.payment_method), valor: totalNf },
        ],
        transporte: {
          modalidadeFrete: 1, // FOB (comprador assume frete)
        },
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
        return { success: false, error: `notaas rejeitou (${emitRes.status}): ${errBody.slice(0, 300)}` };
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
        const statusRes = await fetch(`${NOTAAS_BASE}/nfe/invoices/${invoiceId}/status`, { headers });
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
        await db.from("orders").update({
          nfe_status: "processando",
          nfe_xml: JSON.stringify({ invoiceId }),
          nfe_emitted_at: new Date().toISOString(),
        } as never).eq("id", data.orderId);
        return { success: false, error: "NF-e enviada para a notaas, mas ainda não processada. Verifique em instantes." };
      }

      if (nfeResult.status === "error") {
        const errMsg = nfeResult.xMotivo || nfeResult.errorMessage || "Erro desconhecido na notaas";
        return { success: false, error: `notaas rejeitou: ${errMsg}` };
      }

      // 6. Sucesso — salva no pedido
      const nfeKey = nfeResult.chaveAcesso || "";
      const nfeNumber = nfeResult.nNf || 0;
      const protocol = nfeResult.nProt || "";

      await db.from("orders").update({
        nfe_key: nfeKey,
        nfe_number: nfeNumber,
        nfe_series: settings.nfe_serie,
        nfe_status: "autorizada",
        nfe_danfe_url: nfeResult.pdfUrl || null,
        nfe_xml: nfeResult.xmlUrl || null,
        nfe_emitted_at: new Date().toISOString(),
      } as never).eq("id", data.orderId);

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

      const { data: order } = await db.from("orders")
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
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });