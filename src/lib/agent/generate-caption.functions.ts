import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Geração de legenda para redes sociais via Claude. Server-only (ANTHROPIC_API_KEY
// fica no servidor). Rate-limit por IP admin: 60 chamadas / 10 min.

const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 600;

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
  tema: z.string().min(1).max(2000),
  tom: z.enum(["casual", "profissional", "divertido"]),
  plataforma: z.enum(["instagram", "facebook", "twitter"]),
  productId: z.string().optional(),
});

export type GenerateCaptionInput = z.infer<typeof inputSchema>;

export type GenerateCaptionResult =
  | { success: true; caption: string }
  | { success: false; error: string };

const SYSTEM_PROMPT = `Você é um redator especializado em redes sociais para uma loja de cosméticos capilares chamada Fragranciaria.
Sua função é gerar legendas curtas, persuasivas e adaptadas para cada plataforma.

REGRAS GERAIS:
- Escreva em português brasileiro natural e envolvente
- Use emojis com moderação (1-3 no máximo, a menos que o tom "divertido" permita até 5)
- Inclua 3-5 hashtags relevantes no final
- NÃO use placeholders como [PRODUTO] ou [BENEFÍCIO] — escreva o texto completo e pronto
- NÃO invente informações sobre produtos que não foram fornecidos
- A legenda deve ter entre 80 e 300 caracteres (sem contar hashtags)
- Termine com um call-to-action sutil (ex: "Link na bio", "Conta nos comentários", "Salva pra depois")

POR PLATAFORMA:
- instagram: tom visual, hashtags no final, CTA de engajamento ou link na bio
- facebook: um pouco mais longo, tom de conversa, pode incluir perguntas
- twitter: curto e direto, máximo 280 caracteres, hashtags opcionais

POR TOM:
- casual: natural, como se uma amiga estivesse recomendando
- profissional: elegante, foco em qualidade e resultados, linguagem técnica mas acessível
- divertido: descontraído, brincadeiras leves, emojis liberados, pontuação criativa

Se dados de produto forem fornecidos (nome, preço, descrição, marca), use APENAS informações reais — nunca invente preço, desconto ou características.`;

export const generateCaption = createServerFn({ method: "POST" })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<GenerateCaptionResult> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { success: false, error: "ANTHROPIC_API_KEY não configurada no servidor." };
    }

    // Rate-limit por IP (admin — 60 chamadas / 10 min)
    const rl = rateLimit("generateCaption", RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return {
        success: false,
        error: `Muitas tentativas. Tente novamente em ${rl.retryAfterSeconds} segundos.`,
      };
    }

    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const { getProduct } = await import("./product-search");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      let productInfo = "";
      if (data.productId) {
        const product = await getProduct(supabaseAdmin, data.productId);
        if (product) {
          productInfo = [
            `Produto: ${product.name}`,
            product.brand ? `Marca: ${product.brand}` : "",
            `Preço: R$ ${product.price.toFixed(2)}`,
            product.description ? `Descrição: ${product.description}` : "",
            product.category ? `Categoria: ${product.category}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        }
      }

      const userPrompt = [
        `Plataforma: ${data.plataforma}`,
        `Tom: ${data.tom}`,
        `Tema: ${data.tema}`,
        productInfo ? `\nDados do produto:\n${productInfo}` : "",
        "\nGere a legenda completa (texto + hashtags) pronta para publicação:",
      ]
        .filter(Boolean)
        .join("\n");

      const client = new Anthropic({ apiKey });

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          { type: "text" as const, text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const caption = response.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!caption) {
        return { success: false, error: "Não foi possível gerar a legenda. Tente novamente." };
      }

      return { success: true, caption };
    } catch (err) {
      console.error("[generateCaption] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });
