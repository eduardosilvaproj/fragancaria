import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { uploadProductImage, deleteProductImage, type UploadResult } from "@/lib/storage.functions";
import { toast } from "sonner";
import { X, Upload, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
  disabled?: boolean;
}

export function ImageUploader({
  value = [],
  onChange,
  maxImages = 5,
  folder = "products",
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      const fn = useServerFn(deleteProductImage);
      return fn({ data: { path } });
    },
    onSuccess: (result) => {
      if (result?.success && value) {
        onChange?.(value.filter((url) => !url.includes("product-images/") || result.data !== getPathFromUrl(url)));
      }
    },
    onError: () => {
      toast.error("Erro ao deletar imagem");
    },
  });

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || disabled || uploading) return;
      if (value.length >= maxImages) {
        toast.error(`Máximo de ${maxImages} imagens`);
        return;
      }

      setUploading(true);
      const remainingSlots = maxImages - value.length;
      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      const newUrls: string[] = [];

      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} não é uma imagem`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} é maior que 10MB`);
          continue;
        }

        try {
          const base64 = await fileToBase64(file);
          const fn = useServerFn(uploadProductImage);
          const result = await fn({
            data: {
              base64,
              filename: file.name,
              folder,
              contentType: file.type,
            },
          });

          if (result?.success && result.data) {
            newUrls.push(result.data.url);
          } else {
            toast.error(`Erro ao fazer upload de ${file.name}`);
          }
        } catch (e) {
          console.error("Upload error:", e);
          toast.error(`Erro ao fazer upload de ${file.name}`);
        }
      }

      setUploading(false);
      if (newUrls.length > 0) {
        onChange?.([...value, ...newUrls]);
      }
    },
    [value, maxImages, disabled, uploading, folder, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleRemove = useCallback(
    (url: string) => {
      const path = getPathFromUrl(url);
      if (path) {
        deleteMutation.mutate(path);
      }
      onChange?.(value.filter((u) => u !== url));
    },
    [value, onChange, deleteMutation]
  );

  return (
    <div className="space-y-3">
      {/* Preview das imagens */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {value.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded border border-[#E9E1D2] overflow-hidden group"
            >
              <img
                src={url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                disabled={disabled}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 px-1 py-0.5 bg-[#0F3A3E] text-white text-[10px] rounded">
                  Capa
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Área de upload */}
      {value.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          className={cn(
            "border-2 border-dashed border-[#E9E1D2] rounded-lg p-6 text-center transition-colors",
            dragOver && "border-[#B07B1E] bg-amber-50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={disabled || uploading}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className={cn(
              "flex flex-col items-center gap-2 cursor-pointer",
              (disabled || uploading) && "cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-[#B07B1E] animate-spin" />
                <span className="text-sm text-[#8A938E]">Enviando...</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-8 w-8 text-[#B07B1E]" />
                <span className="text-sm text-[#8A938E]">
                  Arraste imagens ou clique para selecionar
                </span>
                <span className="text-xs text-[#8A938E]">
                  JPEG, PNG, WebP • Máx. 10MB
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {/* Info de slots */}
      <p className="text-xs text-[#8A938E]">
        {value.length}/{maxImages} imagens
      </p>
    </div>
  );
}

// Helper para converter arquivo para base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper para extrair path da URL do Supabase
function getPathFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Supabase storage URLs typically have /storage/v1/object/public/bucket/path
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/(.+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }
    return "";
  } catch {
    return "";
  }
}