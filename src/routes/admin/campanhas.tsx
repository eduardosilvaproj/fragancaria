import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  Plus,
  AlertTriangle,
  X,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAdminCampanhas,
  getAdminCampanhaProdutos,
  createCampanha,
  updateCampanha,
  upsertCampanhaProdutos,
  deleteCampanha,
  type Campanha,
  type CampanhaProduto,
} from "@/lib/home-campanha.functions";
import { listActiveProducts } from "@/lib/products.functions";
import type { Product } from "@/data/products";

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export const Route = createFileRoute("/admin/campanhas")({
  component: AdminCampanhas,
});

function AdminCampanhas() {
  const queryClient = useQueryClient();

  // Server functions
  const getAdminCampanhasFn = useServerFn(getAdminCampanhas);
  const getAdminCampanhaProdutosFn = useServerFn(getAdminCampanhaProdutos);
  const createCampanhaFn = useServerFn(createCampanha);
  const updateCampanhaFn = useServerFn(updateCampanha);
  const upsertProdutosFn = useServerFn(upsertCampanhaProdutos);
  const deleteCampanhaFn = useServerFn(deleteCampanha);

  const [showModal, setShowModal] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null);
  const [showProdutosModal, setShowProdutosModal] = useState(false);
  const [selectedCampanhaId, setSelectedCampanhaId] = useState<string | null>(null);

  // Query: listar campanhas
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ["admin-campanhas"],
    queryFn: () => getAdminCampanhasFn(),
    refetchOnWindowFocus: false,
  });

  const campanhas: Campanha[] = queryResult?.success ? queryResult.data : [];

  // Query: listar produtos ativos (para curadoria)
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const result = await listActiveProducts();
      return result.success ? result.data : [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => createCampanhaFn({ data }),
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Campanha criada com sucesso!");
        setShowModal(false);
        queryClient.invalidateQueries({ queryKey: ["admin-campanhas"] });
      } else {
        toast.error(res?.error || "Erro ao criar campanha");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao criar campanha");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => updateCampanhaFn({ data }),
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Campanha atualizada com sucesso!");
        setShowModal(false);
        queryClient.invalidateQueries({ queryKey: ["admin-campanhas"] });
      } else {
        toast.error(res?.error || "Erro ao atualizar campanha");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar campanha");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteCampanhaFn({ data: id }),
    onSuccess: (res) => {
      if (res?.success) {
        toast.success("Campanha excluída com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["admin-campanhas"] });
      } else {
        toast.error(res?.error || "Erro ao excluir campanha");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao excluir campanha");
    },
  });

  const handleOpenCreate = () => {
    setEditingCampanha(null);
    setShowModal(true);
  };

  const handleOpenEdit = (campanha: Campanha) => {
    setEditingCampanha(campanha);
    setShowModal(true);
  };

  const handleOpenProdutos = (campanhaId: string) => {
    setSelectedCampanhaId(campanhaId);
    setShowProdutosModal(true);
  };

  // Formata data para exibição
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Verifica se a campanha está na janela de datas
  function isInWindow(campanha: Campanha): boolean {
    const now = new Date();
    const inicio = new Date(campanha.inicia_em);
    const fim = new Date(campanha.termina_em);
    return campanha.ativo && now >= inicio && now <= fim;
  }

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Marketing & Vitrine
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Campanhas</h1>
          <p className="text-sm text-[#51635F] mt-1">
            Crie campanhas com curadoria manual de produtos para a home.
            A prateleira de campanha aparece acima de "Mais Vendidos".
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total de Campanhas
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">
            {isLoading ? "—" : campanhas.length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ativas
          </p>
          <p className="font-serif text-2xl text-emerald-600">
            {isLoading ? "—" : campanhas.filter((c) => c.ativo).length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Na Janela de Datas
          </p>
          <p className="font-serif text-2xl text-[#B07B1E]">
            {isLoading ? "—" : campanhas.filter(isInWindow).length}
          </p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#B07B1E]" />
        </div>
      ) : campanhas.length === 0 ? (
        <div className="text-center py-16 text-[#8A938E] bg-white border border-[#E9E1D2]">
          <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Nenhuma campanha configurada</p>
          <p className="text-sm mt-1">
            Crie uma campanha para exibir produtos em destaque na home
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campanhas.map((campanha) => {
            const inWindow = isInWindow(campanha);
            const isExpired = new Date(campanha.termina_em) < new Date();

            return (
              <div
                key={campanha.id}
                className={cn(
                  "bg-white border border-[#E9E1D2] p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
                  !campanha.ativo && "opacity-60 bg-gray-50",
                  inWindow && "border-[#B07B1E] ring-1 ring-[#B07B1E]/20",
                )}
              >
                <div className="flex items-start md:items-center gap-4 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 bg-[#F3EEE3] border border-[#E9E1D2] flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-[#B07B1E]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-serif text-lg text-[#0F3A3E]">
                        {campanha.titulo}
                      </h3>
                      {campanha.ativo ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle className="h-3 w-3" /> Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                          <XCircle className="h-3 w-3" /> Inativa
                        </span>
                      )}
                      {inWindow && (
                        <span className="inline-flex items-center gap-1 text-xs text-[#B07B1E] font-medium bg-[#FFF8E1] border border-[#E8C25A] px-2 py-0.5 rounded">
                          <Calendar className="h-3 w-3" /> NA JANELA
                        </span>
                      )}
                      {isExpired && campanha.ativo && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                          <AlertTriangle className="h-3 w-3" /> VENCIDA
                        </span>
                      )}
                    </div>

                    {campanha.subtitulo && (
                      <p className="text-sm text-[#51635F] line-clamp-1 mb-1">
                        {campanha.subtitulo}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-[#8A938E]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Início: {formatDate(campanha.inicia_em)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Fim: {formatDate(campanha.termina_em)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#E9E1D2]">
                  <button
                    onClick={() => handleOpenProdutos(campanha.id)}
                    className="px-3 py-1.5 text-xs bg-[#F3EEE3] text-[#0F3A3E] hover:bg-[#E9E1D2] transition-colors border border-[#E9E1D2]"
                    title="Gerenciar Produtos"
                  >
                    Produtos
                  </button>

                  <button
                    onClick={() => handleOpenEdit(campanha)}
                    className="p-2 hover:bg-[#F3EEE3] rounded border border-[#E9E1D2] text-[#51635F] transition-colors"
                    title="Editar Campanha"
                  >
                    <Edit className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => deleteMutation.mutate(campanha.id)}
                    className="p-2 hover:bg-red-50 rounded border border-[#E9E1D2] text-red-500 transition-colors"
                    title="Excluir Campanha"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Edição/Criação */}
      {showModal && (
        <CampanhaModal
          campanha={editingCampanha}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSave={async (data) => {
            if (editingCampanha) {
              await updateMutation.mutateAsync({ id: editingCampanha.id, ...data });
            } else {
              await createMutation.mutateAsync(data);
            }
          }}
          onClose={() => {
            setShowModal(false);
            setEditingCampanha(null);
          }}
        />
      )}

      {/* Modal de Produtos */}
      {showProdutosModal && selectedCampanhaId && (
        <CampanhaProdutosModal
          campanhaId={selectedCampanhaId}
          products={productsData || []}
          isLoadingProducts={isLoadingProducts}
          isSaving={false}
          onClose={() => {
            setShowProdutosModal(false);
            setSelectedCampanhaId(null);
          }}
          onSave={async (rows) => {
            const result = await upsertProdutosFn({
              data: { campanhaId: selectedCampanhaId, rows },
            });
            if (result?.success) {
              toast.success("Produtos atualizados com sucesso!");
              setShowProdutosModal(false);
              setSelectedCampanhaId(null);
              queryClient.invalidateQueries({ queryKey: ["admin-campanhas"] });
            } else {
              toast.error(result?.error || "Erro ao salvar produtos");
            }
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// MODAL DE CAMPANHA
// =====================================================
interface CampanhaModalProps {
  campanha: Campanha | null;
  isSaving: boolean;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

function CampanhaModal({ campanha, isSaving, onSave, onClose }: CampanhaModalProps) {
  const [titulo, setTitulo] = useState(campanha?.titulo ?? "");
  const [subtitulo, setSubtitulo] = useState(campanha?.subtitulo ?? "");
  const [iniciaEm, setIniciaEm] = useState(
    campanha?.inicia_em ? new Date(campanha.inicia_em).toISOString().slice(0, 16) : ""
  );
  const [terminaEm, setTerminaEm] = useState(
    campanha?.termina_em ? new Date(campanha.termina_em).toISOString().slice(0, 16) : ""
  );
  const [ativo, setAtivo] = useState(campanha?.ativo ?? false);

  const now = new Date().toISOString().slice(0, 16);

  const canSave = titulo.trim().length > 0 && iniciaEm && terminaEm && new Date(terminaEm) > new Date(iniciaEm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    await onSave({
      titulo: titulo.trim(),
      subtitulo: subtitulo.trim() || null,
      inicia_em: new Date(iniciaEm).toISOString(),
      termina_em: new Date(terminaEm).toISOString(),
      ativo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative bg-white w-full max-w-xl border border-[#E9E1D2] shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-[#E9E1D2] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-serif text-xl text-[#0F3A3E]">
            {campanha ? "Editar Campanha" : "Nova Campanha"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#8A938E] hover:text-[#0F3A3E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Semana dos Cachos"
              maxLength={100}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          {/* Subtítulo */}
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">
              Subtítulo
            </label>
            <input
              type="text"
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="Ex: Produtos selecionados para cabelos cacheados"
              maxLength={200}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">
                Data de Início *
              </label>
              <input
                type="datetime-local"
                value={iniciaEm}
                onChange={(e) => setIniciaEm(e.target.value)}
                min="2024-01-01T00:00"
                max={terminaEm || undefined}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8A938E] mb-1">
                Data de Término *
              </label>
              <input
                type="datetime-local"
                value={terminaEm}
                onChange={(e) => setTerminaEm(e.target.value)}
                min={iniciaEm || undefined}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
              />
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded border-[#E9E1D2] text-[#0F3A3E] focus:ring-[#B07B1E]"
              />
              <span className="text-sm text-[#0F3A3E] font-medium">
                Campanha Ativa
              </span>
            </label>
          </div>

          {!ativo && (
            <div className="p-3 bg-[#FFF3CD] border border-[#FFE69C] text-[#8A6D3B] text-xs rounded">
              Campanhas inativas não aparecem na home. Ative para exibir.
            </div>
          )}

          {!canSave && titulo.trim().length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
              {!iniciaEm && "Data de início é obrigatória. "}
              {!terminaEm && "Data de término é obrigatória. "}
              {iniciaEm && terminaEm && new Date(terminaEm) <= new Date(iniciaEm) && "Término deve ser posterior ao início. "}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E9E1D2]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave || isSaving}
              className="flex-1 px-4 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {campanha ? "Salvar Alterações" : "Criar Campanha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// MODAL DE PRODUTOS DA CAMPANHA
// =====================================================
interface CampanhaProdutosModalProps {
  campanhaId: string;
  products: Product[];
  isLoadingProducts: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (rows: { produto_id: string; ordem: number }[]) => Promise<void>;
}

function CampanhaProdutosModal({
  campanhaId,
  products,
  isLoadingProducts,
  isSaving,
  onClose,
  onSave,
}: CampanhaProdutosModalProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getAdminCampanhaProdutosFn = useServerFn(getAdminCampanhaProdutos);
  const queryClient = useQueryClient();

  // Carregar produtos já curados
  const { data: produtosResult, isLoading: isLoadingCurados } = useQuery({
    queryKey: ["admin-campanha-produtos", campanhaId],
    queryFn: () => getAdminCampanhaProdutosFn({ data: { campanhaId } }),
    refetchOnWindowFocus: false,
  });

  const produtosCurados: CampanhaProduto[] = produtosResult?.success ? produtosResult.data : [];

  // Inicializar selectedProductIds quando produtosCurados carregar
  const [initialized, setInitialized] = useState(false);
  if (!initialized && !isLoadingCurados && produtosCurados.length >= 0) {
    setInitialized(true);
    const ids = new Set(produtosCurados.map((p) => p.produto_id));
    setSelectedProductIds(ids);
  }

  // Produtos filtrados pelo search
  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Produtos selecionados na ordem
  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedProductIds.has(p.id));
  }, [products, selectedProductIds]);

  const handleSave = useCallback(async () => {
    setIsSubmitting(true);

    // Cria array em ordem de seleção
    const rows = Array.from(selectedProductIds).map((id, index) => ({
      produto_id: id,
      ordem: index,
    }));

    await onSave(rows);
    setIsSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ["admin-campanha-produtos", campanhaId] });
  }, [selectedProductIds, onSave, campanhaId, queryClient]);

  const handleToggleProduct = useCallback((productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-[#E9E1D2] shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-[#E9E1D2] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-serif text-xl text-[#0F3A3E]">
            Produtos da Campanha
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[#8A938E] hover:text-[#0F3A3E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar produto por nome, marca ou SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          {/* Produtos selecionados (em ordem) */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#8A938E] mb-2">
              Produtos Selecionados ({selectedProductIds.size})
            </h3>
            {selectedProducts.length === 0 ? (
              <p className="text-sm text-[#8A938E]">
                Nenhum produto selecionado. Clique nos produtos abaixo para adicionar.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-2 bg-[#F3EEE3] border border-[#E9E1D2]"
                  >
                    {p.images?.[0] && (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-8 h-8 object-cover border border-[#E9E1D2]"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-[#0F3A3E] text-sm">{p.name}</p>
                      <p className="text-xs text-[#75827E]">{p.brand}</p>
                    </div>
                    <button
                      onClick={() => handleToggleProduct(p.id)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de produtos */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#8A938E] mb-2">
              Produtos Disponíveis
            </h3>
            {isLoadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#B07B1E]" />
              </div>
            ) : (
              <div className="grid gap-2 max-h-80 overflow-y-auto border border-[#E9E1D2]">
                {filteredProducts.map((p) => {
                  const isSelected = selectedProductIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleToggleProduct(p.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 text-left hover:bg-[#F8F6F0] transition-colors border-b border-[#E9E1D2] last:border-0",
                        isSelected && "bg-[#F3EEE3] border-[#B07B1E]",
                      )}
                    >
                      {p.images?.[0] && (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-10 h-10 object-cover border border-[#E9E1D2]"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#0F3A3E] text-sm truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-[#75827E]">{p.brand}</p>
                        <p className="text-xs text-[#8A938E]">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(p.price)}
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="ml-2 line-through text-gray-400">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(p.originalPrice)}
                            </span>
                          )}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E9E1D2]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={selectedProductIds.size === 0 || isSubmitting}
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar Produtos ({selectedProductIds.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
