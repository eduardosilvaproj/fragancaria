import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { getProductForAdmin, updateProduct } from "@/lib/products-admin.functions";
import { listCategories } from "@/lib/categories-admin.functions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtos/$id/editar")({
  component: EditarProduto,
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
  // Dimensões para frete
  weightGrams: string;
  heightCm: string;
  widthCm: string;
  lengthCm: string;
  // Dados fiscais
  ncm: string;
  eanBarcode: string;
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
  // Dimensões para frete
  weightGrams: "",
  heightCm: "",
  widthCm: "",
  lengthCm: "",
  // Dados fiscais
  ncm: "",
  eanBarcode: "",
};

function EditarProduto() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getProductForAdmin);
  const updateFn = useServerFn(updateProduct);
  const listCategoriesFn = useServerFn(listCategories);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await listCategoriesFn();
      if (!res.success) throw new Error(res.error);
      return res.data as { id: string; name: string; slug: string }[];
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await getFn({ data: { id } });
      if (!active) return;
      if (!res.success) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const p = res.data as any;
      setForm({
        name: p.name ?? "",
        brand: p.brand ?? "",
        category: p.category ?? "",
        subcategory: p.subcategory ?? "",
        price: String(p.price ?? ""),
        originalPrice: p.original_price != null ? String(p.original_price) : "",
        quantity: String(p.quantity ?? 0),
        sku: p.sku ?? "",
        description: p.description ?? "",
        images: Array.isArray(p.images) ? p.images : [],
        tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
        inStock: p.in_stock ?? true,
        featured: p.featured ?? false,
        isNew: p.is_new ?? false,
        isActive: p.is_active ?? true,
        // Dimensões para frete
        weightGrams: p.weight_grams != null ? String(p.weight_grams) : "",
        heightCm: p.height_cm != null ? String(p.height_cm) : "",
        widthCm: p.width_cm != null ? String(p.width_cm) : "",
        lengthCm: p.length_cm != null ? String(p.length_cm) : "",
        // Dados fiscais
        ncm: p.ncm ?? "",
        eanBarcode: p.ean_barcode ?? "",
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

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
      const res = await updateFn({
        data: {
          id,
          patch: {
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
            // Dimensões para frete
            weightGrams: form.weightGrams ? Number(form.weightGrams) : null,
            heightCm: form.heightCm ? Number(form.heightCm) : null,
            widthCm: form.widthCm ? Number(form.widthCm) : null,
            lengthCm: form.lengthCm ? Number(form.lengthCm) : null,
            // Dados fiscais
            ncm: form.ncm.trim() || null,
            eanBarcode: form.eanBarcode.trim() || null,
          },
        },
      });
      if (!res.success) {
        toast.error("Erro ao salvar produto", { description: res.error });
        return;
      }
      toast.success("Produto atualizado");
      navigate({ to: "/admin/produtos" });
    } catch (err: any) {
      toast.error("Erro ao salvar produto", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#8A938E]" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6 md:p-8 max-w-3xl">
        <Link
          to="/admin/produtos"
          className="inline-flex items-center gap-2 text-sm text-[#51635F] hover:text-[#0F3A3E] mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para produtos
        </Link>
        <p className="text-sm text-[#51635F]">Produto não encontrado.</p>
      </div>
    );
  }

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
      <h1 className="font-serif text-3xl text-[#0F3A3E] mb-8">Editar Produto</h1>

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
              {form.category && !categories.some((c) => c.slug === form.category) && (
                <option value={form.category}>{form.category} (não cadastrada)</option>
              )}
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

        {/* Dimensões para Frete */}
        <div className="border-t border-[#E9E1D2] pt-6 mt-6">
          <h3 className="text-xs uppercase tracking-wider text-[#B07B1E] font-medium mb-4">
            Dimensões para Frete
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Peso (g)</label>
              <input
                type="number"
                value={form.weightGrams}
                onChange={(e) => set("weightGrams", e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Altura (cm)</label>
              <input
                type="number"
                value={form.heightCm}
                onChange={(e) => set("heightCm", e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Largura (cm)</label>
              <input
                type="number"
                value={form.widthCm}
                onChange={(e) => set("widthCm", e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Comprimento (cm)</label>
              <input
                type="number"
                value={form.lengthCm}
                onChange={(e) => set("lengthCm", e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Dados Fiscais */}
        <div className="border-t border-[#E9E1D2] pt-6 mt-6">
          <h3 className="text-xs uppercase tracking-wider text-[#B07B1E] font-medium mb-4">
            Dados Fiscais (NF-e)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">NCM</label>
              <input
                type="text"
                value={form.ncm}
                onChange={(e) => set("ncm", e.target.value)}
                placeholder="3304.99.00"
                maxLength={10}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Código EAN/GTIN</label>
              <input
                type="text"
                value={form.eanBarcode}
                onChange={(e) => set("eanBarcode", e.target.value)}
                placeholder="7891234567890"
                maxLength={20}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
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
            Salvar alterações
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
