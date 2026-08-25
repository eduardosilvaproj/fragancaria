import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Package, Calculator } from "lucide-react";
import { getProductForAdmin, updateProduct } from "@/lib/products-admin.functions";
import { listCategories } from "@/lib/categories-admin.functions";
import { getNfeSettings } from "@/lib/nfe.functions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { VariationsEditor, type VariationForm } from "@/components/admin/VariationsEditor";
import {
  CFOP_OPTIONS,
  CST_ICMS_OPTIONS,
  CSOSN_OPTIONS,
  CST_PIS_COFINS_OPTIONS,
  ORIGEM_MERCADORIA_OPTIONS,
} from "@/components/admin/fiscal-options";
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
  cest: string;
  cstIcms: string;
  csosn: string;
  origem: string;
  cstPisCofins: string;
  unidade: string;
  cfopVendaPjDentro: string;
  cfopVendaPjFora: string;
  cfopVendaPfFora: string;
  // IBS/CBS (Reforma Tributária)
  cstIbscbs: string;
  cclassTrib: string;
  aliquotaIbsEstadual: string;
  aliquotaIbsMunicipal: string;
  aliquotaCbs: string;
  codigoBeneficioFiscal: string;
  // Custo e margem
  cost: string;
  pricingMode: "manual" | "auto";
  targetMargin: string;
  // Variações
  hasVariations: boolean;
  variations: VariationForm[];
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
  cest: "",
  cstIcms: "",
  csosn: "",
  origem: "",
  cstPisCofins: "",
  unidade: "",
  cfopVendaPjDentro: "5102",
  cfopVendaPjFora: "6102",
  cfopVendaPfFora: "6108",
  cstIbscbs: "",
  cclassTrib: "",
  aliquotaIbsEstadual: "",
  aliquotaIbsMunicipal: "",
  aliquotaCbs: "",
  codigoBeneficioFiscal: "",
  // Custo e margem
  cost: "",
  pricingMode: "manual",
  targetMargin: "",
  // Variações
  hasVariations: false,
  variations: [],
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

  const getNfeSettingsFn = useServerFn(getNfeSettings);
  const { data: nfeSettingsData } = useQuery({
    queryKey: ["nfe-settings"],
    queryFn: () => getNfeSettingsFn({}),
  });
  const currentCrt = nfeSettingsData?.success && nfeSettingsData.data ? (nfeSettingsData.data.crt ?? 3) : 3;

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
        ncm: p.ncm ?? "33049900",
        eanBarcode: p.ean_barcode ?? "",
        cest: p.cest ?? "",
        cstIcms: p.cst_icms ?? "",
        csosn: p.csosn ?? "",
        origem: p.origem != null ? String(p.origem) : "",
        cstPisCofins: p.cst_pis_cofins ?? "",
        unidade: p.unidade ?? "UN",
        cfopVendaPjDentro: p.cfop_venda_pj_dentro ?? "5102",
        cfopVendaPjFora: p.cfop_venda_pj_fora ?? "6102",
        cfopVendaPfFora: p.cfop_venda_pf_fora ?? "6108",
        cstIbscbs: p.cst_ibscbs ?? "000",
        cclassTrib: p.cclasstrib ?? "000001",
        aliquotaIbsEstadual: p.aliquota_ibs_estadual != null ? String(p.aliquota_ibs_estadual) : "0.1",
        aliquotaIbsMunicipal: p.aliquota_ibs_municipal != null ? String(p.aliquota_ibs_municipal) : "0.0",
        aliquotaCbs: p.aliquota_cbs != null ? String(p.aliquota_cbs) : "0.9",
        codigoBeneficioFiscal: p.codigo_beneficio_fiscal ?? "",
        // Custo e margem
        cost: p.cost != null ? String(p.cost) : "",
        pricingMode: p.pricing_mode === "auto" ? "auto" : "manual",
        targetMargin: p.target_margin != null ? String(p.target_margin) : "",
        // Variações
        hasVariations: Array.isArray(p.variations) && p.variations.length > 0,
        variations: Array.isArray(p.variations)
          ? p.variations.map((v: any) => ({
              id: v.id ?? crypto.randomUUID().slice(0, 8),
              name: v.name ?? "",
              color: v.color ?? "",
              image: v.image ?? "",
            }))
          : [],
      });
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Recálculo automático entre custo, preço e margem
  // Fonte da verdade: targetMargin (margem sobre preço de venda).
  // price = cost / (1 - targetMargin)
  // targetMargin = 1 - cost / price
  // cost = price * (1 - targetMargin)
  const recalc = useCallback(
    (changed: "cost" | "price" | "margin") => {
      setForm((f) => {
        const cost = parseFloat(f.cost);
        const price = parseFloat(f.price);
        const margin = parseFloat(f.targetMargin);
        const hasCost = !isNaN(cost) && cost > 0;
        const hasPrice = !isNaN(price) && price > 0;
        const hasMargin = !isNaN(margin) && margin > 0 && margin < 1;

        if (changed === "cost" && hasCost && hasMargin) {
          // Recalcula price
          const newPrice = cost / (1 - margin);
          return { ...f, price: newPrice.toFixed(2) };
        }
        if (changed === "margin" && hasCost && hasMargin) {
          const newPrice = cost / (1 - margin);
          return { ...f, price: newPrice.toFixed(2) };
        }
        if (changed === "price" && hasPrice && hasCost) {
          // Recalcula margin
          const newMargin = 1 - cost / price;
          if (newMargin > 0 && newMargin < 1) {
            return { ...f, targetMargin: newMargin.toFixed(4) };
          }
        }
        return f;
      });
    },
    [],
  );

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
            cest: form.cest.trim() || null,
            cstIcms: form.cstIcms.trim() || null,
            csosn: form.csosn.trim() || null,
            origem: form.origem !== "" ? Number(form.origem) : null,
            cstPisCofins: form.cstPisCofins.trim() || null,
            unidade: form.unidade.trim() || null,
            cfopVendaPjDentro: form.cfopVendaPjDentro.trim() || null,
            cfopVendaPjFora: form.cfopVendaPjFora.trim() || null,
            cfopVendaPfFora: form.cfopVendaPfFora.trim() || null,
            cstIbscbs: form.cstIbscbs.trim() || null,
            cclassTrib: form.cclassTrib.trim() || null,
            aliquotaIbsEstadual: form.aliquotaIbsEstadual !== "" ? Number(form.aliquotaIbsEstadual) : null,
            aliquotaIbsMunicipal: form.aliquotaIbsMunicipal !== "" ? Number(form.aliquotaIbsMunicipal) : null,
            aliquotaCbs: form.aliquotaCbs !== "" ? Number(form.aliquotaCbs) : null,
            codigoBeneficioFiscal: form.codigoBeneficioFiscal.trim() || null,
            // Custo e margem
            cost: form.cost ? Number(form.cost) : null,
            pricingMode: form.pricingMode,
            targetMargin: form.targetMargin ? Number(form.targetMargin) : null,
            // Variações
            variations: form.hasVariations
              ? form.variations
                  .filter((v) => v.name.trim())
                  .map((v) => ({
                    id: v.id,
                    name: v.name.trim(),
                    color: v.color || null,
                    image: v.image || null,
                  }))
              : [],
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
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
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

          {/* Custo e margem */}
          <div className="md:col-span-2 border-t border-[#E9E1D2] pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-[#B07B1E]" />
              <span className="text-xs uppercase tracking-wider text-[#B07B1E] font-medium">
                Custo e Margem
              </span>
            </div>

            {/* Toggle Manual / Automático */}
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => set("pricingMode", "manual")}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  form.pricingMode === "manual"
                    ? "bg-[#0F3A3E] text-white"
                    : "bg-[#F3EEE3] text-[#51635F]"
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                disabled
                title="Em breve — integração Stovix"
                className={`px-4 py-1.5 text-xs font-medium rounded-full cursor-not-allowed opacity-50 ${
                  form.pricingMode === "auto"
                    ? "bg-[#0F3A3E] text-white"
                    : "bg-[#F3EEE3] text-[#51635F]"
                }`}
              >
                Automático (em breve)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Custo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.cost}
                  onChange={(e) => {
                    set("cost", e.target.value);
                    recalc("cost");
                  }}
                  disabled={form.pricingMode === "auto"}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Preço de venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => {
                    set("price", e.target.value);
                    recalc("price");
                  }}
                  required
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">
                  Margem sobre venda (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="99.99"
                  value={
                    form.targetMargin
                      ? (parseFloat(form.targetMargin) * 100).toFixed(1)
                      : ""
                  }
                  onChange={(e) => {
                    const pct = e.target.value;
                    const decimal = pct ? parseFloat(pct) / 100 : "";
                    set("targetMargin", decimal !== "" ? String(decimal) : "");
                    recalc("margin");
                  }}
                  disabled={form.pricingMode === "auto"}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
            </div>

            {/* Indicador de markup */}
            {form.cost && form.price && parseFloat(form.cost) > 0 && parseFloat(form.price) > 0 && (
              <p className="text-xs text-[#8A938E] mt-2">
                Markup sobre custo:{" "}
                <strong>
                  {((parseFloat(form.price) / parseFloat(form.cost) - 1) * 100).toFixed(1)}%
                </strong>
                {" · "}
                Margem sobre venda:{" "}
                <strong>
                  {form.targetMargin
                    ? (parseFloat(form.targetMargin) * 100).toFixed(1)
                    : ((1 - parseFloat(form.cost) / parseFloat(form.price)) * 100).toFixed(1)}
                  %
                </strong>
              </p>
            )}
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
              searchQuery={[form.brand, form.name].filter(Boolean).join(" ").trim()}
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

        {/* Variações */}
        <div className="border-t border-[#E9E1D2] pt-6 mt-6">
          <label className="flex items-center gap-2 text-sm text-[#51635F] mb-4">
            <input
              type="checkbox"
              checked={form.hasVariations}
              onChange={(e) => set("hasVariations", e.target.checked)}
            />
            <span className="text-xs uppercase tracking-wider text-[#B07B1E] font-medium">
              Este produto tem variações (ex.: tons de coloração)
            </span>
          </label>
          {form.hasVariations && (
            <VariationsEditor
              value={form.variations}
              onChange={(variations) => set("variations", variations)}
            />
          )}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">CEST</label>
              <input
                type="text"
                value={form.cest}
                onChange={(e) => set("cest", e.target.value)}
                placeholder="00.000.00"
                maxLength={7}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
            {currentCrt === 1 || currentCrt === 2 ? (
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">CSOSN (Simples)</label>
                <select
                  value={form.csosn}
                  onChange={(e) => set("csosn", e.target.value)}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
                >
                  <option value="">Selecione</option>
                  {CSOSN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">CST ICMS</label>
                <select
                  value={form.cstIcms}
                  onChange={(e) => set("cstIcms", e.target.value)}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
                >
                  <option value="">Selecione</option>
                  {CST_ICMS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Origem Mercadoria</label>
              <select
                value={form.origem}
                onChange={(e) => set("origem", e.target.value)}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
              >
                <option value="">Padrão da Loja</option>
                {ORIGEM_MERCADORIA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">CST PIS/COFINS</label>
              <select
                value={form.cstPisCofins}
                onChange={(e) => set("cstPisCofins", e.target.value)}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white"
              >
                <option value="">Selecione</option>
                {CST_PIS_COFINS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Unidade</label>
              <input
                type="text"
                value={form.unidade}
                onChange={(e) => set("unidade", e.target.value)}
                placeholder="UN"
                maxLength={6}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E9E1D2]">
            <h4 className="text-[10px] uppercase tracking-wider text-[#51635F] font-medium mb-1">
              CFOP Contextual por Operação (Saídas)
            </h4>
            <p className="text-[11px] text-[#8A938E] mb-3">
              Configure os CFOPs de venda deste produto. Devoluções de venda são automáticas (1202 dentro de SP / 2202 fora de SP) conforme orientação da contabilidade.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Venda dentro do estado (SP - PJ ou PF) *</label>
                <select
                  value={form.cfopVendaPjDentro}
                  onChange={(e) => set("cfopVendaPjDentro", e.target.value)}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white outline-none focus:ring-1 focus:ring-[#B07B1E]"
                  required
                >
                  <option value="">Selecione CFOP</option>
                  {CFOP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Venda fora do estado (PJ contribuinte) *</label>
                <select
                  value={form.cfopVendaPjFora}
                  onChange={(e) => set("cfopVendaPjFora", e.target.value)}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white outline-none focus:ring-1 focus:ring-[#B07B1E]"
                  required
                >
                  <option value="">Selecione CFOP</option>
                  {CFOP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Venda fora do estado (PF / não contribuinte) *</label>
                <select
                  value={form.cfopVendaPfFora}
                  onChange={(e) => set("cfopVendaPfFora", e.target.value)}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm bg-white outline-none focus:ring-1 focus:ring-[#B07B1E]"
                  required
                >
                  <option value="">Selecione CFOP</option>
                  {CFOP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* IBS / CBS — Reforma Tributária */}
          <div className="mt-4 pt-4 border-t border-[#E9E1D2]">
            <h4 className="text-[10px] uppercase tracking-wider text-[#B07B1E] font-medium mb-3">
              IBS / CBS — Reforma Tributária
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">CST IBS/CBS</label>
                <input
                  type="text"
                  value={form.cstIbscbs}
                  onChange={(e) => set("cstIbscbs", e.target.value)}
                  placeholder="000"
                  maxLength={3}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">cClassTrib</label>
                <input
                  type="text"
                  value={form.cclassTrib}
                  onChange={(e) => set("cclassTrib", e.target.value)}
                  placeholder="000001"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Alíquota IBS Estadual (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aliquotaIbsEstadual}
                  onChange={(e) => set("aliquotaIbsEstadual", e.target.value)}
                  placeholder="0.1"
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Alíquota IBS Municipal (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aliquotaIbsMunicipal}
                  onChange={(e) => set("aliquotaIbsMunicipal", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Alíquota CBS (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.aliquotaCbs}
                  onChange={(e) => set("aliquotaCbs", e.target.value)}
                  placeholder="0.9"
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8A938E] mb-1">Código Benefício Fiscal</label>
                <input
                  type="text"
                  value={form.codigoBeneficioFiscal}
                  onChange={(e) => set("codigoBeneficioFiscal", e.target.value)}
                  placeholder="SP070130"
                  maxLength={15}
                  className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
                />
              </div>
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
