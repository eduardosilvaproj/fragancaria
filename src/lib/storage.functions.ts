import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Tipos para resposta de upload
export type UploadResult = {
  url: string;
  path: string;
  filename: string;
};

// =====================================================
// UPLOAD DE IMAGEM (server-side)
// =====================================================

const UploadSchema = z.object({
  base64: z.string().min(1, "Arquivo vazio"),
  filename: z.string().min(1, "Nome do arquivo obrigatório"),
  folder: z.string().default("products"),
  contentType: z.string().default("image/jpeg"),
});

export const uploadProductImage = createServerFn({ method: "POST" })
  .validator((d: unknown) => UploadSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = data.filename.split(".").pop() || "jpg";
      const cleanName = data.filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-");
      const filename = `${data.folder}/${timestamp}-${randomStr}-${cleanName}.${ext}`;

      // Converter base64 para buffer
      const base64Data = data.base64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from("product-images")
        .upload(filename, buffer, {
          contentType: data.contentType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[storage] Upload error:", uploadError);
        return { success: false, error: uploadError.message };
      }

      // Obter URL pública
      const { data: urlData } = supabaseAdmin.storage
        .from("product-images")
        .getPublicUrl(filename);

      return {
        success: true,
        data: {
          url: urlData.publicUrl,
          path: filename,
          filename: data.filename,
        },
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[storage] Exception:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// DELETAR IMAGEM (server-side)
// =====================================================

const DeleteSchema = z.object({
  path: z.string().min(1, "Caminho obrigatório"),
});

export const deleteProductImage = createServerFn({ method: "DELETE" })
  .validator((d: unknown) => DeleteSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { error } = await supabaseAdmin.storage
        .from("product-images")
        .remove([data.path]);

      if (error) {
        console.error("[storage] Delete error:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[storage] Exception:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// LISTAR ARQUIVOS (server-side)
// =====================================================

const ListSchema = z.object({
  folder: z.string().default("products"),
  limit: z.number().default(100),
});

export const listProductImages = createServerFn({ method: "GET" })
  .validator((d: unknown) => ListSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: files, error } = await supabaseAdmin.storage
        .from("product-images")
        .list(data.folder, {
          limit: data.limit,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.error("[storage] List error:", error);
        return { success: false, error: error.message };
      }

      // Adicionar URLs públicas
      const filesWithUrls = (files || []).map((file) => {
        const path = `${data.folder}/${file.name}`;
        const { data: urlData } = supabaseAdmin.storage
          .from("product-images")
          .getPublicUrl(path);
        return {
          ...file,
          url: urlData.publicUrl,
          path,
        };
      });

      return { success: true, data: filesWithUrls };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[storage] Exception:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });

// =====================================================
// UPLOAD DE MÚLTIPLAS IMAGENS
// =====================================================

const MultiUploadSchema = z.object({
  images: z.array(z.object({
    base64: z.string().min(1),
    filename: z.string().min(1),
    contentType: z.string().default("image/jpeg"),
  })).min(1).max(10),
  folder: z.string().default("products"),
});

export const uploadMultipleImages = createServerFn({ method: "POST" })
  .validator((d: unknown) => MultiUploadSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { requireAdmin } = await import("@/lib/admin-auth");
      await requireAdmin();

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const results: Array<{ filename: string; url: string; path: string; error?: string }> = [];

      for (const img of data.images) {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = img.filename.split(".").pop() || "jpg";
        const cleanName = img.filename.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-");
        const filename = `${data.folder}/${timestamp}-${randomStr}-${cleanName}.${ext}`;

        const base64Data = img.base64.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const { error } = await supabaseAdmin.storage
          .from("product-images")
          .upload(filename, buffer, {
            contentType: img.contentType,
            upsert: false,
          });

        if (error) {
          results.push({ filename: img.filename, url: "", path: "", error: error.message });
          continue;
        }

        const { data: urlData } = supabaseAdmin.storage
          .from("product-images")
          .getPublicUrl(filename);

        results.push({ filename: img.filename, url: urlData.publicUrl, path: filename });
      }

      const allSuccess = results.every((r) => !r.error);

      return {
        success: allSuccess,
        data: results,
        partial: !allSuccess && results.some((r) => !r.error),
      };
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        return { success: false, error: "Não autorizado" };
      }
      console.error("[storage] Exception:", e);
      return { success: false, error: e?.message || "Erro desconhecido" };
    }
  });