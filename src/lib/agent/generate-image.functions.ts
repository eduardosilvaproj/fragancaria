import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const inputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  productId: z.string().optional(),
});

export type GenerateImageInput = z.infer<typeof inputSchema>;

export type GenerateImageResult =
  | { success: true; url: string }
  | { success: false; error: string };

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

      const client = new OpenAI({ apiKey });

      const response = await client.responses.create({
        model: "gpt-5.6",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: data.prompt },
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

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const slug = data.productId
        ? data.productId.replace(/[^a-zA-Z0-9]/g, "-")
        : "ai";
      const filename = `ai-generated/${timestamp}-${randomStr}-${slug}.webp`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(filename, buffer, {
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
