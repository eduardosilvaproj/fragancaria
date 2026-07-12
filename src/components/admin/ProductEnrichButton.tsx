import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductEnrichButtonProps {
  productId: string;
  productName: string;
  productBrand?: string;
  hasImages: boolean;
  hasTags: boolean;
  onEnriched?: () => void;
}

export function ProductEnrichButton({
  productId,
  productName,
  productBrand,
  hasImages,
  hasTags,
  onEnriched,
}: ProductEnrichButtonProps) {
  const [loading, setLoading] = useState<"tags" | "image" | null>(null);

  const enrichMutation = useMutation({
    mutationFn: async (fields: ("images" | "tags")[]) => {
      const { enrichProduct } = await import("@/lib/product-enrich.functions");
      const fn = useServerFn(enrichProduct);
      return fn({ data: { id: productId, fields } });
    },
    onSuccess: (result, fields) => {
      if (result?.success) {
        if (fields.includes("tags") && result.tags) {
          toast.success("Tags geradas com sucesso!");
        }
        if (fields.includes("images") && result.images) {
          toast.success("Imagem encontrada!");
        } else if (fields.includes("images") && !result.images) {
          toast.info("Nenhuma imagem encontrada. Tente adicionar manualmente.");
        }
        onEnriched?.();
      } else {
        toast.error("Erro ao enriquecer", { description: result?.error });
      }
      setLoading(null);
    },
    onError: (error) => {
      toast.error("Erro ao enriquecer", { description: error.message });
      setLoading(null);
    },
  });

  const handleGenerateTags = () => {
    setLoading("tags");
    enrichMutation.mutate(["tags"]);
  };

  const handleSearchImage = () => {
    setLoading("image");
    enrichMutation.mutate(["images"]);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Botão Gerar Tags */}
      {!hasTags && (
        <button
          onClick={handleGenerateTags}
          disabled={loading !== null}
          className={cn(
            "p-1.5 rounded border transition-colors text-xs",
            "border-[#E9E1D2] hover:border-[#B07B1E] hover:bg-amber-50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            loading === "tags" && "bg-amber-50 border-[#B07B1E]"
          )}
          title="Gerar tags automaticamente"
        >
          {loading === "tags" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B07B1E]" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-[#B07B1E]" />
          )}
        </button>
      )}

      {/* Botão Buscar Imagem */}
      {!hasImages && (
        <button
          onClick={handleSearchImage}
          disabled={loading !== null}
          className={cn(
            "p-1.5 rounded border transition-colors text-xs",
            "border-[#E9E1D2] hover:border-[#B07B1E] hover:bg-amber-50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            loading === "image" && "bg-amber-50 border-[#B07B1E]"
          )}
          title="Buscar imagem na internet"
        >
          {loading === "image" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B07B1E]" />
          ) : (
            <svg
              className="h-3.5 w-3.5 text-[#B07B1E]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </button>
      )}

      {/* Indicador de enriquecido */}
      {hasImages && hasTags && (
        <span className="text-emerald-500 text-xs" title="Produto completo">
          ✓
        </span>
      )}
    </div>
  );
}