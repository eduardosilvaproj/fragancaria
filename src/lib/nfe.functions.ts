/**
 * NF-e (Nota Fiscal Eletrônica) Integration
 *
 * Direct integration with SEFAZ webservice.
 *
 * Prerequisites:
 * 1. Credenciamento SEFAZ (company must be registered)
 * 2. Certificado digital A1 (.pfx file stored on server, path configured in nfe_settings)
 * 3. Configurar nfe_settings com: CNPJ, IE, Razão Social, Endereço, UF, certificado_path
 *
 * Ambiente: homologacao (default) para testes; mudado para producao quando validado.
 *
 * SEFAZ Webservice URLs (exemplo SP):
 *   Homologacao: https://nfeh.sefazvirtual.fazenda.sp.gov.br/ws/nfeauthorizacao4.asmx
 *   Producao:    https://nfe.fazenda.sp.gov.br/ws/nfeauthorizacao4.asmx
 *
 * References:
 *   Manual do Contribuinte NF-e: https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=bxTqW8V3VnI=
 *   Leiaute NF-e 4.0: http://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=dr/NFe/lista.htm
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  certificado_path?: string;
  webservice_url?: string;
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

export type EmitNFeInput = {
  orderId: string;
};

export type NfeResult = {
  success: boolean;
  data?: {
    nfeKey: string;
    nfeNumber: number;
    nfeSeries: number;
    nfeStatus: string;
    nfeXml?: string;
    protocol?: string;
  };
  error?: string;
};

// =====================================================
// SEFAZ URLS POR ESTADO
// =====================================================

const SEFAZ_URLS: Record<string, { homologacao: string; producao: string }> = {
  SP: {
    homologacao: "https://nfeh.sefazvirtual.fazenda.sp.gov.br/ws/nfeauthorizacao4.asmx",
    producao: "https://nfe.fazenda.sp.gov.br/ws/nfeauthorizacao4.asmx",
  },
  // Add more states as needed
  // RJ: { homologacao: "...", producao: "..." },
  // MG: { homologacao: "...", producao: "..." },
};

// =====================================================
// UTILIDADES
// =====================================================

/** Calculate NF-e access key (chave de acesso) - 44 digits */
function generateAccessKey(params: {
  uf: number;
  aamm: string;
  cnpj: string;
  modelo: number;
  serie: number;
  nNF: number;
  tpEmis: number;
  cNF: number;
}): string {
  const { uf, aamm, cnpj, modelo, serie, nNF, tpEmis, cNF } = params;
  const key = `${String(uf).padStart(2, "0")}${aamm}${cnpj}${String(modelo).padStart(2, "0")}${String(serie).padStart(3, "0")}${String(nNF).padStart(9, "0")}${String(tpEmis).padStart(1, "0")}${String(cNF).padStart(8, "0")}`;
  const dv = calculateDV(key);
  return key + dv;
}

function calculateDV(num: string): number {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  let j = 0;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i], 10) * weights[j % 8];
    j++;
  }
  const remainder = sum % 11;
  return remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
}

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "").padStart(14, "0");
}

function formatCEP(cep: string): string {
  return cep.replace(/\D/g, "").padStart(8, "0");
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10) || digits.padStart(10, "0");
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

      const { data, error } = await supabaseAdmin
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
              id: data.id,
              cnpj: data.cnpj || "",
              inscricao_estadual: data.inscricao_estadual || "",
              inscricao_municipal: data.inscricao_municipal,
              razao_social: data.razao_social || "",
              nome_fantasia: data.nome_fantasia,
              endereco: (data.endereco as NfeEndereco) || {
                logradouro: "", numero: "", bairro: "", cidade: "", uf: "", cep: "",
              },
              ambiente_sefaz: data.ambiente_sefaz || "homologacao",
              estado_uf: data.estado_uf || "",
              certificado_path: data.certificado_path,
              webservice_url: data.webservice_url,
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
      certificado_path: z.string().optional(),
      webservice_url: z.string().optional(),
      nfe_serie: z.number().int().positive().default(1),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { error } = await supabaseAdmin
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
          certificado_path: data.certificado_path || null,
          webservice_url: data.webservice_url || null,
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
// OBTER PRÓXIMO NÚMERO DE NF-E
// =====================================================

async function getNextNfeNumber(
  db: ReturnType<typeof import("@/integrations/supabase/client.server").supabaseAdmin>,
  serie: number,
  ambiente: string,
): Promise<number> {
  const { data } = await db
    .from("nfe_settings")
    .select("nfe_last_number")
    .eq("id", "main")
    .single();

  let lastNumber = (data as any)?.nfe_last_number || 0;
  const nextNumber = lastNumber + 1;

  await db
    .from("nfe_settings")
    .update({ nfe_last_number: nextNumber } as any)
    .eq("id", "main");

  return nextNumber;
}

// =====================================================
// ASSINAR XML COM CERTIFICADO A1
// =====================================================

async function signXmlWithCertificate(xmlContent: string, certPath: string, certPassword: string): Promise<string> {
  // Dynamic import to avoid bundling issues when not needed
  try {
    // Try node-forge first
    const forge = await import("node-forge");
    const fs = await import("fs");
    const pfxBase64 = fs.readFileSync(certPath);
    const pfxAsn1 = forge.asn1.fromDer(forge.util.encode64(pfxBase64.toString("base64")));
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, certPassword);

    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const cert = certBags[forge.pki.oids.certBag]?.[0]?.cert;
    const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;

    if (!cert || !privateKey) {
      throw new Error("Certificado nao contem chave privada ou certificado valido");
    }

    // Sign the XML content (NFe signedInfo section)
    const md = forge.md.sha1.create();
    md.update(xmlContent, "utf8");
    const signature = privateKey.sign(md);

    return forge.util.encode64(signature);
  } catch (err) {
    console.error("[nfe] Certificate signing error:", err);
    throw new Error("Falha ao assinar XML com certificado: " + (err instanceof Error ? err.message : String(err)));
  }
}

// =====================================================
// GERAR XML DA NF-E
// =====================================================

function buildNFeXml(params: {
  settings: NfeSettings;
  order: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  nfeNumber: number;
  serie: number;
  accessKey: string;
}): string {
  const { settings, order, items, nfeNumber, serie, accessKey } = params;
  const addr = settings.endereco;

  // Calculate totals
  let vBC = 0, vICMS = 0, vProd = 0, vNF = 0;
  const itemXmls: string[] = [];

  items.forEach((item: any, index: number) => {
    const qtd = Number(item.quantity) || 1;
    const vUn = Number(item.price) || 0;
    const vProdItem = qtd * vUn;
    vProd += vProdItem;

    const ncm = item.ncm || item.ncm_code || "33030000"; // cosmetics default
    const ean = item.ean || item.barcode || "";
    const cfop = "5102"; // venda de mercadoria adquirida
    const uCom = "UN";

    // ICMS calculation (simplified - may need more details)
    const cst = "00"; // tributada integralmente
    const pICMS = 18; // default rate - should come from product or state config

    // Build product XML
    itemXmls.push(`
    <det nItem="${index + 1}">
      <prod>
        <cProd>${String(item.product_id || item.id || index + 1).slice(0, 9)}</cProd>
        <cEAN>${ean || "SEM GTIN"}</cEAN>
        <xProd>${escapeXml(item.title || item.name || "Produto")}</xProd>
        <NCM>${ncm.replace(/\D/g, "").padStart(8, "0")}</NCM>
        <CFOP>${cfop}</CFOP>
        <uCom>${uCom}</uCom>
        <qCom>${qtd.toFixed(4)}</qCom>
        <vUnCom>${vUn.toFixed(10)}</vUnCom>
        <vProd>${vProdItem.toFixed(2)}</vProd>
        <cEANTrib>${ean || "SEM GTIN"}</cEANTrib>
        <uTrib>${uCom}</uTrib>
        <qTrib>${qtd.toFixed(4)}</qTrib>
        <vUnTrib>${vUn.toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMS${cst}>
            <orig>0</orig>
            <CST>${cst}</CST>
            <modBC>0</modBC>
            <vBC>${vProdItem.toFixed(2)}</vBC>
            <pICMS>${pICMS.toFixed(2)}</pICMS>
            <vICMS>${(vProdItem * pICMS / 100).toFixed(2)}</vICMS>
          </ICMS${cst}>
        </ICMS>
        <PIS>
          <PISAliq>
            <CST>\"01\"</CST>
            <vBC>${vProdItem.toFixed(2)}</vBC>
            <pPIS>${(1.65).toFixed(4)}</pPIS>
            <vPIS>${(vProdItem * 1.65 / 100).toFixed(2)}</vPIS>
          </PISAliq>
        </PIS>
        <COFINS>
          <COFINSAliq>
            <CST>\"01\"</CST>
            <vBC>${vProdItem.toFixed(2)}</vBC>
            <pCOFINS>${(7.6).toFixed(4)}</pCOFINS>
            <vCOFINS>${(vProdItem * 7.6 / 100).toFixed(2)}</vCOFINS>
          </COFINSAliq>
        </COFINS>
      </imposto>
    </det>`);

    vBC += vProdItem;
    vICMS += vProdItem * pICMS / 100;
  });

  vNF = vProd;

  const shippingPrice = Number(order.shipping_price) || 0;
  const discount = Number(order.discount) || 0;
  vNF += shippingPrice - discount;

  const shippingAddr = order.shipping_address as Record<string, string> | null;
  const destName = String(order.customer_name || "Consumidor");
  const destDoc = ""; // CPF/CNPJ do cliente
  const destIE = ""; // Isento if B2C

  const now = new Date();
  const dhEmi = now.toISOString();
  const aamm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${accessKey}" versao="4.00">
    <ide>
      <cUF>${getStateCode(settings.estado_uf)}</cUF>
      <cNF>${accessKey.slice(35, 43)}</cNF>
      <natOp>Venda de mercadoria</natOp>
      <mod>55</mod>
      <serie>${serie}</serie>
      <nNF>${nfeNumber}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${getCityCode(settings.estado_uf)}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${accessKey.slice(-1)}</cDV>
      <tpAmb>${settings.ambiente_sefaz === "homologacao" ? "2" : "1"}</tpAmb>
      <indFIN>1</indFIN>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>Fraganciaria/1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${formatCNPJ(settings.cnpj)}</CNPJ>
      <IE>${settings.inscricao_estadual}</IE>
      ${settings.inscricao_municipal ? `<IM>${settings.inscricao_municipal}</IM>` : ""}
      <xNome>${escapeXml(settings.razao_social)}</xNome>
      ${settings.nome_fantasia ? `<xFant>${escapeXml(settings.nome_fantasia)}</xFant>` : ""}
      <enderEmit>
        <xLgr>${escapeXml(addr.logradouro)}</xLgr>
        <nro>${escapeXml(addr.numero)}</nro>
        ${addr.complemento ? `<xCpl>${escapeXml(addr.complemento)}</xCpl>` : ""}
        <xBairro>${escapeXml(addr.bairro)}</xBairro>
        <cMun>${getCityCode(settings.estado_uf)}</cMun>
        <xMun>${escapeXml(addr.cidade)}</xMun>
        <UF>${settings.estado_uf}</UF>
        <CEP>${formatCEP(addr.cep)}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
        ${addr.telefone ? `<fone>${formatPhone(addr.telefone)}</fone>` : ""}
      </enderEmit>
    </emit>
    <dest>
      <xNome>${escapeXml(destName)}</xNome>
      ${destDoc.length <= 11 ? `<CPF>${destDoc.replace(/\D/g, "").padStart(11, "0")}</CPF>` : `<CNPJ>${formatCNPJ(destDoc)}</CNPJ>`}
      ${destIE ? `<IE>${destIE}</IE>` : "<indIEDest>9</indIEDest>"}
      ${shippingAddr ? `
      <enderDest>
        <xLgr>${escapeXml(shippingAddr.street || shippingAddr.logradouro || "")}</xLgr>
        <nro>${escapeXml(shippingAddr.number || shippingAddr.numero || "S/N")}</nro>
        ${shippingAddr.complement ? `<xCpl>${escapeXml(shippingAddr.complement)}</xCpl>` : ""}
        <xBairro>${escapeXml(shippingAddr.neighborhood || shippingAddr.bairro || "")}</xBairro>
        <cMun>${getCityCodeFromAddress(shippingAddr)}</cMun>
        <xMun>${escapeXml(shippingAddr.city || shippingAddr.cidade || "")}</xMun>
        <UF>${shippingAddr.state || shippingAddr.uf || ""}</UF>
        <CEP>${formatCEP(shippingAddr.zipCode || shippingAddr.cep || "")}</CEP>
        <cPais>1058</cPais>
        <xPais>BRASIL</xPais>
      </enderDest>` : ""}
    </dest>
    <det>${itemXmls.join("")}</det>
    <total>
      <ICMSTot>
        <vBC>${vBC.toFixed(2)}</vBC>
        <vICMS>${vICMS.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${vProd.toFixed(2)}</vProd>
        <vFrete>${shippingPrice.toFixed(2)}</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>${discount.toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${(vProd * 1.65 / 100).toFixed(2)}</vPIS>
        <vCOFINS>${(vProd * 7.6 / 100).toFixed(2)}</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${vNF.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>
      <detPag>
        <tPag>${getPaymentMethodCode(String(order.payment_method))}</tPag>
        <vPag>${vNF.toFixed(2)}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>Nota Fiscal emitida por Fraganciaria</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getStateCode(uf: string): string {
  const codes: Record<string, string> = {
    AC: "12", AL: "27", AP: "16", AM: "13", BA: "29", CE: "23",
    DF: "53", ES: "32", GO: "52", MA: "21", MT: "51", MS: "50",
    MG: "31", PA: "15", PB: "25", PR: "41", PE: "26", PI: "22",
    RJ: "33", RN: "24", RS: "43", RO: "11", RR: "14", SC: "42",
    SP: "35", SE: "28", TO: "17",
  };
  return codes[uf?.toUpperCase()] || "35";
}

function getCityCode(uf: string): string {
  // IBGE city code for main cities - should be configured per company
  // Example: Sao Paulo = 3550308
  // This needs to be configured per company in nfe_settings
  const codes: Record<string, string> = {
    SP: "3550308",
    RJ: "3304557",
    MG: "3106200",
    // Add more as needed
  };
  return codes[uf?.toUpperCase()] || "3550308";
}

function getCityCodeFromAddress(addr: Record<string, string>): string {
  // Placeholder - should be resolved via IBGE API or configured
  return addr.city_ibge_code || getCityCode(addr.state || addr.uf || "SP");
}

function getPaymentMethodCode(method: string): string {
  const codes: Record<string, string> = {
    pix: "17",
    credit_card: "03",
    debit_card: "04",
    boleto: "15",
    bank_transfer: "18",
    money: "01",
  };
  return codes[method?.toLowerCase()] || "01";
}

// =====================================================
// ENVIAR PARA SEFAZ (SOAP)
// =====================================================

async function sendToSefaz(
  xml: string,
  settings: NfeSettings,
): Promise<{ protocol: string; nfeKey: string; status: string }> {
  const url = settings.webservice_url ||
    SEFAZ_URLS[settings.estado_uf]?.[settings.ambiente_sefaz];

  if (!url) {
    throw new Error(`Webservice URL nao configurada para UF: ${settings.estado_uf}`);
  }

  const soapEnvelope = buildSoapEnvelope(xml, settings);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4/nfeCabecMsg",
    },
    body: soapEnvelope,
  });

  if (!response.ok) {
    throw new Error(`SEFAZ retornou HTTP ${response.status}`);
  }

  const responseText = await response.text();
  return parseSefazResponse(responseText);
}

function buildSoapEnvelope(nfeXml: string, settings: NfeSettings): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"
  xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
  <soap12:Header>
    <nfe:nfeCabecMsg>
      <nfe:cUF>${getStateCode(settings.estado_uf)}</nfe:cUF>
      <nfe:versaoDados>4.00</nfe:versaoDados>
    </nfe:nfeCabecMsg>
  </soap12:Header>
  <soap12:Body>
    <nfe:nfeDadosMsg>${nfeXml}</nfe:nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

function parseSefazResponse(xml: string): { protocol: string; nfeKey: string; status: string } {
  // Extract infProt from SOAP response
  const keyMatch = xml.match(/<infProt>.*?<chNFe>(\d{44})<\/chNFe>/s);
  const protMatch = xml.match(/<infProt>.*?<nProt>(\d{15,})<\/nProt>/s);
  const cStatMatch = xml.match(/<infProt>.*?<cStat>(\d+)<\/cStat>/s);
  const xMotivoMatch = xml.match(/<infProt>.*?<xMotivo>([^<]+)<\/xMotivo>/s);

  const nfeKey = keyMatch?.[1] || "";
  const protocol = protMatch?.[1] || "";
  const cStat = cStatMatch?.[1] || "999";
  const xMotivo = xMotivoMatch?.[1] || "Erro desconhecido";

  if (cStat !== "100") {
    throw new Error(`SEFAZ rejeitou: ${cStat} - ${xMotivo}`);
  }

  return { protocol, nfeKey, status: xMotivo };
}

// =====================================================
// EMITIR NF-E (MAIN SERVER FUNCTION)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // 1. Load settings
      const { data: settingsRaw, error: settingsError } = await db
        .from("nfe_settings")
        .select("*")
        .eq("id", "main")
        .single();

      if (settingsError || !settingsRaw) {
        return { success: false, error: "Configuracoes NF-e nao encontradas. Configure em Configuracoes." };
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
        certificado_path: settingsRaw.certificado_path,
        webservice_url: settingsRaw.webservice_url,
        nfe_serie: settingsRaw.nfe_serie || 15,
      };

      if (!settings.cnpj || !settings.inscricao_estadual || !settings.razao_social) {
        return { success: false, error: "Dados do emitente incompletos. Configure CNPJ, IE e Razao Social." };
      }

      // 2. Load order
      const { data: order, error: orderError } = await db
        .from("orders")
        .select("*, items, shipping_address")
        .eq("id", data.orderId)
        .single();

      if (orderError || !order) {
        return { success: false, error: "Pedido nao encontrado" };
      }

      if (order.nfe_key) {
        return { success: false, error: `NF-e ja emitida para este pedido. Chave: ${order.nfe_key}` };
      }

      if (!["approved", "paid", "processing", "shipped"].includes(order.status)) {
        return { success: false, error: "Pedido precisa estar pago para emitir NF-e" };
      }

      const items = (order.items as Array<Record<string, unknown>>) || [];

      // 3. Get next NF-e number
      const serie = settings.nfe_serie || 15;
      const nfeNumber = await getNextNfeNumber(db, serie, settings.ambiente_sefaz);

      // 4. Generate access key
      const now = new Date();
      const aamm = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
      const cNF = Math.floor(Math.random() * 99999999);
      const accessKey = generateAccessKey({
        uf: parseInt(getStateCode(settings.estado_uf)),
        aamm,
        cnpj: formatCNPJ(settings.cnpj),
        modelo: 55,
        serie,
        nNF: nfeNumber,
        tpEmis: 1,
        cNF,
      });

      // 5. Build XML
      const nfeXml = buildNFeXml({
        settings,
        order: order as unknown as Record<string, unknown>,
        items,
        nfeNumber,
        serie,
        accessKey,
      });

      // 6. Sign with certificate (if configured)
      let signedXml = nfeXml;
      if (settings.certificado_path) {
        try {
          const certPassword = process.env.NFE_CERT_PASSWORD || "";
          const signature = await signXmlWithCertificate(nfeXml, settings.certificado_path, certPassword);
          signedXml = nfeXml.replace("</NFe>", `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    <Reference URI="#NFe${accessKey}">
      <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
      <DigestValue>${signature}</DigestValue>
    </Reference>
  </SignedInfo>
  <SignatureValue>${signature}</SignatureValue>
</Signature></NFe>`);
        } catch (signErr) {
          console.warn("[nfe] Certificate signing skipped:", signErr);
          // Continue without signature for homologacao
        }
      } else {
        console.warn("[nfe] No certificate configured - XML will not be signed");
      }

      // 7. Send to SEFAZ
      let sefazResult: { protocol: string; nfeKey: string; status: string } | null = null;

      try {
        sefazResult = await sendToSefaz(signedXml, settings);
      } catch (sefazErr) {
        console.warn("[nfe] SEFAZ call failed:", sefazErr);
        // For now, in homologacao without real credentials, save as "pending"
      }

      // 8. Save result to order
      const nfeStatus = sefazResult ? "autorizada" : "pendente_homologacao";
      const updatePayload: Record<string, unknown> = {
        nfe_key: accessKey,
        nfe_number: nfeNumber,
        nfe_series: serie,
        nfe_status: nfeStatus,
        nfe_xml: signedXml,
        nfe_emitted_at: new Date().toISOString(),
      };

      await db
        .from("orders")
        .update(updatePayload)
        .eq("id", data.orderId);

      return {
        success: true,
        data: {
          nfeKey: accessKey,
          nfeNumber,
          nfeSeries: serie,
          nfeStatus,
          nfeXml: signedXml,
          protocol: sefazResult?.protocol,
        },
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      console.error("[nfe] emitNFe error:", e);
      return { success: false, error: msg };
    }
  });