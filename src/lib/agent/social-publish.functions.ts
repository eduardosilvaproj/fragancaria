import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createZernioPost, deleteZernioPost } from "@/lib/zernio";

// Tipos locais (social_posts não está no database.types.ts)
export interface SocialPost {
  id: string;
  platform: "instagram" | "facebook" | "twitter";
  content: string;
  image_url: string | null;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduled_for: string | null;
  published_at: string | null;
  error_message: string | null;
  zernio_post_id: string | null;
  created_at: string;
  updated_at: string;
}

// Schema para publicar/agendar
const publishSchema = z.object({
  content: z.string().min(1).max(2000),
  imageUrl: z.string().optional(),
  platform: z.enum(["instagram", "facebook", "twitter"]),
  scheduledFor: z.string().optional(), // ISO string — se omitido, publica agora
});

export type PublishInput = z.infer<typeof publishSchema>;

export type PublishResult =
  | { success: true; post: SocialPost }
  | { success: false; error: string };

/**
 * Salva um post como rascunho no Supabase (sem publicar).
 */
export const saveDraft = createServerFn({ method: "POST" })
  .validator((d: unknown) => publishSchema.parse(d))
  .handler(async ({ data }): Promise<PublishResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: post, error } = await supabaseAdmin
        .from("social_posts")
        .insert({
          platform: data.platform,
          content: data.content,
          image_url: data.imageUrl ?? null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, post: post as unknown as SocialPost };
    } catch (err) {
      console.error("[saveDraft] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });

/**
 * Publica imediatamente via Zernio e salva no Supabase.
 */
export const publishNow = createServerFn({ method: "POST" })
  .validator((d: unknown) => publishSchema.parse(d))
  .handler(async ({ data }): Promise<PublishResult> => {
    try {
      const accountId = process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID;
      if (!accountId) {
        return { success: false, error: "ZERNIO_INSTAGRAM_ACCOUNT_ID não configurado." };
      }

      // Publica via Zernio
      const zernioPost = await createZernioPost({
        content: data.content,
        imageUrl: data.imageUrl,
        platform: data.platform,
        accountId,
      });

      // Salva no Supabase
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: post, error } = await supabaseAdmin
        .from("social_posts")
        .insert({
          platform: data.platform,
          content: data.content,
          image_url: data.imageUrl ?? null,
          status: "published",
          zernio_post_id: zernioPost.id,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, post: post as unknown as SocialPost };
    } catch (err) {
      console.error("[publishNow] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });

/**
 * Agenda um post via Zernio e salva no Supabase.
 */
export const schedulePost = createServerFn({ method: "POST" })
  .validator((d: unknown) => publishSchema.extend({
    scheduledFor: z.string().min(1, "Data de agendamento é obrigatória"),
  }).parse(d))
  .handler(async ({ data }): Promise<PublishResult> => {
    try {
      const accountId = process.env.ZERNIO_INSTAGRAM_ACCOUNT_ID;
      if (!accountId) {
        return { success: false, error: "ZERNIO_INSTAGRAM_ACCOUNT_ID não configurado." };
      }

      // Agenda via Zernio
      const zernioPost = await createZernioPost({
        content: data.content,
        imageUrl: data.imageUrl,
        platform: data.platform,
        accountId,
        scheduledFor: data.scheduledFor,
      });

      // Salva no Supabase
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: post, error } = await supabaseAdmin
        .from("social_posts")
        .insert({
          platform: data.platform,
          content: data.content,
          image_url: data.imageUrl ?? null,
          status: "scheduled",
          scheduled_for: data.scheduledFor,
          zernio_post_id: zernioPost.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { success: true, post: post as unknown as SocialPost };
    } catch (err) {
      console.error("[schedulePost] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });

/**
 * Lista posts do Supabase (para a aba Agendamentos).
 */
export const listPosts = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ posts: SocialPost[] } | { error: string }> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin
        .from("social_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return { posts: (data ?? []) as unknown as SocialPost[] };
    } catch (err) {
      console.error("[listPosts] erro:", err instanceof Error ? err.message : err);
      return { error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });

/**
 * Cancela um post agendado no Zernio e marca como failed no Supabase.
 */
export const cancelPost = createServerFn({ method: "POST" })
  .validator((d: unknown) => z.object({
    id: z.string(),
    zernioPostId: z.string(),
  }).parse(d))
  .handler(async ({ data }): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      await deleteZernioPost(data.zernioPostId);

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("social_posts")
        .update({ status: "failed", error_message: "Cancelado pelo usuário" })
        .eq("id", data.id);

      if (error) throw new Error(error.message);
      return { success: true };
    } catch (err) {
      console.error("[cancelPost] erro:", err instanceof Error ? err.message : err);
      return { success: false, error: err instanceof Error ? err.message : "erro desconhecido" };
    }
  });
