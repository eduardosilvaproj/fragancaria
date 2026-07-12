import { createServerFn } from "@tanstack/react-start";

// =====================================================
// TIPOS
// =====================================================

export type SigepCredentials = {
  usuario: string;
  senha: string;
  codAdministrativo: string;
  numeroCartao: string;
  cepOrigem: string;
};

export type Endereco = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

export type Destinatario = {
  nome: string;
  cpfCnpj: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email?: string;
};

export type ServicoSigep = "PAC" | "SEDEX" | "SEDEX10" | "SEDEX_HOJE";

export type Etiqueta = {
  numero: string;
  servico: ServicoSigep;
  destino: Destinatario;
  peso?: number;
  valorDeclarado?: number;
};

export type PlpResponse = {
  id: string;
  numero: string;
  etiquetas: Etiqueta[];
  dataCriacao: string;
  status: "rascunho" | "fechada" | "enviada";
};

// =====================================================
// CONSTANTES DO SIGEP
// =====================================================

const SIGEP_WS_URL = "https://apihom.correios.com.br";
const SIGEP_TOKEN_URL = "https://auth.correios.com.br";

// =====================================================
// HELPER: Autenticar no SIGEP
// =====================================================

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

async function getSigepToken(credentials: SigepCredentials): Promise<string> {
  // Em produção, usar o endpoint de autenticação real
  // Por enquanto, simulamos com um token mockado
  // TODO: Implementar autenticação real quando tiver as credenciais

  if (!credentials.usuario || !credentials.senha) {
    throw new Error("Credenciais SIGEP não configuradas");
  }

  // Simular token para desenvolvimento
  // Em produção: fazer POST para SIGEP_TOKEN_URL com client_credentials
  return `mock_token_${Date.now()}`;
}

// =====================================================
// HELPER: Fazer request autenticado
// =====================================================

