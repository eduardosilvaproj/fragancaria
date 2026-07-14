// Cliente para a API REST moderna dos Correios (api.correios.com.br).
// Autenticacao: usuario (CNPJ/contrato) + codigo de acesso gerado em cws.correios.com.br.
// NAO usar o SIGEP Web classico (SOAP) — sem documentacao oficial confirmada para este projeto.
//
// Referencias: cws.correios.com.br (portal de credenciais) / api.correios.com.br (gateway).
// Este cliente ainda nao foi validado contra a API real — a primeira chamada de producao
// pode revelar diferencas de contrato (nomes de campo, shape de resposta).

const CORREIOS_TOKEN_URL = "https://api.correios.com.br/token/v1/autentica";
const CORREIOS_API_URL = "https://api.correios.com.br";

export type CorreiosCredentials = {
  usuario: string;
  codigoAcesso: string;
  cartaoPostagem: string;
  cepOrigem: string;
};

export type CorreiosEndereco = {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

export type CorreiosDestinatario = {
  nome: string;
  telefone?: string;
  email?: string;
  endereco: CorreiosEndereco;
};

export type CorreiosPrepostagemInput = {
  servico: "PAC" | "SEDEX" | "SEDEX10";
  destinatario: CorreiosDestinatario;
  remetente: CorreiosDestinatario;
  pesoGramas: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  valorDeclarado?: number;
};

export type CorreiosPrepostagemResult = {
  codigoObjeto: string;
  idPrepostagem: string;
  urlEtiqueta?: string | null;
};

const SERVICE_CODES: Record<string, string> = {
  PAC: "03298",
  SEDEX: "03220",
  SEDEX10: "04162",
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getCorreiosToken(credentials: CorreiosCredentials): Promise<string> {
  if (!credentials.usuario || !credentials.codigoAcesso) {
    throw new Error("Credenciais da API Correios não configuradas (usuário/código de acesso)");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const basicAuth = Buffer.from(`${credentials.usuario}:${credentials.codigoAcesso}`).toString("base64");

  const response = await fetch(CORREIOS_TOKEN_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      numero: credentials.cartaoPostagem,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Falha ao autenticar na API dos Correios: ${response.status} ${errorBody}`.trim());
  }

  const result = await response.json();
  const token = result?.token;
  const expiraEm = result?.expiraEm ? new Date(result.expiraEm).getTime() : Date.now() + 23 * 60 * 60 * 1000;

  if (!token) {
    throw new Error("Resposta de autenticação da API Correios não trouxe token");
  }

  cachedToken = { token, expiresAt: expiraEm };
  return token;
}

async function correiosRequest<T>(
  path: string,
  credentials: CorreiosCredentials,
  options: RequestInit = {},
): Promise<T> {
  const token = await getCorreiosToken(credentials);

  const response = await fetch(`${CORREIOS_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`API Correios respondeu ${response.status}: ${errorBody}`.trim());
  }

  return response.json();
}

export function getServiceCode(servico: string): string {
  return SERVICE_CODES[servico] || SERVICE_CODES.PAC;
}

// Solicita uma pre-postagem (etiqueta) para um objeto real dos Correios.
// Lanca erro se as credenciais nao estiverem configuradas ou se a API recusar a requisicao —
// nao ha fallback mock aqui, quem chama decide o que fazer quando nao ha credenciais.
export async function criarPrepostagem(
  credentials: CorreiosCredentials,
  input: CorreiosPrepostagemInput,
): Promise<CorreiosPrepostagemResult> {
  const codigoServico = getServiceCode(input.servico);

  const body = {
    codigoServico,
    remetente: {
      nome: input.remetente.nome,
      telefone: input.remetente.telefone || "",
      email: input.remetente.email || "",
      endereco: input.remetente.endereco,
    },
    destinatario: {
      nome: input.destinatario.nome,
      telefone: input.destinatario.telefone || "",
      email: input.destinatario.email || "",
      endereco: input.destinatario.endereco,
    },
    objeto: {
      peso: input.pesoGramas,
      altura: input.alturaCm,
      largura: input.larguraCm,
      comprimento: input.comprimentoCm,
      valorDeclarado: input.valorDeclarado || 0,
    },
    cartaoPostagem: credentials.cartaoPostagem,
  };

  const result = await correiosRequest<{
    codigoObjeto?: string;
    id?: string;
    idPrepostagem?: string;
    urlEtiqueta?: string;
  }>("/prepostagem/v1/prepostagens", credentials, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const codigoObjeto = result.codigoObjeto;
  if (!codigoObjeto) {
    throw new Error("API Correios não retornou código de objeto para a pré-postagem");
  }

  return {
    codigoObjeto,
    idPrepostagem: result.idPrepostagem || result.id || "",
    urlEtiqueta: result.urlEtiqueta || null,
  };
}
