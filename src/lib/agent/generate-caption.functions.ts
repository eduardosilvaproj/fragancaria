import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

// Geração de legenda para redes sociais via OpenAI Responses API.
// Server-only (OPENAI_API_KEY fica no servidor).
// Rate-limit por IP admin: 60 chamadas / 10 min.

const MODEL = "gpt-4o";
const MAX_TOKENS = 600;

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
  tema: z.string().min(1).max(2000),
  tom: z.enum(["casual", "profissional", "divertido"]),
  plataforma: z.enum(["instagram", "facebook", "twitter"]),
  modo: z.enum(["produto", "dica", "livre"]),
  productId: z.string().optional(),
  semPreco: z.boolean().optional().default(false),
});

export type GenerateCaptionInput = z.infer<typeof inputSchema>;

export type GenerateCaptionResult =
  | { success: true; caption: string }
  | { success: false; error: string };

const SYSTEM_PROMPT_BASE = `Você é um redator especializado em redes sociais para uma loja de cosméticos capilares chamada Fragranciaria.
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
- divertido: descontraído, brincadeiras leves, emojis liberados, pontuação criativa`;

const MODO_PRODUTO_INSTAGRAM = `${SYSTEM_PROMPT_BASE}

MODO: PRODUTO — INSTAGRAM
Você está divulgando um produto específico da loja. Use os dados reais do produto fornecidos (nome, preço, descrição, marca) — nunca invente preço, desconto ou características. Destaque os benefícios do produto de forma persuasiva.
IMPORTANTE: Termine a legenda com um CTA como "🔗 O link do nosso site está na bio — venha conhecer todos os nossos produtos!" e NÃO inclua URL alguma. No Instagram, links em legendas não são clicáveis.`;

const MODO_PRODUTO_OUTRAS = `${SYSTEM_PROMPT_BASE}

MODO: PRODUTO — FACEBOOK / TWITTER
Você está divulgando um produto específico da loja. Use os dados reais do produto fornecidos (nome, preço, descrição, marca) — nunca invente preço, desconto ou características. Destaque os benefícios do produto de forma persuasiva.
IMPORTANTE: Termine a legenda com um call-to-action de compra seguido do link direto do produto (ex: "Corre comprar! https://fragranciaria.com/produto/ID_DO_PRODUTO"). O link exato será fornecido nos dados do produto.`;

const MODO_DICA = `${SYSTEM_PROMPT_BASE}

MODO: DICA EDUCATIVA
Você está criando uma dica educativa sobre cuidados capilares. O tema foi fornecido pelo usuário. Gere conteúdo útil e educativo que ajude o seguidor a aprender algo novo sobre cabelo. Não mencione produtos específicos a menos que o tema explicitamente peça. Foco em ensinar, não em vender.`;

const MODO_LIVRE = `${SYSTEM_PROMPT_BASE}

MODO: TEMA LIVRE
Você está criando conteúdo sobre o tema fornecido pelo usuário. Pode ser sobre cuidados capilares, tendências, curiosidades ou qualquer assunto relacionado ao universo de beleza e cabelos. Seja criativo e engajante.`;

function getSystemPrompt(modo: string, plataforma: string): string {
  if (modo === "produto") {
    return plataforma === "instagram" ? MODO_PRODUTO_INSTAGRAM : MODO_PRODUTO_OUTRAS;
  }
  switch (modo) {
    case "dica": return MODO_DICA;
    default: return MODO_LIVRE;
  }
}

export const generateCaption = createServerFn({ method: "POST" })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<GenerateCaptionResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENAI_API_KEY não configurada no servidor." };
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
      const OpenAI = (await import("openai")).default;
      const { getProduct } = await import("./product-search");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      let productInfo = "";
      if (data.productId) {
        const product = await getProduct(supabaseAdmin, data.productId);
        if (product) {
          const lines = [
            `Produto: ${product.name}`,
            product.brand ? `Marca: ${product.brand}` : "",
            product.description ? `Descrição: ${product.description}` : "",
            product.category ? `Categoria: ${product.category}` : "",
            `Link: https://fragranciaria.com/produto/${data.productId}`,
          ];
          if (!data.semPreco) {
            lines.splice(2, 0, `Preço: R$ ${product.price.toFixed(2)}`);
          }
          productInfo = lines.filter(Boolean).join("\n");
        }
      }

      const systemPrompt = getSystemPrompt(data.modo, data.plataforma);

      const userPrompt = [
        `Modo: ${data.modo}`,
        `Plataforma: ${data.plataforma}`,
        `Tom: ${data.tom}`,
        `Tema: ${data.tema}`,
        productInfo ? `\nDados do produto:\n${productInfo}` : "",
        "\nGere a legenda completa (texto + hashtags) pronta para publicação:",
      ]
        .filter(Boolean)
        .join("\n");

      const client = new OpenAI({ apiKey });

      const response = await client.responses.create({
        model: MODEL,
        instructions: systemPrompt,
        input: userPrompt,
        max_output_tokens: MAX_TOKENS,
      });

      const caption = response.output_text?.trim();

      if (!caption) {
        return { success: false, error: "Não foi possível gerar a legenda. Tente novamente." };
      }

      return { success: true, caption };
    } catch (err) {
      console.error("[generateCaption] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });
