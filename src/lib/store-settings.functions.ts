// Server fns da store_settings: dados da LOJA FISICA e de CONTATO publico.
//
// ESCOPO — nada aqui alimenta fiscal ou frete:
//   - endereco FISCAL (NF-e)     -> nfe_settings.endereco
//   - ORIGEM do frete (cotacao)  -> env MELHOR_ENVIO_FROM_CEP
//   - remetente da etiqueta      -> shipping_settings.sender_info
// O endereco desta tabela e o da loja fisica (Av. Queiroz Filho 1402), que e
// OUTRO lugar: o CD (Alameda Paulista 206, CEP 14811-060) nao atende publico.
// Confundir os dois quebra emissao de nota ou muda o preco de todo frete.
//
// A tabela e singleton (id = 1) e tem RLS ligado com ZERO policies: nenhum
// acesso direto pelo browser. Todo acesso passa por aqui, com service role.
import { createServerFn } from "@tanstack/react-start";

// =====================================================
// TIPOS
// =====================================================

/**
 * Configuracao da loja como a vitrine consome.
 *
 * Strings vazias significam "nao configurado" — a tabela usa
 * NOT NULL DEFAULT '' justamente para "vazio" ter UMA representacao, entao a
 * regra "whatsapp vazio nao renderiza botao" e `!config.contato.whatsapp`.
 */
export type StoreConfig = {
  /** false = "Inauguracao em breve" (sem horarios). true = "Venha conhecer". */
  lojaAberta: boolean;
  endereco: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  horarios: {
    /** Texto livre, ex. "9h00 às 18h00". */
    semana: string;
    sabado: string;
  };
  /** Vazio = bloco visual cai no fundo verde com icone. */
  fotoUrl: string;
  contato: {
    telefone: string;
    /** Vazio ENQUANTO o numero da loja nao existir. Sem botao e melhor que botao falso. */
    whatsapp: string;
    email: string;
    cnpj: string;
  };
};

export type UpdateStoreSettingsInput = Partial<{
  lojaAberta: boolean;
  enderecoRua: string;
  enderecoNumero: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoUf: string;
  enderecoCep: string;
  horarioSemana: string;
  horarioSabado: string;
  fotoUrl: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cnpj: string;
}>;

/** Colunas de divulgacao. Whitelist explicita, ver nota em getPublicStoreConfig. */
const CAMPOS_VITRINE =
  "loja_aberta, endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, " +
  "endereco_uf, endereco_cep, horario_semana, horario_sabado, foto_url, " +
  "telefone, whatsapp, email, cnpj";

/**
 * Linha do banco -> StoreConfig.
 *
 * Cada campo tem fallback mesmo com as colunas sendo NOT NULL: a linha pode
 * chegar de um banco onde a migration rodou parcialmente, e uma home sem
 * horario e melhor que uma home com "undefined" escrito na tela.
 */
function toStoreConfig(row: Record<string, unknown>): StoreConfig {
  const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    // Comparacao estrita: so o boolean true do Postgres abre a loja. A string
    // "false" (se um dia a coluna virar texto) e truthy em JS e abriria a loja
    // sozinha na home.
    lojaAberta: row.loja_aberta === true,
    endereco: {
      rua: texto(row.endereco_rua),
      numero: texto(row.endereco_numero),
      bairro: texto(row.endereco_bairro),
      cidade: texto(row.endereco_cidade),
      uf: texto(row.endereco_uf),
      cep: texto(row.endereco_cep),
    },
    horarios: {
      semana: texto(row.horario_semana),
      sabado: texto(row.horario_sabado),
    },
    fotoUrl: texto(row.foto_url),
    contato: {
      telefone: texto(row.telefone),
      whatsapp: texto(row.whatsapp),
      email: texto(row.email),
      cnpj: texto(row.cnpj),
    },
  };
}

// =====================================================
// OBTER CONFIGURACOES (ADMIN)
// =====================================================

export const getStoreSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data, error } = await db
        .from("store_settings")
        .select(CAMPOS_VITRINE)
        .eq("id", 1)
        .maybeSingle();

      if (error) return { success: false as const, error: error.message };
      if (!data) {
        return {
          success: false as const,
          error: "store_settings nao tem a linha id=1 (migration aplicada?).",
        };
      }

      return { success: true as const, data: toStoreConfig(data) };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// ATUALIZAR CONFIGURACOES (ADMIN)
// =====================================================

/** camelCase da tela -> coluna do banco. Tambem serve de whitelist. */
const COLUNA_POR_CAMPO = {
  lojaAberta: "loja_aberta",
  enderecoRua: "endereco_rua",
  enderecoNumero: "endereco_numero",
  enderecoBairro: "endereco_bairro",
  enderecoCidade: "endereco_cidade",
  enderecoUf: "endereco_uf",
  enderecoCep: "endereco_cep",
  horarioSemana: "horario_semana",
  horarioSabado: "horario_sabado",
  fotoUrl: "foto_url",
  telefone: "telefone",
  whatsapp: "whatsapp",
  email: "email",
  cnpj: "cnpj",
} as const;

/**
 * Grava as configuracoes da loja. Aceita atualizacao parcial: manda so os
 * campos que mudaram.
 *
 * A UF e normalizada para maiuscula aqui porque a coluna tem
 * CHECK (endereco_uf = '' OR endereco_uf ~ '^[A-Z]{2}$'). Sem isso, um "sp"
 * digitado na tela viraria erro cru do Postgres na cara do admin. O CHECK segue
 * estrito de proposito: e ele que impede lixo de chegar na url do Google Maps.
 *
 * Campos ausentes do input NAO sao tocados — nao existe "salvar tudo" que
 * apague por omissao o que a tela nao carregou.
 */
export const updateStoreSettings = createServerFn({ method: "POST" })
  .validator((d: unknown) => (d ?? {}) as UpdateStoreSettingsInput)
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      const admin = await requireAdmin();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAdminAction, diffSnapshots } = await import("@/lib/admin-audit");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patch: Record<string, any> = {};

      for (const [campo, coluna] of Object.entries(COLUNA_POR_CAMPO)) {
        const valor = (data as Record<string, unknown>)[campo];
        if (valor === undefined) continue;

        if (campo === "lojaAberta") {
          // Coerção explícita: a coluna é BOOLEAN NOT NULL e a string "false"
          // seria truthy se passasse direto.
          patch[coluna] = valor === true;
          continue;
        }

        const texto = typeof valor === "string" ? valor.trim() : "";
        patch[coluna] = campo === "enderecoUf" ? texto.toUpperCase() : texto;
      }

      if (Object.keys(patch).length === 0) {
        return { success: false as const, error: "Nenhum campo para atualizar." };
      }

      const changedKeys = Object.keys(patch);
      const { data: before, error: beforeErr } = await db
        .from("store_settings")
        .select(changedKeys.join(","))
        .eq("id", 1)
        .maybeSingle();
      if (beforeErr) {
        console.warn("[updateStoreSettings] falha ao ler before para auditoria", beforeErr.message);
      }

      const { data: row, error } = await db
        .from("store_settings")
        .update(patch)
        .eq("id", 1)
        .select(CAMPOS_VITRINE)
        .maybeSingle();

      if (error) return { success: false as const, error: error.message };
      if (!row) {
        return {
          success: false as const,
          error: "store_settings nao tem a linha id=1 (migration aplicada?).",
        };
      }

      if (before && row) {
        const diff = diffSnapshots(
          before as Record<string, unknown>,
          row as Record<string, unknown>,
        );
        if (diff) {
          logAdminAction(
            admin,
            "store_settings.update",
            "store_settings",
            "1",
            diff.before,
            diff.after,
          );
        }
      }

      return { success: true as const, data: toStoreConfig(row) };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) return { success: false as const, error: "Não autorizado" };
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// OBTER CONFIGURACOES PUBLICAS (sem auth)
// =====================================================

/**
 * Le a config da loja para a vitrine (home, Contato, rodape). SEM auth.
 *
 * Por que devolve praticamente tudo: nesta tabela todo campo existe PARA ser
 * publicado — endereco, horario e contato ja aparecem hoje (hardcoded) no
 * rodape e na pagina de Contato, CNPJ incluido. O que fica fora e `id` e
 * `updated_at`, que sao mecanica interna.
 *
 * O SELECT continua sendo whitelist explicita (CAMPOS_VITRINE) em vez de
 * `select("*")` de proposito: se um dia alguem acrescentar uma coluna que NAO
 * e para publicar, ela nao vaza por omissao — vai precisar ser adicionada aqui
 * de forma deliberada.
 *
 * Falha (migration nao aplicada, linha ausente) devolve success:false. Quem
 * chama NAO renderiza a secao — a home continua de pe. Migration commitada
 * mas nao rodada ja quebrou feature neste projeto antes.
 */
export const getPublicStoreConfig = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabaseAdmin as any;

      const { data, error } = await db
        .from("store_settings")
        .select(CAMPOS_VITRINE)
        .eq("id", 1)
        .maybeSingle();

      if (error) return { success: false as const, error: error.message };
      if (!data) return { success: false as const, error: "Configuração da loja não encontrada." };

      return { success: true as const, data: toStoreConfig(data) };
    } catch (e: any) {
      return { success: false as const, error: e?.message || "Erro desconhecido" };
    }
  });