async function sigepRequest<T>(
  endpoint: string,
  credentials: SigepCredentials,
  options: RequestInit = {}
): Promise<T> {
  const token = await getSigepToken(credentials);

  const response = await fetch(`${SIGEP_WS_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SIGEP API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

// =====================================================
// SERVER FN: Buscar Cliente SIGEP
// =====================================================

export const getSigepClientInfo = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data, error } = await db
        .from("shipping_settings")
        .select("value")
        .eq("key", "sigep_credentials")
        .single();

      if (error && error.code !== "PGRST116") {
        return { success: false as const, error: error.message };
      }

      if (!data) {
        return {
          success: true as const,
          data: {
            configured: false,
            message: "Credenciais SIGEP não configuradas"
          }
        };
      }

      const creds = data.value as SigepCredentials;
      // Não retornar a senha
      return {
        success: true as const,
        data: {
          configured: true,
          usuario: creds.usuario,
          codAdministrativo: creds.codAdministrativo,
          numeroCartao: creds.numeroCartao,
          cepOrigem: creds.cepOrigem,
        }
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false as const, error: "Não autorizado" };
      }
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// SERVER FN: Salvar Credenciais SIGEP
// =====================================================

export const saveSigepCredentials = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as SigepCredentials)
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { error } = await db
        .from("shipping_settings")
        .upsert({
          key: "sigep_credentials",
          value: data,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        return { success: false as const, error: error.message };
      }

      return { success: true as const, data: { saved: true } };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false as const, error: "Não autorizado" };
      }
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// SERVER FN: Solicitar Etiquetas ao SIGEP
// =====================================================

export const requestSigepLabels = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { quantidade: number; servico: ServicoSigep })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Buscar credenciais
      const { data: credsData, error: credsError } = await db
        .from("shipping_settings")
        .select("value")
        .eq("key", "sigep_credentials")
        .single();

      if (credsError || !credsData) {
        return {
          success: false as const,
          error: "Credenciais SIGEP não configuradas. Acesse Configurações > Frete."
        };
      }

      const credentials = credsData.value as SigepCredentials;

      // TODO: Implementar chamada real ao SIGEP
      // Por enquanto, gerar etiquetas mockadas no formato dos Correios
      // Formato: EXxxxxxxxBR (SEDEX) ou PQxxxxxxxBR (PAC)

      const prefixo = data.servico === "PAC" ? "PI" : "E";
      const etiquetas: string[] = [];

      for (let i = 0; i < data.quantidade; i++) {
        const numero = Math.floor(Math.random() * 10000000)
          .toString().padStart(8, "0");
        etiquetas.push(`${prefixo}${numero}BR`);
      }

      // Salvar etiquetas no banco para rastreamento
      const etiquetasSalvas = [];

      for (const etiqueta of etiquetas) {
        const { data: saved, error: saveError } = await db
          .from("shipping_quotes")
          .insert({
            order_id: null, // Etiqueta disponível ainda não vinculada
            service: data.servico,
            tracking_code: etiqueta,
            status: "disponivel",
          })
          .select("id")
          .single();

        if (saved) {
          etiquetasSalvas.push({
            id: saved.id,
            codigo: etiqueta,
            status: "disponivel"
          });
        }
      }

      return {
        success: true as const,
        data: {
          etiquetas: etiquetasSalvas,
          servico: data.servico,
          quantidade: data.quantidade,
        }
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false as const, error: "Não autorizado" };
      }
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// SERVER FN: Listar Etiquetas Disponíveis
// =====================================================

export const listAvailableLabels = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data, error } = await db
        .from("shipping_quotes")
        .select(`
          id,
          tracking_code,
          service,
          status,
          created_at
        `)
        .is("order_id", null)
        .eq("status", "disponivel")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        return { success: false as const, error: error.message };
      }

      return {
        success: true as const,
        data: data || []
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false as const, error: "Não autorizado" };
      }
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// SERVER FN: Vincular Etiqueta a Pedido
// =====================================================

export const linkLabelToOrder = createServerFn({ method: "POST" })
  .validator((d: unknown) => d as { labelId: string; orderId: string })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { error } = await db
        .from("shipping_quotes")
        .update({
          order_id: data.orderId,
          status: "emitida",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.labelId);

      if (error) {
        return { success: false as const, error: error.message };
      }

      return { success: true as const, data: { linked: true } };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false as const, error: "Não autorizado" };
      }
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// SERVER FN: Gerar PDF da Etiqueta
// =====================================================

export const generateLabelPdf = createServerFn({ method: "GET" })
  .validator((d: unknown) => d as { labelId: string })
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // Buscar dados da etiqueta
      const { data: label, error } = await db
        .from("shipping_quotes")
        .select(`
          id,
          tracking_code,
          service,
          status
        `)
        .eq("id", data.labelId)
        .single();

      if (error || !label) {
        return { success: false as const, error: "Etiqueta não encontrada" };
      }

      // Buscar dados do remetente
      const { data: senderData } = await db
        .from("shipping_settings")
        .select("value")
        .eq("key", "sender_info")
        .single();

      const sender = senderData?.value || {};

      // TODO: Gerar PDF real usando biblioteca como pdfkit ou jspdf
      // Por enquanto, retornar dados para o frontend gerar o PDF

      return {
        success: true as const,
        data: {
          id: label.id,
          codigo: label.tracking_code,
          servico: label.service,
          remetente: sender,
          // Em produção, aqui viria o base64 do PDF
          pdfUrl: null,
          htmlContent: generateLabelHtml(label.tracking_code, label.service, sender),
        }
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false as const, error: "Não autorizado" };
      }
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// HELPER: Gerar HTML da etiqueta (para impressão)
// =====================================================

function generateLabelHtml(codigo: string, servico: string, remetente: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; size: 100mm 150mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .etiqueta {
      width: 100mm;
      height: 148mm;
      border: 2px solid #000;
      padding: 5mm;
      font-family: Arial, sans-serif;
    }
    .codigo {
      font-size: 28px;
      font-weight: bold;
      text-align: center;
      border-bottom: 2px solid #000;
      padding: 5px;
      margin-bottom: 5px;
    }
    .codigo-barras {
      text-align: center;
      font-size: 10px;
      font-family: 'Libre Barcode 128', cursive;
    }
    .servico {
      font-size: 14px;
      font-weight: bold;
      text-align: center;
      background: #000;
      color: #fff;
      padding: 3px;
    }
    .remetente {
      font-size: 11px;
      margin-top: 5px;
    }
    .remetente-label {
      font-weight: bold;
      font-size: 9px;
      background: #000;
      color: #fff;
      padding: 2px 5px;
    }
    .destinatario {
      font-size: 12px;
      margin-top: 10px;
    }
    .dest-label {
      font-weight: bold;
      font-size: 9px;
      background: #000;
      color: #fff;
      padding: 2px 5px;
      display: inline-block;
    }
    .endereco {
      margin-top: 5px;
      line-height: 1.3;
    }
    .destino {
      text-align: right;
      margin-top: 10px;
    }
    .destino-box {
      border: 2px solid #000;
      padding: 5px;
      display: inline-block;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="etiqueta">
    <div class="codigo">${codigo}</div>
    <div class="codigo-barras">${codigo.replace(/[A-Z]/g, c => String.fromCharCode(65 + (c.charCodeAt(0) - 65 + 10) % 26))}</div>
    <div class="servico">${servico}</div>
    <div class="remetente">
      <div class="remetente-label">REMETENTE</div>
      <div class="endereco">
        ${remetente.name || 'Fragranciaria'}<br>
        ${remetente.address?.street || ''}, ${remetente.address?.number || ''}<br>
        ${remetente.address?.complement || ''} ${remetente.address?.neighborhood || ''}<br>
        ${remetente.address?.city || ''} - ${remetente.address?.state || ''}<br>
        CEP: ${remetente.address?.postal_code || ''}
      </div>
    </div>
    <div class="destinatario">
      <div class="dest-label">DESTINATÁRIO</div>
      <div class="endereco">
        <strong>[NOME DO CLIENTE]</strong><br>
        [ENDEREÇO]<br>
        [BAIRRO]<br>
        [CIDADE] - [UF]<br>
        CEP: [CEP]
      </div>
    </div>
    <div class="destino">
      <div class="destino-box">
        <strong>AO DESTINATÁRIO</strong><br>
        Em caso de não entrega,<br>
        devolver ao remetente
      </div>
    </div>
  </div>
</body>
</html>`;
}