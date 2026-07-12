import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2, Check, ExternalLink } from "lucide-react";
import { fetchProductImages } from "@/lib/product-enrich.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageSelectorProps {
  mlId: string;
  onSelect: (urls: string[]) => void;
  onClose: () => void;
  currentImages: string[];
  maxImages?: number;
}

export function ImageSelector({
  mlId,
  onSelect,
  onClose,
  currentImages,
  maxImages = 5,
}: ImageSelectorProps) {
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const availableSlots = maxImages - currentImages.length;

  const fetchImages = useServerFn(fetchProductImages);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchImages({ data: { mlId } })
      .then((result) => {
        if (cancelled) return;
        setIsLoading(false);
        if (result?.success && result.images) {
          setImages(result.images);
          const toSelect = result.images
            .filter((img) => !currentImages.includes(img))
            .slice(0, availableSlots);
          setSelected(new Set(toSelect));
        } else {
          setError(result?.error || "Erro ao buscar imagens");
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        setIsLoading(false);
        setError(err?.message || "Erro ao buscar imagens");
      });

    return () => {
      cancelled = true;
    };
  }, [mlId]);

  const toggleImage = (url: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else if (newSelected.size < availableSlots) {
      newSelected.add(url);
    } else {
      toast.info(`Máximo de ${availableSlots} imagem(ns) disponível(is)`);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selected));
  };

  const selectAll = () => {
    const toSelect = images
      .filter((img) => !currentImages.includes(img))
      .slice(0, availableSlots);
    setSelected(new Set(toSelect));
  };

  const deselectAll = () => {
    setSelected(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2]">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-[#B07B1E]" />
            <h2 className="font-serif text-lg text-[#0F3A3E]">
              Imagens do Mercado Livre
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F3EEE3] rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-[#B07B1E] animate-spin mb-4" />
              <p className="text-sm text-[#8A938E]">Buscando imagens...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-2">{error}</p>
              <p className="text-xs text-[#8A938E]">
                ID: {mlId}
              </p>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#51635F]">Nenhuma imagem encontrada</p>
              <p className="text-xs text-[#8A938E] mt-2">
                ID: {mlId}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#51635F]">
                  {images.length} imagem(ns) encontrada(s) • Selecione até{" "}
                  {availableSlots}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-[#B07B1E] hover:underline"
                  >
                    Selecionar todas
                  </button>
                  <span className="text-[#E9E1D2]">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-[#8A938E] hover:underline"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {images.map((url, index) => {
                  const isSelected = selected.has(url);
                  const isAlreadyAdded = currentImages.includes(url);
                  return (
                    <button
                      key={url}
                      onClick={() => !isAlreadyAdded && toggleImage(url)}
                      disabled={isAlreadyAdded}
                      className={cn(
                        "relative aspect-square rounded border-2 overflow-hidden transition-all",
                        isSelected
                          ? "border-[#B07B1E] ring-2 ring-[#B07B1E]/30"
                          : "border-[#E9E1D2] hover:border-[#B07B1E]/50",
                        isAlreadyAdded && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <img
                        src={url}
                        alt={`Imagem ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-[#B07B1E]/20 flex items-center justify-center">
                          <Check className="h-8 w-8 text-[#B07B1E]" />
                        </div>
                      )}
                      {isAlreadyAdded && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            Já adicionado
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                        {index + 1}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#E9E1D2] bg-[#FAFAF8]">
          <p className="text-sm text-[#8A938E]">
            {selected.size} selecionada(s)
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Adicionar {selected.size} imagem(ns)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}