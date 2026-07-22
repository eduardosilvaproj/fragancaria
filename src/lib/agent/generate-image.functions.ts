import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { ART_DIRECTOR_SYSTEM_PROMPT, buildArtPrompt } from "@/lib/agent/art-director";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  productId: z.string().optional(),
  productName: z.string().optional(),
  productBrand: z.string().optional(),
  productDescription: z.string().optional(),
  caption: z.string().optional(),
  modo: z.enum(["produto", "dica", "livre"]).optional(),
});

export type GenerateImageInput = z.infer<typeof inputSchema>;

export type GenerateImageResult =
  | { success: true; url: string }
  | { success: false; error: string };

async function stampLogo(imageBuffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const fs = await import("fs/promises");
  const path = await import("path");
  const url = await import("url");

  // O logo está em public/images/logo.png (dev) → copiado para dist/client/images/logo.png (build).
  // O servidor roda de dist/server/index.js. Tentamos os dois caminhos.
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(__dirname, "..", "client", "images", "logo.png"),
    path.resolve(process.cwd(), "dist", "client", "images", "logo.png"),
    path.resolve(process.cwd(), "public", "images", "logo.png"),
  ];

  let logoBuffer: Buffer | null = null;
  let usedPath = "";
  for (const p of candidates) {
    try {
      logoBuffer = await fs.readFile(p);
      usedPath = p;
      break;
    } catch {
      // try next
    }
  }

  if (!logoBuffer) {
    console.error("[stampLogo] LOGO NÃO ENCONTRADO. Tentados:", candidates.join(", "));
    // Não carimba, mas retorna a imagem original em vez de quebrar
    return imageBuffer;
  }

  const imageMeta = await sharp(imageBuffer).metadata();
  const imgWidth = imageMeta.width ?? 1024;
  const imgHeight = imageMeta.height ?? 1024;

  // Logo redimensionado para ~25% da largura da imagem
  const logoWidth = Math.round(imgWidth * 0.25);

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoWidth, null, { fit: "inside", withoutEnlargement: true })
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();

  // Posição: topo esquerdo com margem de ~5% da largura
  const margin = Math.round(imgWidth * 0.05);
  const left = margin;
  const top = margin;

  return sharp(imageBuffer)
    .composite([{ input: resizedLogo, top, left }])
    .toBuffer();
}

export const generateImage = createServerFn({ method: "POST" })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<GenerateImageResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENAI_API_KEY não configurada no servidor." };
    }

    const rl = rateLimit("generateImage", RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return {
        success: false,
        error: `Muitas tentativas. Tente novamente em ${rl.retryAfterSeconds} segundos.`,
      };
    }

    try {
      const OpenAI = (await import("openai")).default;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Se veio com dados de produto/caption, usa o diretor de arte para gerar o prompt
      let finalPrompt = data.prompt;
      if (data.caption) {
        const product = data.productName
          ? { name: data.productName, brand: data.productBrand, description: data.productDescription }
          : null;
        const artPrompt = buildArtPrompt(product, data.caption, data.modo ?? "produto");
        finalPrompt = artPrompt;
      }

      const client = new OpenAI({ apiKey });

      const response = await client.responses.create({
        model: "gpt-5.6",
        input: [
          {
            role: "system",
            content: ART_DIRECTOR_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: finalPrompt },
            ],
          },
        ],
        tools: [
          {
            type: "image_generation",
            output_format: "webp",
            quality: "high",
          },
        ],
        tool_choice: { type: "image_generation" },
      });

      const genCall = response.output?.find(
        (item): item is { type: "image_generation_call"; result: string } =>
          item.type === "image_generation_call" && typeof (item as any).result === "string"
      );

      if (!genCall?.result) {
        return { success: false, error: "OpenAI não retornou imagem." };
      }

      const base64Data = genCall.result.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Carimba o logo
      const stampedBuffer = await stampLogo(buffer);

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const slug = data.productId
        ? data.productId.replace(/[^a-zA-Z0-9]/g, "-")
        : "ai";
      const filename = `ai-generated/${timestamp}-${randomStr}-${slug}.webp`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(filename, stampedBuffer, {
          contentType: "image/webp",
          upsert: false,
        });

      if (uploadError) {
        console.error("[generateImage] Upload error:", uploadError);
        return { success: false, error: uploadError.message };
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("product-images")
        .getPublicUrl(filename);

      return { success: true, url: urlData.publicUrl };
    } catch (err) {
      console.error("[generateImage] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });
