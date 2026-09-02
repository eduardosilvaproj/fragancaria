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
  Loader2,
  Plus,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getAdminFranRecomenda,
  upsertFranRecomenda,
  deleteFranRecomenda,
  type FranRecomendaRow,
  type FranRecomendaRowInput,
} from "@/lib/fran-recomenda.functions";
import { listActiveProducts } from "@/lib/products.functions";
import type { Product } from "@/data/products";

// =====================================================
// CONSTANTES
// =====================================================
const MAX_ATIVOS = 3;
const MAX_SELO_LENGTH = 20;
const MAX_FRASE_LENGTH = 140;

const SELO_OPTIONS = [
  { value: "Fran indica", label: "Fran indica" },
  { value: "Fran usa", label: "Fran usa" },
  { value: "Fran ama", label: "Fran ama" },
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
export const Route = createFileRoute("/admin/fran-recomenda")({
  component: FranRecomendaAdmin,
});

function FranRecomendaAdmin() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FranRecomendaRowInput | null>(null);

  // Server functions
  const getAdminFn = useServerFn(getAdminFranRecomenda);
  const upsertFn = useServerFn(upsertFranRecomenda);
  const deleteFn = useServerFn(deleteFranRecomenda);

  // Query: listar recomendações atuais
  const { data: recomendaData, isLoading: isLoadingRecomenda } = useQuery({
    queryKey: ["fran-recomenda"],
    queryFn: async () => {
      const result = await getAdminFn();
      return result.success ? result.data : [];
    },
  });

  // Query: listar produtos ativos
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const result = await listActiveProducts();
      return result.success ? result.data : [];
    },
  });

  // Contar quantos estão ativos
  const activeCount = useMemo(
    () => (recomendaData || []).filter((r) => r.ativo).length,
    [recomendaData]
  );

  // IDs de produtos já usados (para evitar duplicatas)
  const selectedProductIds = useMemo(
    () => new Set((recomendaData || []).map((r) => r.produtoId)),
    [recomendaData]
  );

  // Mutação: salvar alterações
  const { mutate: saveRecomenda, isPending: isSaving } = useMutation({
    mutationFn: async (rows: FranRecomendaRowInput[]) => upsertFn({ data: { rows } }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Fran Recomenda atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["fran-recomenda"] });
        setIsModalOpen(false);
        setEditingItem(null);
      } else {
        toast.error(result.error || "Erro ao salvar Fran Recomenda");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar");
    },
  });

  // Mutação: remover item
  const { mutate: deleteItem, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: id }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Item removido com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["fran-recomenda"] });
      } else {
        toast.error(result.error || "Erro ao remover item");
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao remover");
    },
  });

  // Abrir modal para editar item existente
  const handleEdit = useCallback((item: FranRecomendaRow) => {
    setEditingItem({
      id: item.id,
      produtoId: item.produtoId,
      selo: item.selo,
      frase: item.frase,
      ordem: item.ordem,
      ativo: item.ativo,
    });
    setIsModalOpen(true);
  }, []);

  // Abrir modal para adicionar novo item
  const handleAddNew = useCallback(() => {
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  // Salvar alterações do modal
  const handleSave = useCallback(
    (data: FranRecomendaRowInput) => {
      // Validar que não excede o limite de 3 ativos
      const currentActive = (recomendaData || []).filter(
        (r) => r.id !== data.id && r.ativo
      ).length;
      if (data.ativo && currentActive >= MAX_ATIVOS) {
        toast.error(
          `Máximo de ${MAX_ATIVOS} produtos ativos permitidos. Desative outro antes.`
        );
        return;
      }

      // Preparar rows para upsert
      const rows: FranRecomendaRowInput[] = (recomendaData || [])
        .filter((r) => r.id !== data.id)
        .map((r) => ({
          id: r.id,
          produtoId: r.produtoId,
          selo: r.selo,
          frase: r.frase,
          ordem: r.ordem,
          ativo: r.ativo,
        }));

      // Adicionar o novo/atualizado
      rows.push({
        id: data.id,
        produtoId: data.produtoId,
        selo: data.selo,
        frase: data.frase,
        ordem: data.ordem,
        ativo: data.ativo,
      });

      saveRecomenda(rows);
    },
    [recomendaData, saveRecomenda]
  );

  // Alternar status ativo
  const handleToggleActive = useCallback(
    (item: FranRecomendaRow) => {
      const activeCountWithoutThis = (recomendaData || []).filter(
        (r) => r.id !== item.id && r.ativo
      ).length;

      if (!item.ativo && activeCountWithoutThis >= MAX_ATIVOS) {
        toast.error(
          `Máximo de ${MAX_ATIVOS} produtos ativos permitidos. Desative outro antes.`
        );
        return;
      }

      const rows = (recomendaData || []).map((r) => ({
        id: r.id,
        produtoId: r.produtoId,
        selo: r.selo,
        frase: r.frase,
        ordem: r.ordem,
        ativo: r.id === item.id ? !item.ativo : r.ativo,
      }));

      saveRecomenda(rows);
    },
    [recomendaData, saveRecomenda]
  );

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen bg-[#F5F3EE] p-6 md:p-8">
      {/* Header */}
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-serif font-medium text-[#0F3A3E]">
              Fran Recomenda
            </h1>
            <p className="text-sm text-[#51635F] mt-1">
              Configure até 3 produtos para a seção de curadoria da Fran na home
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Contador de ativos */}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                activeCount >= MAX_ATIVOS
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : activeCount > 0
                    ? "bg-[#FFF8E1] text-[#B07B1E] border border-[#E8C25A]"
                    : "bg-red-50 text-red-700 border border-red-200"
              )}
            >
              {activeCount >= MAX_ATIVOS ? (
                <CheckCircle className="h-4 w-4" />
              ) : activeCount > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span>
                {activeCount} de {MAX_ATIVOS} ativos
              </span>
            </div>

            {/* Botão adicionar */}
            {activeCount < MAX_ATIVOS && (
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-4 py-2 bg-[#0F3A3E] hover:bg-[#16504F] text-white text-sm transition-colors disabled:opacity-50"
                disabled={isSaving}
              >
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </button>
            )}
          </div>
        </div>

        {/* Aviso quando não houver 3 ativos */}
        {activeCount < MAX_ATIVOS && (
          <div className="mb-6 p-4 bg-[#FFF8E1] border border-[#E8C25A] rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[#B07B1E] mt-0.5 flex-shrink-0" />
            <div className="text-sm text-[#0F3A3E]">
              <p className="font-medium">
                A seção "Fran Recomenda" só aparece na home quando há pelo menos
                1 produto ativo.
              </p>
              <p className="text-[#51635F] mt-1">
                Atualmente você tem {activeCount} produto(s) ativo(s). Adicione mais
                para preencher a seção.
              </p>
            </div>
          </div>
        )}

        {/* Tabela de itens */}
        <div className="bg-white border border-[#E9E1D2] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F3EEE3]">
              <tr>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#51635F] font-medium">
                  Produto
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#51635F] font-medium">
                  Selo
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#51635F] font-medium">
                  Frase
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#51635F] font-medium">
                  Ordem
                </th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider text-[#51635F] font-medium">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs uppercase tracking-wider text-[#51635F] font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9E1D2]">
              {isLoadingRecomenda ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#51635F]" />
                  </td>
                </tr>
              ) : recomendaData && recomendaData.length > 0 ? (
                [...recomendaData]
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-[#F8F6F0]"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.produto && item.produto.images?.[0] ? (
                            <img
                              src={item.produto.images[0]}
                              alt={item.produto.name}
                              className="w-10 h-10 object-cover rounded border border-[#E9E1D2]"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-[#E9E1D2] rounded flex items-center justify-center">
                              <span className="text-xs text-[#8A938E]">
                                Sem imagem
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[#0F3A3E] text-sm">
                              {item.produto?.name ?? item.produtoId}
                            </p>
                            <p className="text-xs text-[#75827E]">
                              {item.produto?.brand ?? "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 text-xs rounded",
                            item.selo?.includes("Fran indica")
                              ? "bg-[#E8C25A]/20 text-[#B07B1E]"
                              : item.selo?.includes("Fran usa")
                                ? "bg-[#B07B1E]/20 text-[#B07B1E]"
                                : item.selo?.includes("Fran ama")
                                  ? "bg-[#FF6B6B]/20 text-[#FF6B6B]"
                                  : "bg-[#E9E1D2] text-[#51635F]"
                          )}
                        >
                          {item.selo ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[#0F3A3E] line-clamp-2 max-w-[200px]">
                          {item.frase ?? "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-[#51635F]">
                          {item.ordem}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(item)}
                          disabled={isSaving || isDeleting}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50",
                            item.ativo
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-[#F3EEE3] text-[#8A938E] hover:bg-[#E9E1D2]"
                          )}
                        >
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              item.ativo ? "bg-green-500" : "bg-[#8A938E]"
                            )}
                          />
                          {item.ativo ? "Ativo" : "Inativo"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-[#51635F] hover:text-[#0F3A3E] hover:bg-[#F3EEE3] rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            disabled={isDeleting}
                            className="p-2 text-[#FF6B6B] hover:text-[#E53935] hover:bg-[#FEE2E2] rounded transition-colors disabled:opacity-50"
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#75827E]">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-[#B07B1E]" />
                    <p>Nenhum produto configurado para Fran Recomenda</p>
                    <p className="text-sm mt-1">
                      Adicione até {MAX_ATIVOS} produtos para a seção aparecer na
                      home
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição / Adição */}
      {isModalOpen && (
        <FranRecomendaModal
          item={editingItem}
          products={productsData || []}
          selectedProductIds={selectedProductIds}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

// =====================================================
// MODAL DE EDIÇÃO / ADIÇÃO
// =====================================================
interface FranRecomendaModalProps {
  item: FranRecomendaRowInput | null;
  products: Product[];
  selectedProductIds: Set<string>;
  onClose: () => void;
  onSave: (data: FranRecomendaRowInput) => void;
  isSaving: boolean;
}

function FranRecomendaModal({
  item,
  products,
  selectedProductIds,
  onClose,
  onSave,
  isSaving,
}: FranRecomendaModalProps) {
  const [produtoId, setProdutoId] = useState(item?.produtoId ?? "");
  const [selo, setSelo] = useState(item?.selo ?? "");
  const [frase, setFrase] = useState(item?.frase ?? "");
  const [ordem, setOrdem] = useState(item?.ordem ?? 0);
  const [ativo, setAtivo] = useState(item?.ativo ?? true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Produto selecionado para mostrar detalhes
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === produtoId),
    [products, produtoId]
  );

  // Produtos filtrados (exclui já selecionados, exceto o atual em edição)
  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          (!selectedProductIds.has(p.id) || p.id === produtoId) &&
          (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [products, searchQuery, selectedProductIds, produtoId]
  );

  // Contadores de caracteres
  const seloCharCount = selo.length;
  const fraseCharCount = frase.length;

  // Validar se pode salvar
  const canSave = useMemo(() => {
    if (!produtoId) return false;
    if (seloCharCount > MAX_SELO_LENGTH) return false;
    if (fraseCharCount > MAX_FRASE_LENGTH) return false;
    return true;
  }, [produtoId, seloCharCount, fraseCharCount]);

  // Selecionar produto
  const handleSelectProduct = useCallback((productId: string) => {
    setProdutoId(productId);
    setSearchQuery("");
    setShowProductDropdown(false);
  }, []);

  // Salvar
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSave) return;

      onSave({
        id: item?.id,
        produtoId,
        selo: selo || null,
        frase: frase || null,
        ordem,
        ativo,
      });
    },
    [item?.id, produtoId, selo, frase, ordem, ativo, canSave, onSave]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Background click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E9E1D2]">
          <h2 className="text-lg font-serif font-medium text-[#0F3A3E]">
            {item?.id ? "Editar Recomendação" : "Nova Recomendação"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[#75827E] hover:text-[#0F3A3E] hover:bg-[#F3EEE3] rounded transition-colors"
            aria-label="Fechar"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Busca de Produto */}
          <div>
            <label className="block text-sm font-medium text-[#0F3A3E] mb-2">
              Produto *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowProductDropdown(true);
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Buscar produto por nome, marca ou SKU..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F6F0] border border-[#E0D8C7] rounded-lg text-sm focus:outline-none focus:border-[#B07B1E] focus:bg-white transition-colors"
              />
            </div>

            {/* Lista de produtos */}
            {showProductDropdown && (
              <div className="mt-2 max-h-60 overflow-y-auto border border-[#E0D8C7] rounded-lg bg-white shadow-lg">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[#F8F6F0] transition-colors border-b border-[#E0D8C7] last:border-0",
                        produtoId === p.id && "bg-[#F3EEE3]"
                      )}
                    >
                      {p.images?.[0] && (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-8 h-8 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#0F3A3E] truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-[#75827E]">
                          {p.brand}
                        </p>
                      </div>
                      <span className="font-medium text-[#0F3A3E]">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(p.price)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-[#75827E]">
                    Nenhum produto encontrado
                  </div>
                )}
              </div>
            )}

            {/* Produto selecionado */}
            {selectedProduct ? (
              <div className="mt-3 p-4 bg-[#F3EEE3] rounded-lg border border-[#E8C25A]">
                <div className="flex items-center gap-3">
                  {selectedProduct.images?.[0] && (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="w-12 h-12 object-cover rounded border"
                    />
                  )}
                  <div>
                    <p className="font-medium text-[#0F3A3E]">
                      {selectedProduct.name}
                    </p>
                    <p className="text-sm text-[#75827E]">
                      {selectedProduct.brand}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              produtoId && (
                <p className="mt-2 text-sm text-red-600">
                  Produto não encontrado
                </p>
              )
            )}
          </div>

          {/* Selo */}
          <div>
            <label className="block text-sm font-medium text-[#0F3A3E] mb-2">
              Selo
              <span className="text-xs text-[#75827E] ml-1">
                (máx {MAX_SELO_LENGTH} caracteres)
              </span>
            </label>
            <select
              value={selo}
              onChange={(e) => setSelo(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E0D8C7] rounded-lg text-sm focus:outline-none focus:border-[#B07B1E] focus:bg-white transition-colors"
            >
              <option value="">Selecione um selo...</option>
              {SELO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="text-right text-[10px] text-[#75827E] mt-1">
              {seloCharCount}/{MAX_SELO_LENGTH}
            </div>
          </div>

          {/* Frase */}
          <div>
            <label className="block text-sm font-medium text-[#0F3A3E] mb-2">
              Frase da Fran
              <span className="text-xs text-[#75827E] ml-1">
                (máx {MAX_FRASE_LENGTH} caracteres)
              </span>
            </label>
            <textarea
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              placeholder="Ex: 'Este shampoo é perfeito para cabelos cacheados e danificados...'"
              rows={3}
              className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E0D8C7] rounded-lg text-sm focus:outline-none focus:border-[#B07B1E] focus:bg-white transition-colors resize-none"
            />
            <div
              className={cn(
                "text-right text-[10px] mt-1",
                fraseCharCount > MAX_FRASE_LENGTH
                  ? "text-red-600"
                  : "text-[#75827E]"
              )}
            >
              {fraseCharCount}/{MAX_FRASE_LENGTH}
            </div>
          </div>

          {/* Ordem */}
          <div>
            <label className="block text-sm font-medium text-[#0F3A3E] mb-2">
              Ordem de Exibição
            </label>
            <input
              type="number"
              value={ordem}
              onChange={(e) => setOrdem(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E0D8C7] rounded-lg text-sm focus:outline-none focus:border-[#B07B1E] focus:bg-white transition-colors"
            />
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded border-[#E9E1D2] text-[#0F3A3E] focus:ring-[#B07B1E]"
              />
              <span className="text-sm text-[#0F3A3E] font-medium">
                Produto Ativo (visível na home)
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#E9E1D2]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] transition-colors"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSave || isSaving}
              className="flex-1 px-4 py-3 bg-[#0F3A3E] text-white text-sm hover:bg-[#16504F] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {item?.id ? "Salvar Alterações" : "Adicionar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
