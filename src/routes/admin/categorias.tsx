import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import {
  listCategories,
  upsertCategory,
  deleteCategory,
} from "@/lib/categories-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categorias")({
  component: AdminCategorias,
});

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sort_order: number;
}

interface CategoryFormState {
  id?: string;
  name: string;
  description: string;
  image: string;
}

const EMPTY_FORM: CategoryFormState = { name: "", description: "", image: "" };

function AdminCategorias() {
  const listFn = useServerFn(listCategories);
  const upsertFn = useServerFn(upsertCategory);
  const deleteFn = useServerFn(deleteCategory);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await listFn();
      if (!res.success) throw new Error(res.error);
      return res.data as Category[];
    },
    refetchOnWindowFocus: false,
  });

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setForm({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      image: category.image ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    setSaving(true);
    try {
      const res = await upsertFn({
        data: {
          id: form.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          image: form.image.trim() || null,
        },
      });
      if (!res.success) {
        toast.error("Erro ao salvar categoria", { description: res.error });
        return;
      }
      toast.success(form.id ? "Categoria atualizada" : "Categoria criada");
      closeModal();
      refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Excluir categoria "${category.name}"? Esta ação não pode ser desfeita.`)) return;
    const res = await deleteFn({ data: { id: category.id } });
    if (!res.success) {
      toast.error("Erro ao excluir", { description: res.error });
      return;
    }
    toast.success("Categoria excluída");
    refetch();
  };

  // Troca sort_order com o vizinho (acima ou abaixo) e persiste os dois.
  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = categories[index + direction];
    const current = categories[index];
    if (!target || !current) return;
    setReorderingId(current.id);
    try {
      await Promise.all([
        upsertFn({
          data: {
            id: current.id,
            name: current.name,
            description: current.description,
            image: current.image,
            sortOrder: target.sort_order,
          },
        }),
        upsertFn({
          data: {
            id: target.id,
            name: target.name,
            description: target.description,
            image: target.image,
            sortOrder: current.sort_order,
          },
        }),
      ]);
      refetch();
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8">
      {/* Modal de Criar/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2]">
              <h2 className="font-serif text-xl text-[#0F3A3E]">
                {form.id ? "Editar Categoria" : "Nova Categoria"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                  placeholder="Perfumes"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                  placeholder="Descrição opcional da categoria"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">URL da imagem</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
                  placeholder="https://exemplo.com/categoria.jpg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E9E1D2] bg-[#F8F4EA]">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm border border-[#E9E1D2] bg-white hover:bg-[#F3EEE3] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Tag className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Catálogo
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Categorias</h1>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Categoria
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total de categorias
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{categories.length}</p>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-[#E9E1D2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium w-24">
                  Ordem
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Categoria
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Slug
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Descrição
                </th>
                <th className="p-4 text-center text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-[#8A938E]">
                    Carregando categorias...
                  </td>
                </tr>
              )}
              {!isLoading && categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-[#8A938E]">
                    Nenhuma categoria cadastrada ainda.
                  </td>
                </tr>
              )}
              {categories.map((category, index) => (
                <tr
                  key={category.id}
                  className="border-b border-[#E9E1D2] hover:bg-[#F8F4EA]/50 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMove(index, -1)}
                        disabled={index === 0 || reorderingId !== null}
                        title="Mover para cima"
                        className="p-1 hover:bg-[#F3EEE3] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="h-4 w-4 text-[#51635F]" />
                      </button>
                      <button
                        onClick={() => handleMove(index, 1)}
                        disabled={index === categories.length - 1 || reorderingId !== null}
                        title="Mover para baixo"
                        className="p-1 hover:bg-[#F3EEE3] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown className="h-4 w-4 text-[#51635F]" />
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F8F4EA] rounded flex items-center justify-center flex-shrink-0">
                        {category.image ? (
                          <img
                            src={category.image}
                            alt={category.name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-[#8A938E]" />
                        )}
                      </div>
                      <p className="font-medium text-[#0F3A3E]">{category.name}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-[#51635F] font-mono">{category.slug}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-[#51635F] line-clamp-1">
                      {category.description || "—"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(category)}
                        title="Editar categoria"
                        className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
                      >
                        <Edit className="h-4 w-4 text-[#51635F]" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        title="Excluir categoria"
                        className="p-2 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminCategorias;
