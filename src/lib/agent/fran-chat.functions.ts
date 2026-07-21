import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Cérebro da Fran: loop de tool-use síncrono, dentro da storefront (sem serviço
// separado, sem webhook — site-first). Todos os imports server-only (SDK,
// supabaseAdmin, persona, tools) são dinâmicos DENTRO do .handler() — assim a
// ANTHROPIC_API_KEY (process.env, nunca VITE_) fica fora do bundle do cliente.
// Verificado por grep no dist/client/ (ver CLAUDE.md, regra de chave LLM).
//
// Proteção contra abuso (público):
//   - Rate-limit por IP: 30 chamadas / 10 min (teto duro de custo)
//   - Teto de histórico: 50k chars totais (evita inflação de tokens)
//   - Limite UX de 25 msg/sessão no widget (client-side, nudge)

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 5;

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const MAX_HISTORY_CHARS = 50_000;

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const inputSchema = z.object({
  mensagem: z.string().min(1).max(4000),
  historico: z.array(historyItemSchema).max(50).default([]),
});

export type FranHistoryItem = z.infer<typeof historyItemSchema>;

export type FranChatResult =
  | { success: true; resposta: string; historico: FranHistoryItem[] }
  | { success: false; error: string };

const TOOLS = [
  {
    name: "searchProducts",
    description:
      "Busca produtos no catálogo REAL da loja por termo livre (nome, marca, tipo de cabelo, necessidade). Use antes de indicar qualquer produto. Retorna id, name, brand, price, inStock, quantity, description, category, tags. Termo vazio navega o catálogo.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Termo de busca em português (ex: 'hidratação cacheado', 'wella nutritivo')." },
        limit: { type: "number", description: "Máximo de produtos a retornar (padrão 5)." },
      },
      required: ["query"],
    },
  },
  {
    name: "getProduct",
    description:
      "Detalha um produto específico pelo id (do resultado de searchProducts). Retorna null se não existir ou estiver inativo.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Id do produto." },
      },
      required: ["id"],
      // cache_control no último tool cacheia o prefixo de tools (fixo).
      // (posicionado aqui via anexação abaixo)
    },
  },
];

export const chatWithFran = createServerFn({ method: "POST" })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<FranChatResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { success: false, error: "ANTHROPIC_API_KEY não configurada no servidor." };
    }

    // Rate-limit por IP (teto duro de custo — 30 chamadas / 10 min)
    const ip =
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      "unknown";
    const rl = rateLimit(`fran:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return {
        success: false,
        error: `Muitas tentativas. Tente novamente em ${rl.retryAfterSeconds} segundos.`,
      };
    }

    // Teto de tamanho total do histórico (evita inflação de tokens)
    const totalChars = data.historico.reduce((acc, m) => acc + m.content.length, 0);
    if (totalChars > MAX_HISTORY_CHARS) {
      return { success: false, error: "Histórico muito longo. Inicie uma nova conversa." };
    }

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { FRAN_SYSTEM_PROMPT } = await import("./fran-persona");
      const { searchProducts, getProduct } = await import("./product-search");

      const client = new Anthropic({ apiKey });

      // system + tools são fixos → cache_control ephemeral derruba custo de input.
      const system = [
        { type: "text" as const, text: FRAN_SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } },
      ];
      const tools = TOOLS.map((tool, i) =>
        i === TOOLS.length - 1 ? { ...tool, cache_control: { type: "ephemeral" as const } } : tool,
      );

      // messages interno carrega os round-trips de tool; o cliente só vê texto.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = [
        ...data.historico.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: data.mensagem },
      ];

      let respostaFinal = "";

      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          tools,
          messages,
        });

        if (response.stop_reason !== "tool_use") {
          respostaFinal = response.content
            .filter((block): block is { type: "text"; text: string } => block.type === "text")
            .map((block) => block.text)
            .join("\n")
            .trim();
          break;
        }

        // Executa cada tool pedida e devolve os resultados no próximo turno.
        messages.push({ role: "assistant", content: response.content });

        const toolResults = [];
        for (const block of response.content) {
          if (block.type !== "tool_use") continue;
          let result: unknown;
          try {
            if (block.name === "searchProducts") {
              const args = block.input as { query: string; limit?: number };
              result = await searchProducts(supabaseAdmin, { query: args.query, limit: args.limit });
            } else if (block.name === "getProduct") {
              const args = block.input as { id: string };
              result = await getProduct(supabaseAdmin, args.id);
            } else {
              result = { error: `Ferramenta desconhecida: ${block.name}` };
            }
          } catch (err) {
            result = { error: err instanceof Error ? err.message : "erro na ferramenta" };
          }
          toolResults.push({
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        messages.push({ role: "user", content: toolResults });
      }

      if (!respostaFinal) {
        return { success: false, error: "A Fran não conseguiu formular uma resposta. Tente reformular." };
      }

      return {
        success: true,
        resposta: respostaFinal,
        historico: [
          ...data.historico,
          { role: "user", content: data.mensagem },
          { role: "assistant", content: respostaFinal },
        ],
      };
    } catch (err) {
      console.error("[chatWithFran] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });
