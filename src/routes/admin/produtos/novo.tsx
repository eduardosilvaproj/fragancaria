import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { createProduct } from "@/lib/products-admin.functions";
import { listCategories } from "@/lib/categories-admin.functions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtos/novo")({
  component: NovoProduto,
});

interface FormState {
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  price: string;
  originalPrice: string;
  quantity: string;
  sku: string;
  description: string;
  images: string[];
  tags: string;
  inStock: boolean;
  featured: boolean;
  isNew: boolean;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  brand: "",
  category: "",
  subcategory: "",
  price: "",
  originalPrice: "",
  quantity: "0",
  sku: "",
  description: "",
  images: [],
  tags: "",
  inStock: true,
  featured: false,
  isNew: false,
  isActive: true,
};

function NovoProduto() {
  const navigate = useNavigate();
  const createFn = useServerFn(createProduct);
  const listCategoriesFn = useServerFn(listCategories);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await listCategoriesFn();
      if (!res.success) throw new Error(res.error);
      return res.data as { id: string; name: string; slug: string }[];
    },
    refetchOnWindowFocus: false,
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price < 0) {
      toast.error("Preço inválido");
      return;
    }
    setSaving(true);
    try {
      const res = await createFn({
        data: {
          name: form.name.trim(),
          brand: form.brand.trim() || null,
          category: form.category.trim() || null,
          subcategory: form.subcategory.trim() || null,
          price,
          originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
          quantity: form.quantity ? Number(form.quantity) : 0,
          sku: form.sku.trim() || null,
          description: form.description.trim() || null,
          images: form.images,
          tags: form.tags
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          inStock: form.inStock,
          featured: form.featured,
          isNew: form.isNew,
          isActive: form.isActive,
        },
      });
      if (!res.success) {
        toast.error("Erro ao criar produto", { description: res.error });
        return;
      }
      toast.success("Produto criado");
      navigate({ to: "/admin/produtos" });
    } catch (err: any) {
      toast.error("Erro ao criar produto", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <Link
        to="/admin/produtos"
        className="inline-flex items-center gap-2 text-sm text-[#51635F] hover:text-[#0F3A3E] mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para produtos
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Package className="h-6 w-6 text-[#B07B1E]" />
        <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
          Catálogo
        </span>
      </div>
      <h1 className="font-serif text-3xl text-[#0F3A3E] mb-8">Novo Produto</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-[#E9E1D2] p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-[#8A938E] mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Marca</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
              placeholder="Deixe vazio para gerar automaticamente"
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Subcategoria</label>
            <input
              type="text"
              value={form.subcategory}
              onChange={(e) => set("subcategory", e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Preço (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Preço original (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.originalPrice}
              onChange={(e) => set("originalPrice", e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8A938E] mb-1">Quantidade em estoque</label>
            <input
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-[#8A938E] mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-[#8A938E] mb-1">
              Imagens
            </label>
            <ImageUploader
              value={form.images}
              onChange={(urls) => set("images", urls)}
              maxImages={5}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-[#8A938E] mb-1">
              Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="floral, doce, verão"
              className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2 border-t border-[#E9E1D2]">
          <label className="flex items-center gap-2 text-sm text-[#51635F]">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) => set("inStock", e.target.checked)}
            />
            Em estoque
          </label>
          <label className="flex items-center gap-2 text-sm text-[#51635F]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
            />
            Ativo
          </label>
          <label className="flex items-center gap-2 text-sm text-[#51635F]">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)}
            />
            Destaque
          </label>
          <label className="flex items-center gap-2 text-sm text-[#51635F]">
            <input
              type="checkbox"
              checked={form.isNew}
              onChange={(e) => set("isNew", e.target.checked)}
            />
            Novo
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar produto
          </button>
          <Link
            to="/admin/produtos"
            className="px-6 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
