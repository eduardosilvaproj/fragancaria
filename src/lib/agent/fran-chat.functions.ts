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
  /** Identificador de navegador (UUID do franChatStore). Não é identidade de
   *  pessoa — limpar navegador gera nova sessão. Usado para log de conversas
   *  web e controle de handoff (replied_by). */
  sessionId: z.string().optional(),
  /** Canal de atendimento: 'web' (chat do site) ou 'instagram' (DM). */
  channel: z.enum(["web", "instagram"]).default("web"),
});

export type FranHistoryItem = z.infer<typeof historyItemSchema>;

export type FranChatResult =
  | { success: true; resposta: string; historico: FranHistoryItem[] }
  | { success: false; error: string }
  | { success: false; error: "human_mode"; resposta: string };

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
    },
  },
  {
    name: "trackOrder",
    description:
      "Consulta o status de um pedido. Duas formas de uso: (1) se o cliente tem o tracking_token (código de 16 caracteres do email), passe só o token; (2) se não tem o token, passe orderId + email (email deve bater com o cadastro do pedido). Retorna status, paymentStatus, trackingCode, itens e histórico. Use quando o cliente perguntar 'onde está meu pedido', 'quando chega', 'qual o status'.",
    input_schema: {
      type: "object" as const,
      properties: {
        token: { type: "string", description: "Tracking token de 16 caracteres (formato XXXX-XXXX-XXXX-XXXX). Opcional se orderId+email forem fornecidos." },
        orderId: { type: "string", description: "Número do pedido (ex: 'ORD-12345'). Opcional se token for fornecido." },
        email: { type: "string", description: "Email cadastrado no pedido. Opcional se token for fornecido." },
      },
    },
  },
  {
    name: "getPaymentStatus",
    description:
      "Consulta apenas o status de pagamento de um pedido. Duas formas: (1) tracking_token direto; (2) orderId + email. Retorna string: 'pending', 'paid', 'refunded', 'cancelled', etc. Use quando o cliente perguntar 'já foi pago?', 'o pagamento confirmou?'.",
    input_schema: {
      type: "object" as const,
      properties: {
        token: { type: "string", description: "Tracking token de 16 caracteres. Opcional se orderId+email forem fornecidos." },
        orderId: { type: "string", description: "Número do pedido. Opcional se token for fornecido." },
        email: { type: "string", description: "Email cadastrado no pedido. Opcional se token for fornecido." },
      },
    },
  },
  {
    name: "quoteShipping",
    description:
      "Calcula frete em tempo real via Melhor Envio para um CEP de destino. Precisa dos produtos (id + quantidade) para calcular peso e dimensões. Retorna lista de opções com transportadora, serviço, preço em reais e prazo em dias. Use quando o cliente perguntar 'quanto fica o frete', 'qual o prazo', 'entrega para meu CEP'.",
    input_schema: {
      type: "object" as const,
      properties: {
        toCep: { type: "string", description: "CEP de destino (apenas números, 8 dígitos)." },
        productIds: {
          type: "array",
          description: "Lista de {id, quantity} dos produtos para cotar frete.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Id do produto no catálogo." },
              quantity: { type: "number", description: "Quantidade deste produto." },
            },
            required: ["id", "quantity"],
          },
        },
      },
      required: ["toCep", "productIds"],
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

    // =============================================================
    // Log de conversa web + controle de handoff (replied_by)
    // =============================================================
    // Se sessionId foi enviado, grava/atualiza a conversa no banco.
    // A checagem de replied_by acontece a CADA chamada — se um atendente
    // assumiu (replied_by = 'human'), a Fran não responde.
    let conversationId: string | null = null;
    if (data.sessionId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabaseAdmin as any)
        .from("conversations")
        .select("id, replied_by")
        .eq("session_id", data.sessionId)
        .eq("channel", "web")
        .maybeSingle();

      if (existing) {
        conversationId = existing.id;
        // Checagem de replied_by A CADA mensagem: se human, Fran não responde
        if (existing.replied_by === "human") {
          // Grava a mensagem do cliente no banco antes de retornar
          await (supabaseAdmin as any).from("messages").insert({
            conversation_id: existing.id,
            content: data.mensagem,
            sender: "customer",
            message_type: "text",
            read: false,
          });
          await (supabaseAdmin as any)
            .from("conversations")
            .update({
              last_message: data.mensagem,
              last_message_at: new Date().toISOString(),
              unread: true,
            })
            .eq("id", existing.id);
          return {
            success: false,
            error: "human_mode",
            resposta: "Este atendimento foi assumido por um consultor. Em breve ele(a) responderá.",
          };
        }
      } else {
        // Cria nova conversa web
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: created } = await (supabaseAdmin as any)
          .from("conversations")
          .insert({
            channel: "web",
            session_id: data.sessionId,
            customer_name: "Visitante",
            status: "open",
            replied_by: "fran",
          })
          .select("id")
          .single();
        conversationId = created?.id ?? null;
      }
    }

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { FRAN_SYSTEM_PROMPT } = await import("./fran-persona");
      const { searchProducts, getProduct } = await import("./product-search");
      const { getOrderByToken, getOrderByIdAndEmail } = await import("./order-status");
      const { getPaymentStatusByToken, getPaymentStatusByIdAndEmail } = await import("./order-status");
      const { quoteShipping, buscarProdutosParaCotacao } = await import("./quote-shipping");

      const client = new Anthropic({ apiKey });

      // Monta system prompt com instrução de canal
      const channelInstruction =
        data.channel === "instagram"
          ? "Você está atendendo por mensagem direta no Instagram. A pessoa NÃO está no site. Quando fizer sentido, convide para [www.fragranciaria.com](https://www.fragranciaria.com)."
          : "Você está atendendo pelo chat do site.";
      const system = [
        { type: "text" as const, text: `${FRAN_SYSTEM_PROMPT}\n\n${channelInstruction}`, cache_control: { type: "ephemeral" as const } },
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
            } else if (block.name === "trackOrder") {
              const args = block.input as { token?: string; orderId?: string; email?: string };
              if (args.token) {
                result = await getOrderByToken(supabaseAdmin, args.token);
              } else if (args.orderId && args.email) {
                result = await getOrderByIdAndEmail(supabaseAdmin, args.orderId, args.email);
              } else {
                result = { error: "Informe o tracking_token ou o número do pedido + email." };
              }
            } else if (block.name === "getPaymentStatus") {
              const args = block.input as { token?: string; orderId?: string; email?: string };
              if (args.token) {
                result = await getPaymentStatusByToken(supabaseAdmin, args.token);
              } else if (args.orderId && args.email) {
                result = await getPaymentStatusByIdAndEmail(supabaseAdmin, args.orderId, args.email);
              } else {
                result = { error: "Informe o tracking_token ou o número do pedido + email." };
              }
            } else if (block.name === "quoteShipping") {
              const args = block.input as { toCep: string; productIds: Array<{ id: string; quantity: number }> };
              const produtos = await buscarProdutosParaCotacao(supabaseAdmin, args.productIds);
              result = await quoteShipping(args.toCep, produtos);
            } else {
              result = { error: `Ferramenta desconhecida: ${block.name}` };
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : "erro na ferramenta";
            console.error(`[fran-chat] tool ${block.name} falhou:`, msg, err instanceof Error ? err.stack : "");
            result = { error: msg };
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

      // Grava as mensagens no banco (se for conversa web logada)
      if (conversationId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin as any).from("messages").insert([
          { conversation_id: conversationId, content: data.mensagem, sender: "customer" },
          { conversation_id: conversationId, content: respostaFinal, sender: "agent" },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabaseAdmin as any)
          .from("conversations")
          .update({
            last_message: respostaFinal,
            last_message_at: new Date().toISOString(),
            unread: true,
          })
          .eq("id", conversationId);
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
