import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { ART_DIRECTOR_SYSTEM_PROMPT, buildArtPrompt } from "@/lib/agent/art-director";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const startInputSchema = z.object({
  prompt: z.string().min(1).max(2000),
  productId: z.string().optional(),
  productName: z.string().optional(),
  productBrand: z.string().optional(),
  productDescription: z.string().optional(),
  caption: z.string().optional(),
  modo: z.enum(["produto", "dica", "livre"]).optional(),
});

const pollInputSchema = z.object({
  jobId: z.string().uuid(),
});

export type StartImageInput = z.infer<typeof startInputSchema>;

export type StartImageResult =
  | { success: true; jobId: string }
  | { success: false; error: string };

export type PollImageResult =
  | { success: true; status: "pending" | "processing" | "ready" | "failed"; url?: string; error?: string }
  | { success: false; error: string };

async function stampLogo(imageBuffer: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const fs = await import("fs/promises");
  const path = await import("path");
  const url = await import("url");

  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(__dirname, "..", "client", "images", "logo.png"),
    path.resolve(process.cwd(), "dist", "client", "images", "logo.png"),
    path.resolve(process.cwd(), "public", "images", "logo.png"),
  ];

  let logoBuffer: Buffer | null = null;
  for (const p of candidates) {
    try {
      logoBuffer = await fs.readFile(p);
      break;
    } catch {
      // try next
    }
  }

  if (!logoBuffer) {
    console.error("[stampLogo] LOGO NÃO ENCONTRADO. Tentados:", candidates.join(", "));
    return imageBuffer;
  }

  const imageMeta = await sharp(imageBuffer).metadata();
  const imgWidth = imageMeta.width ?? 1024;
  const imgHeight = imageMeta.height ?? 1024;

  const logoWidth = Math.round(imgWidth * 0.25);

  const resizedLogo = await sharp(logoBuffer)
    .resize(logoWidth, null, { fit: "inside", withoutEnlargement: true })
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();

  const margin = Math.round(imgWidth * 0.05);
  const left = margin;
  const top = margin;

  return sharp(imageBuffer)
    .composite([{ input: resizedLogo, top, left }])
    .toBuffer();
}

async function runGeneration(jobId: string, data: z.infer<typeof startInputSchema>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    // Marca como processing
    await supabaseAdmin
      .from("ai_image_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      await supabaseAdmin
        .from("ai_image_jobs")
        .update({ status: "failed", error: "OPENAI_API_KEY não configurada.", updated_at: new Date().toISOString() })
        .eq("id", jobId);
      return;
    }

    // Prepara o prompt com o diretor de arte
    let finalPrompt = data.prompt;
    if (data.caption) {
      const product = data.productName
        ? { name: data.productName, brand: data.productBrand, description: data.productDescription }
        : null;
      const artPrompt = buildArtPrompt(product, data.caption, data.modo ?? "produto");
      finalPrompt = artPrompt;
    }

    const OpenAI = (await import("openai")).default;
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
          quality: "hd",
        },
      ],
      tool_choice: { type: "image_generation" },
    });

    const genCall = response.output?.find(
      (item): item is { type: "image_generation_call"; result: string } =>
        item.type === "image_generation_call" && typeof (item as any).result === "string"
    );

    if (!genCall?.result) {
      await supabaseAdmin
        .from("ai_image_jobs")
        .update({ status: "failed", error: "OpenAI não retornou imagem.", updated_at: new Date().toISOString() })
        .eq("id", jobId);
      return;
    }

    const base64Data = genCall.result.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

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
      await supabaseAdmin
        .from("ai_image_jobs")
        .update({ status: "failed", error: uploadError.message, updated_at: new Date().toISOString() })
        .eq("id", jobId);
      return;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(filename);

    await supabaseAdmin
      .from("ai_image_jobs")
      .update({ status: "ready", result_url: urlData.publicUrl, updated_at: new Date().toISOString() })
      .eq("id", jobId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "erro desconhecido";
    console.error("[runGeneration] erro:", msg);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("ai_image_jobs")
      .update({ status: "failed", error: msg, updated_at: new Date().toISOString() })
      .eq("id", jobId);
  }
}

export const startImageGeneration = createServerFn({ method: "POST" })
  .validator((d: unknown) => startInputSchema.parse(d))
  .handler(async ({ data }): Promise<StartImageResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OPENAI_API_KEY não configurada no servidor." };
    }

    const rl = rateLimit("startImageGeneration", RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return {
        success: false,
        error: `Muitas tentativas. Tente novamente em ${rl.retryAfterSeconds} segundos.`,
      };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: job, error: insertError } = await supabaseAdmin
        .from("ai_image_jobs")
        .insert({
          status: "pending",
          prompt: data.prompt,
          product_id: data.productId,
          product_name: data.productName,
          product_brand: data.productBrand,
          product_description: data.productDescription,
          caption: data.caption,
          modo: data.modo,
        })
        .select("id")
        .single();

      if (insertError || !job) {
        return { success: false, error: insertError?.message ?? "Erro ao criar job." };
      }

      // Dispara a geração em background (não aguarda)
      runGeneration(job.id, data);

      return { success: true, jobId: job.id };
    } catch (err) {
      console.error("[startImageGeneration] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });

export const pollImageGeneration = createServerFn({ method: "GET" })
  .validator((d: unknown) => pollInputSchema.parse(d))
  .handler(async ({ data }): Promise<PollImageResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: job, error } = await supabaseAdmin
        .from("ai_image_jobs")
        .select("status, result_url, error, created_at")
        .eq("id", data.jobId)
        .single();

      if (error || !job) {
        return { success: false, error: error?.message ?? "Job não encontrado." };
      }

      // Timeout automático: jobs stuck em pending/processing > 10 min viram failed
      const STUCK_TIMEOUT_MS = 10 * 60 * 1000;
      if (
        (job.status === "pending" || job.status === "processing") &&
        job.created_at &&
        Date.now() - new Date(job.created_at).getTime() > STUCK_TIMEOUT_MS
      ) {
        await supabaseAdmin
          .from("ai_image_jobs")
          .update({
            status: "failed",
            error: "Tempo limite excedido (10 min). O job ficou preso em " + job.status + ".",
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.jobId);

        return {
          success: true,
          status: "failed",
          error: "Tempo limite excedido (10 min). O job ficou preso em " + job.status + ".",
        };
      }

      return {
        success: true,
        status: job.status as "pending" | "processing" | "ready" | "failed",
        url: job.result_url ?? undefined,
        error: job.error ?? undefined,
      };
    } catch (err) {
      console.error("[pollImageGeneration] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });
