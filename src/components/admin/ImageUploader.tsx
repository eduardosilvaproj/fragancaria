import { useCallback, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { uploadProductImage, deleteProductImage, type UploadResult } from "@/lib/storage.functions";
import { toast } from "sonner";
import { X, Upload, Loader2, ImagePlus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageSelector } from "./ImageSelector";

interface ImageUploaderProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
  disabled?: boolean;
  searchQuery?: string; // texto (nome + marca) para buscar imagens
}

export function ImageUploader({
  value = [],
  onChange,
  maxImages = 5,
  folder = "products",
  disabled = false,
  searchQuery,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showMLSelector, setShowMLSelector] = useState(false);

  const uploadFn = useServerFn(uploadProductImage);
  const deleteFn = useServerFn(deleteProductImage);

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      return deleteFn({ data: { path } });
    },
    onSuccess: (result: { success: boolean }) => {
      if (result?.success && value) {
        onChange?.(value.filter((url) => !url.includes("product-images/")));
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
          const result = await uploadFn({
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

  const handleSetCover = useCallback(
    (index: number) => {
      if (index === 0 || disabled) return;
      const newList = [...value];
      const [item] = newList.splice(index, 1);
      newList.unshift(item);
      onChange?.(newList);
      toast.success("Imagem de capa definida!");
    },
    [value, onChange, disabled]
  );

  const handleMove = useCallback(
    (index: number, direction: "left" | "right") => {
      if (disabled) return;
      const targetIndex = direction === "left" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= value.length) return;

      const newList = [...value];
      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;
      onChange?.(newList);
    },
    [value, onChange, disabled]
  );

  return (
    <div className="space-y-3">
      {/* Preview das imagens */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {value.map((url, index) => {
            const isCover = index === 0;
            return (
              <div
                key={url}
                className={cn(
                  "relative aspect-square rounded border overflow-hidden group transition-all",
                  isCover ? "border-2 border-[#B07B1E] ring-1 ring-[#B07B1E]/20" : "border-[#E9E1D2]"
                )}
              >
                <img
                  src={url}
                  alt={`Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Camada hoverable de interações */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                  <div className="flex justify-between items-start w-full">
                    {/* Botões de reordenação */}
                    <div className="flex gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          title="Mover para esquerda"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(index, "left");
                          }}
                          className="p-1 bg-white/90 hover:bg-white text-[#0F3A3E] rounded transition-colors"
                        >
                          <span className="text-[10px] font-bold">◀</span>
                        </button>
                      )}
                      {index < value.length - 1 && (
                        <button
                          type="button"
                          title="Mover para direita"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMove(index, "right");
                          }}
                          className="p-1 bg-white/90 hover:bg-white text-[#0F3A3E] rounded transition-colors"
                        >
                          <span className="text-[10px] font-bold">▶</span>
                        </button>
                      )}
                    </div>

                    {/* Botão excluir */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(url);
                      }}
                      disabled={disabled}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Ação de capa em hover */}
                  {!isCover && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(index)}
                      className="w-full py-1 bg-[#B07B1E] text-white text-[10px] font-medium rounded hover:bg-[#8e5f15] transition-colors"
                    >
                      Definir Capa
                    </button>
                  )}
                </div>

                {/* Badge de Capa permanente */}
                {isCover ? (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-[#B07B1E] text-white text-[9px] uppercase tracking-wider font-semibold rounded">
                    ★ Capa
                  </span>
                ) : (
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded">
                    #{index + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botão buscar imagens */}
      {searchQuery && searchQuery.trim().length >= 2 && value.length < maxImages && (
        <button
          type="button"
          onClick={() => setShowMLSelector(true)}
          disabled={disabled}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 text-sm bg-[#FFF3CD] border border-[#FFE69C] hover:bg-[#FFECB5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="h-4 w-4 text-[#B07B1E]" />
          <span className="text-[#8A6D3B]">Buscar imagens na web</span>
        </button>
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

      {/* Modal de busca de imagens */}
      {showMLSelector && searchQuery && (
        <ImageSelector
          query={searchQuery}
          currentImages={value}
          maxImages={maxImages}
          onSelect={(urls) => {
            onChange?.([...value, ...urls]);
            setShowMLSelector(false);
          }}
          onClose={() => setShowMLSelector(false)}
        />
      )}
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