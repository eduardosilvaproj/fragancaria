import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ImageIcon, Loader2, Check, X, Ban } from "lucide-react";
import {
  listPendingImageSuggestions,
  approveImageSuggestion,
  rejectProductSuggestions,
} from "@/lib/product-image-suggestions.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/produtos/imagens")({
  component: RevisaoImagens,
});

type ProdutoPendente = {
  productId: string;
  name: string;
  brand: string | null;
  currentImages: string[];
  candidatas: Array<{ id: string; imageUrl: string }>;
};

function RevisaoImagens() {
  const listFn = useServerFn(listPendingImageSuggestions);
  const approveFn = useServerFn(approveImageSuggestion);
  const rejectFn = useServerFn(rejectProductSuggestions);

  // productId em processamento (aprovando/rejeitando), para travar os botões
  // da linha e mostrar spinner sem travar a tela inteira.
  const [busyProduct, setBusyProduct] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pending-image-suggestions"],
    queryFn: async () => {
      const res = await listFn({ data: {} });
      if (!res.success) throw new Error(res.error || "Erro ao carregar");
      return res.produtos;
    },
    refetchOnWindowFocus: false,
  });

  const produtos: ProdutoPendente[] = data ?? [];

  const approveMutation = useMutation({
    mutationFn: async (suggestionId: string) => approveFn({ data: { suggestionId } }),
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Imagem aprovada e salva no produto");
        refetch();
      } else {
        toast.error(res?.error || "Falha ao aprovar");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao aprovar"),
    onSettled: () => setBusyProduct(null),
  });

  const rejectMutation = useMutation({
    mutationFn: async (productId: string) => rejectFn({ data: { productId } }),
    onSuccess: (res) => {
      if (res?.success) {
        toast.info("Produto marcado como sem imagem adequada");
        refetch();
      } else {
        toast.error(res?.error || "Falha ao rejeitar");
      }
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao rejeitar"),
    onSettled: () => setBusyProduct(null),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        to="/admin/produtos"
        className="inline-flex items-center gap-2 text-sm text-[#51635F] hover:text-[#0F3A3E] mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para produtos
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <ImageIcon className="h-6 w-6 text-[#B07B1E]" />
        <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
          Catálogo
        </span>
      </div>
      <h1 className="font-serif text-3xl text-[#0F3A3E] mb-2">Revisão de imagens</h1>
      <p className="text-sm text-[#51635F] mb-8 max-w-2xl">
        Candidatas buscadas na web para produtos sem foto. Clique na imagem correta para
        aprovar (ela é baixada e salva no produto) ou marque "Nenhuma serve" para deixar o
        produto na fila sem imagem.
      </p>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-[#B07B1E] animate-spin mb-4" />
          <p className="text-sm text-[#8A938E]">Carregando candidatas...</p>
        </div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-20 bg-white border border-[#E9E1D2] rounded">
          <ImageIcon className="h-10 w-10 text-[#D8D0BD] mx-auto mb-4" />
          <p className="text-[#51635F]">Nenhuma candidata pendente.</p>
          <p className="text-xs text-[#8A938E] mt-2">
            Use "Buscar imagens em lote" na tela de produtos para gerar sugestões.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {produtos.map((produto) => {
            const busy = busyProduct === produto.productId;
            return (
              <div
                key={produto.productId}
                className="bg-white border border-[#D8D0BD] rounded p-4"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[#1C302E] truncate">{produto.name}</p>
                    {produto.brand && (
                      <p className="text-xs text-[#8A938E]">{produto.brand}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusyProduct(produto.productId);
                      rejectMutation.mutate(produto.productId);
                    }}
                    className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 text-xs border border-[#E9E1D2] text-[#51635F] hover:bg-[#F3EEE3] transition-colors disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Nenhuma serve
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {produto.candidatas.map((c, index) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setBusyProduct(produto.productId);
                        approveMutation.mutate(c.id);
                      }}
                      className={cn(
                        "relative aspect-square rounded border-2 border-[#E9E1D2] overflow-hidden transition-all group",
                        "hover:border-[#B07B1E] focus:border-[#B07B1E] focus:outline-none",
                        busy && "opacity-50 cursor-not-allowed",
                      )}
                      title={`Aprovar imagem ${index + 1}`}
                    >
                      <img
                        src={c.imageUrl}
                        alt={`Candidata ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-[#0F3A3E]/0 group-hover:bg-[#0F3A3E]/30 flex items-center justify-center transition-colors">
                        <Check className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>

                {busy && (
                  <p className="text-xs text-[#8A938E] mt-3 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processando...
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
