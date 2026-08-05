import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  Sparkles,
  X,
  Loader2,
  Upload,
  Download,
  Image,
  AlertCircle,
  CheckCircle,
  XCircle,
  Power,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listProductsForAdmin,
  deleteProducts,
  setProductsActive,
  importProducts,
  exportProducts,
  applyGlobalMargin,
} from "@/lib/products-admin.functions";
import { enrichProductsBatch } from "@/lib/product-enrich.functions";
import { suggestProductImagesBatch } from "@/lib/product-image-suggestions.functions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ProductEnrichButton } from "@/components/admin/ProductEnrichButton";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtos/")({
  component: AdminProdutos,
});

// Formato da tabela admin, derivado da row do banco.
interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  stock_status: "in_stock" | "low_stock" | "out_of_stock";
  is_active: boolean;
  image: string | null;
  tags: string[];
}

function rowToAdmin(p: any): AdminProduct {
  const quantity = p.quantity ?? 0;
  let stock_status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
  if (!p.in_stock || quantity === 0) {
    stock_status = "out_of_stock";
  } else if (quantity <= 5) {
    stock_status = "low_stock";
  }
  return {
    id: p.id,
    sku: p.sku || p.id,
    name: p.name,
    brand: p.brand || "",
    category: p.category || "",
    price: Number(p.price ?? 0),
    compare_at_price: p.original_price ?? null,
    stock_quantity: quantity,
    stock_status,
    is_active: p.is_active,
    image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
    tags: Array.isArray(p.tags) ? p.tags : [],
  };
}

// Parser de CSV simples (RFC4180: aspas duplas, "" como escape, vírgula/quebra de linha dentro de aspas).
// Retorna linhas no formato camelCase esperado por importProducts (productInput).
function parseCsv(text: string): Record<string, unknown>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  // remove BOM e a linha "sep=," (dica de separador que o Excel usa; não é dado)
  const src = text.replace(/^﻿/, "").replace(/^sep=.\r?\n/i, "");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const numberFields = new Set([
    "price",
    "original_price",
    "quantity",
    "weight_grams",
    "height_cm",
    "width_cm",
    "length_cm",
  ]);
  const boolFields = new Set(["in_stock", "is_active", "featured", "is_new"]);
  const arrayFields = new Set(["images", "tags"]);
  const colToKey: Record<string, string> = {
    original_price: "originalPrice",
    in_stock: "inStock",
    is_active: "isActive",
    is_new: "isNew",
    // Sem estes, uma coluna weight_grams no CSV virava a chave weight_grams,
    // que o schema (camelCase) descarta em silêncio — o peso não era gravado.
    weight_grams: "weightGrams",
    height_cm: "heightCm",
    width_cm: "widthCm",
    length_cm: "lengthCm",
    ean_barcode: "eanBarcode",
  };
  // Colunas do banco que NÃO são campo de entrada: vêm de um export completo e
  // seriam descartadas pelo schema de todo jeito. Ignorar aqui evita, por
  // exemplo, `variations` vazio virar null e derrubar a linha inteira com
  // "Expected array, received null".
  const ignorar = new Set([
    "id",
    "slug",
    "brand_slug",
    "category_slug",
    "external_ids",
    "variations",
    "created_at",
    "updated_at",
    "stock_status",
  ]);

  const out: Record<string, unknown>[] = [];
  for (const cells of rows.slice(1)) {
    const record: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      const raw = (cells[idx] ?? "").trim();
      const key = colToKey[h] ?? h;
      // id é derivado do sku no import; o resto não faz parte de productInput.
      if (ignorar.has(h)) return;
      if (numberFields.has(h)) {
        record[key] = raw === "" ? undefined : Number(raw);
      } else if (boolFields.has(h)) {
        record[key] = raw === "" ? undefined : ["true", "1", "sim"].includes(raw.toLowerCase());
      } else if (arrayFields.has(h)) {
        record[key] = raw === "" ? [] : raw.split("|").map((v) => v.trim()).filter(Boolean);
      } else {
        record[key] = raw === "" ? null : raw;
      }
    });
    // Precisa de sku (para casar com produto existente) OU name (para criar).
    // Antes exigia name, o que descartava TODA linha de um CSV de sku+price —
    // o import respondia "CSV vazio ou inválido".
    if (!record.sku && !record.name) continue;
    out.push(record);
  }
  return out;
}

// Número de produtos por página
const ITEMS_PER_PAGE = 20;

// Limite de ids por chamada de enrichProductsBatch. Precisa casar com o
// max() do EnrichBatchSchema em product-enrich.functions.ts — passar disso
// derruba a chamada inteira no validator ("Array must contain at most 500
// element(s)"), sem enriquecer nada.
const ENRICH_CHUNK_SIZE = 500;

// Limite de ids por chamada de suggestProductImagesBatch. Deliberadamente MUITO
// menor que o do enriquecimento, e por isso é uma constante separada: o custo
// por item é outro. No enriquecimento o gargalo é o banco; na busca de imagem
// cada produto é uma requisição HTTP ao Serper (~1,25s medido em prod, ~2,9s
// somando as idas ao Supabase).
//
// Com 500 ids o bloco levava ~25min e o proxy do Railway cortava a conexão
// ("upstream error") enquanto a server fn seguia rodando — o cliente reportava
// 0 processados e o banco tinha 2964 candidatas gravadas. 12 ids dão ~35s por
// chamada: cabe no proxy com folga, o progresso avança a cada bloco e uma falha
// custa no máximo 12 produtos. Muitos blocos pequenos > poucos blocos grandes.
const IMAGE_CHUNK_SIZE = 12;

function fatiar<T>(itens: T[], tamanho: number): T[][] {
  const blocos: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    blocos.push(itens.slice(i, i + tamanho));
  }
  return blocos;
}

function AdminProdutos() {
  const navigate = useNavigate();
  const listFn = useServerFn(listProductsForAdmin);
  const deleteFn = useServerFn(deleteProducts);
  const setActiveFn = useServerFn(setProductsActive);
  const importFn = useServerFn(importProducts);
  const exportFn = useServerFn(exportProducts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingProduct, setViewingProduct] = useState<AdminProduct | null>(null);
  const [importing, setImporting] = useState(false);
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showMarginModal, setShowMarginModal] = useState(false);
  const [marginPreview, setMarginPreview] = useState<any>(null);
  const [enrichFields, setEnrichFields] = useState<("images" | "tags")[]>(["tags"]);
  const [enriching, setEnriching] = useState(false);

  // Carrega todos os produtos do banco (via server fn / service role).
  // Pagina em lotes de 200; para ~434 itens são 3 chamadas. Filtro e
  // paginação continuam client-side sobre o array completo.
  const { data: allProducts = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const acc: AdminProduct[] = [];
      let offset = 0;
      for (;;) {
        const res = await listFn({ data: { limit: 200, offset } });
        if (!res.success) throw new Error(res.error);
        acc.push(...res.data.products.map(rowToAdmin));
        if (res.data.products.length < 200) break;
        offset += 200;
      }
      return acc;
    },
    refetchOnWindowFocus: false,
  });

  // Lista única de marcas dos produtos reais
  const uniqueBrands = useMemo(() => {
    const brands = [...new Set(allProducts.map(p => p.brand))].filter(Boolean).sort();
    return brands;
  }, [allProducts]);

  // Lista única de categorias dos produtos reais
  const uniqueCategories = useMemo(() => {
    const categories = [...new Set(allProducts.map(p => p.category))].filter(Boolean).sort();
    return categories;
  }, [allProducts]);

  const filteredProducts = useMemo(() => allProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && product.is_active) ||
      (selectedStatus === "inactive" && !product.is_active) ||
      (selectedStatus === "low_stock" && product.stock_status === "low_stock") ||
      (selectedStatus === "out_of_stock" && product.stock_status === "out_of_stock");

    const matchesBrand =
      selectedBrand === "all" || product.brand === selectedBrand;

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesBrand && matchesCategory;
  }), [allProducts, searchQuery, selectedStatus, selectedBrand, selectedCategory]);

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Reset para página 1 quando filtros mudam
  const handleFilterChange = (setter: (val: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === paginatedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(paginatedProducts.map((p) => p.id));
    }
  };

  const getStockStatusBadge = (status: string, quantity: number) => {
    switch (status) {
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
            <XCircle className="h-3 w-3" />
            Sem estoque
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
            <AlertCircle className="h-3 w-3" />
            Estoque baixo ({quantity})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
            <CheckCircle className="h-3 w-3" />
            Em estoque ({quantity})
          </span>
        );
    }
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Handlers para os botões de ação
  const handleView = (product: AdminProduct) => {
    setViewingProduct(product);
  };

  const handleEdit = (productId: string) => {
    navigate({ to: "/admin/produtos/$id/editar", params: { id: productId } });
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return;
    const res = await deleteFn({ data: { ids: [product.id] } });
    if (!res.success) {
      toast.error("Erro ao excluir", { description: res.error });
      return;
    }
    toast.success("Produto excluído");
    setSelectedProducts((prev) => prev.filter((id) => id !== product.id));
    refetch();
  };

  const handleToggleActive = async (product: AdminProduct) => {
    const next = !product.is_active;
    const res = await setActiveFn({ data: { ids: [product.id], isActive: next } });
    if (!res.success) {
      toast.error("Erro ao alterar status", { description: res.error });
      return;
    }
    toast.success(next ? "Produto ativado" : "Produto desativado");
    refetch();
  };

  const handleBulkActive = async (isActive: boolean) => {
    if (selectedProducts.length === 0) return;
    const res = await setActiveFn({ data: { ids: selectedProducts, isActive } });
    if (!res.success) {
      toast.error("Erro na ação", { description: res.error });
      return;
    }
    toast.success(`${selectedProducts.length} produto(s) ${isActive ? "ativado(s)" : "desativado(s)"}`);
    setSelectedProducts([]);
    refetch();
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Excluir ${selectedProducts.length} produto(s)? Esta ação não pode ser desfeita.`)) return;
    const res = await deleteFn({ data: { ids: selectedProducts } });
    if (!res.success) {
      toast.error("Erro ao excluir", { description: res.error });
      return;
    }
    toast.success(`${selectedProducts.length} produto(s) excluído(s)`);
    setSelectedProducts([]);
    refetch();
  };

  const handleExport = async () => {
    const res = await exportFn();
    if (!res.success) {
      toast.error("Erro ao exportar", { description: res.error });
      return;
    }
    const cols = ["id", "sku", "name", "brand", "category", "price", "original_price", "quantity", "in_stock", "is_active", "featured", "is_new", "description"];
    const escape = (v: unknown) => {
      const s = v == null ? "" : Array.isArray(v) ? v.join("|") : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(",")];
    for (const row of res.data as any[]) {
      lines.push(cols.map((c) => escape(row[c])).join(","));
    }
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produtos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${(res.data as any[]).length} produtos exportados`);
  };

  const handleDownloadTemplate = () => {
    const cols = ["id", "sku", "name", "brand", "category", "price", "original_price", "quantity", "in_stock", "is_active", "featured", "is_new", "description"];
    const example = [
      ["", "FRAG-001", "Perfume Exemplo 100ml", "Marca Exemplo", "Perfumes", "199.90", "249.90", "10", "true", "true", "false", "false", "Descrição do produto de exemplo"],
      ["", "", "Deixe o SKU vazio para gerar um ID automático", "", "", "0", "", "0", "true", "true", "false", "false", ""],
    ];
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    // "sep=," faz o Excel abrir com as colunas separadas mesmo no locale pt-BR
    const lines = ["sep=,", cols.join(","), ...example.map((row) => row.map(escape).join(","))];
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-importacao-produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast.error("CSV vazio ou inválido");
        return;
      }
      const res = await importFn({ data: { rows } });
      if (!res.success) {
        toast.error("Erro ao importar", { description: res.error, duration: 30000 });
        return;
      }

      const partes = [
        res.atualizados > 0 ? `${res.atualizados} atualizado(s)` : null,
        res.criados > 0 ? `${res.criados} criado(s)` : null,
        res.semMudanca > 0 ? `${res.semMudanca} sem coluna para alterar` : null,
      ].filter(Boolean);
      const resumo = partes.length > 0 ? partes.join(", ") : "nada a fazer";

      // Erros por linha não abortam o lote: o resto foi gravado, e o operador
      // precisa ver o que ficou de fora em vez de um "importado" liso.
      if (res.erros.length > 0) {
        toast.error(`Importado com ressalvas: ${resumo}`, {
          description: res.erros.slice(0, 5).join(" | "),
          duration: 30000,
        });
      } else {
        toast.success(`Importação concluída: ${resumo}`);
      }
      refetch();
    } catch (err: any) {
      toast.error("Erro ao ler CSV", { description: err?.message });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleViewOnSite = (productId: string) => {
    window.open(`/produto/${productId}`, '_blank');
  };

  return (
    <div className="p-6 md:p-8">
      {/* Modal de Visualização */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2]">
              <h2 className="font-serif text-xl text-[#0F3A3E]">Detalhes do Produto</h2>
              <button
                onClick={() => setViewingProduct(null)}
                className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6">
              <div className="flex gap-6">
                {/* Imagem */}
                <div className="w-40 h-40 bg-[#F8F4EA] rounded flex items-center justify-center flex-shrink-0">
                  {viewingProduct.image ? (
                    <img
                      src={viewingProduct.image}
                      alt={viewingProduct.name}
                      className="w-36 h-36 object-contain"
                    />
                  ) : (
                    <Image className="h-12 w-12 text-[#8A938E]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-[#B07B1E] mb-1">
                    {viewingProduct.brand}
                  </p>
                  <h3 className="font-serif text-xl text-[#0F3A3E] mb-2">
                    {viewingProduct.name}
                  </h3>
                  <p className="text-sm text-[#51635F] mb-4">{viewingProduct.category}</p>

                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <p className="text-xs text-[#8A938E]">Preço</p>
                      <p className="font-serif text-xl text-[#0F3A3E]">
                        {formatPrice(viewingProduct.price)}
                      </p>
                    </div>
                    {viewingProduct.compare_at_price && (
                      <div>
                        <p className="text-xs text-[#8A938E]">De</p>
                        <p className="font-serif text-lg text-[#8A938E] line-through">
                          {formatPrice(viewingProduct.compare_at_price)}
                        </p>
                      </div>
                    )}
                  </div>

                  {getStockStatusBadge(viewingProduct.stock_status, viewingProduct.stock_quantity)}
                </div>
              </div>

              {/* Detalhes adicionais */}
              <div className="mt-6 pt-6 border-t border-[#E9E1D2] grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#8A938E] mb-1">SKU</p>
                  <p className="text-sm font-mono text-[#51635F]">{viewingProduct.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A938E] mb-1">ID</p>
                  <p className="text-sm font-mono text-[#51635F]">{viewingProduct.id}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8A938E] mb-1">Status</p>
                  <span
                    className={cn(
                      "inline-flex px-2 py-1 text-xs font-medium rounded",
                      viewingProduct.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {viewingProduct.is_active ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#8A938E] mb-1">Quantidade</p>
                  <p className="text-sm text-[#51635F]">{viewingProduct.stock_quantity} unidades</p>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E9E1D2] bg-[#F8F4EA]">
              <button
                onClick={() => handleViewOnSite(viewingProduct.id)}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] bg-white hover:bg-[#F3EEE3] transition-colors"
              >
                <Eye className="h-4 w-4" />
                Ver no Site
              </button>
              <button
                onClick={() => {
                  handleEdit(viewingProduct.id);
                  setViewingProduct(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
              >
                <Edit className="h-4 w-4" />
                Editar Produto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Package className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Catálogo
            </span>
          </div>
          <h1 className="font-serif text-3xl text-[#0F3A3E]">Produtos</h1>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#51635F] hover:text-[#0F3A3E] underline transition-colors"
            title="Baixar modelo de CSV para importação"
          >
            Baixar modelo
          </button>
          <Link
            to="/admin/produtos/novo"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
          </Link>
          <button
            onClick={() => setShowEnrichModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#B07B1E] text-[#B07B1E] hover:bg-amber-50 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Enriquecer
          </button>
          <button
            onClick={() => setShowSuggestModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#B07B1E] text-[#B07B1E] hover:bg-amber-50 transition-colors"
          >
            <Image className="h-4 w-4" />
            Buscar imagens
          </button>
          <Link
            to="/admin/produtos/imagens"
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#51635F] hover:text-[#0F3A3E] underline transition-colors"
          >
            Revisar imagens
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">
            {allProducts.length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ativos
          </p>
          <p className="font-serif text-2xl text-emerald-600">
            {allProducts.filter((p) => p.is_active).length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Estoque Baixo
          </p>
          <p className="font-serif text-2xl text-amber-600">
            {allProducts.filter((p) => p.stock_status === "low_stock").length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Sem Estoque
          </p>
          <p className="font-serif text-2xl text-red-600">
            {allProducts.filter((p) => p.stock_status === "out_of_stock").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou marca..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => handleFilterChange(setSelectedStatus)(e.target.value)}
            className="px-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="low_stock">Estoque baixo</option>
            <option value="out_of_stock">Sem estoque</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border text-sm transition-colors",
              showFilters
                ? "border-[#B07B1E] text-[#B07B1E]"
                : "border-[#E9E1D2] hover:border-[#B07B1E]"
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[#E9E1D2] grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Marca</label>
              <select
                value={selectedBrand}
                onChange={(e) => handleFilterChange(setSelectedBrand)(e.target.value)}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              >
                <option value="all">Todas</option>
                {uniqueBrands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => handleFilterChange(setSelectedCategory)(e.target.value)}
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              >
                <option value="all">Todas</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Preço mín.</label>
              <input
                type="number"
                placeholder="R$ 0"
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Preço máx.</label>
              <input
                type="number"
                placeholder="R$ 999"
                className="w-full px-3 py-2 border border-[#E9E1D2] text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-[#0F3A3E] text-white p-4 mb-4 flex items-center justify-between">
          <span className="text-sm">
            {selectedProducts.length} produto(s) selecionado(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkActive(true)}
              className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 transition-colors"
            >
              Ativar
            </button>
            <button
              onClick={() => handleBulkActive(false)}
              className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 transition-colors"
            >
              Desativar
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 text-sm bg-red-500/80 hover:bg-red-500 transition-colors"
            >
              Excluir
            </button>
            <button
              onClick={() => setShowMarginModal(true)}
              className="px-3 py-1 text-sm bg-[#B07B1E]/80 hover:bg-[#B07B1E] transition-colors"
            >
              Margem
            </button>
          </div>
        </div>
      )}

      {/* Modal de margem global */}
      {showMarginModal && (
        <MarginModal
          ids={selectedProducts}
          onClose={() => { setShowMarginModal(false); setMarginPreview(null); }}
          onApplied={() => {
            setShowMarginModal(false);
            setMarginPreview(null);
            refetch();
          }}
        />
      )}

      {/* Products Table */}
      <div className="bg-white border border-[#E9E1D2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-[#E9E1D2]"
                  />
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Produto
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  SKU
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Categoria
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Preço
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Estoque
                </th>
                <th className="p-4 text-left text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Status
                </th>
                <th className="p-4 text-center text-[11px] uppercase tracking-wider text-[#8A938E] font-medium">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-[#E9E1D2] hover:bg-[#F8F4EA]/50 transition-colors"
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="rounded border-[#E9E1D2]"
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#F8F4EA] rounded flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <Image className="h-5 w-5 text-[#8A938E]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[#0F3A3E] line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-[#B07B1E]">{product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-[#51635F] font-mono">
                      {product.sku}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-[#51635F]">
                      {product.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-serif text-[#0F3A3E]">
                        {formatPrice(product.price)}
                      </p>
                      {product.compare_at_price && (
                        <p className="text-xs text-[#8A938E] line-through">
                          {formatPrice(product.compare_at_price)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {getStockStatusBadge(product.stock_status, product.stock_quantity)}
                  </td>
                  <td className="p-4">
                    <span
                      className={cn(
                        "inline-flex px-2 py-1 text-xs font-medium rounded",
                        product.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      {product.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleView(product)}
                        title="Visualizar detalhes"
                        className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
                      >
                        <Eye className="h-4 w-4 text-[#51635F]" />
                      </button>
                      <button
                        onClick={() => handleEdit(product.id)}
                        title="Editar produto"
                        className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
                      >
                        <Edit className="h-4 w-4 text-[#51635F]" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(product)}
                        title={product.is_active ? "Desativar produto" : "Ativar produto"}
                        className="p-2 hover:bg-[#F3EEE3] rounded transition-colors"
                      >
                        <Power
                          className={cn(
                            "h-4 w-4",
                            product.is_active ? "text-emerald-600" : "text-[#8A938E]"
                          )}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        title="Excluir produto"
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

        {/* Pagination */}
        <div className="p-4 border-t border-[#E9E1D2] flex items-center justify-between">
          <p className="text-sm text-[#51635F]">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length} produtos
            {filteredProducts.length !== allProducts.length && (
              <span className="text-[#8A938E]"> (filtrado de {allProducts.length} total)</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            {/* Páginas */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "px-3 py-1 text-sm",
                    currentPage === pageNum
                      ? "bg-[#0F3A3E] text-white"
                      : "border border-[#E9E1D2] hover:bg-[#F3EEE3]"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="text-[#8A938E]">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3]"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Enriquecimento em Massa */}
      {showEnrichModal && (
        <EnrichmentModal
          allProducts={allProducts}
          onClose={() => setShowEnrichModal(false)}
          onComplete={() => {
            setShowEnrichModal(false);
            refetch();
          }}
        />
      )}

      {/* Modal de Busca de Imagens em Lote (Serper) */}
      {showSuggestModal && (
        <SuggestImagesModal
          allProducts={allProducts}
          onClose={() => setShowSuggestModal(false)}
        />
      )}
    </div>
  );
}

function EnrichmentModal({
  allProducts,
  onClose,
  onComplete,
}: {
  allProducts: AdminProduct[];
  onClose: () => void;
  onComplete: () => void;
}) {
  const [enrichFields, setEnrichFields] = useState<("images" | "tags" | "dimensions")[]>(["tags", "dimensions"]);
  const [enriching, setEnriching] = useState(false);
  // Bloco atual / total, para o usuário ver que está andando num lote grande.
  const [progress, setProgress] = useState<{ bloco: number; total: number } | null>(null);
  const [result, setResult] = useState<{
    processed: number;
    updated: number;
    errors: string[];
    blocosOk: number;
    blocosTotal: number;
    interrompido: string | null;
    // Contado à parte de `updated`: produto que recebeu só tags e dimensões
    // conta como atualizado, e isso fazia o lote parecer bem-sucedido mesmo
    // sem escrever uma única imagem.
    imagensPedidas: number;
    imagensEscritas: number;
  } | null>(null);

  // Importar server fn fora do handler
  const enrichBatchFn = useServerFn(enrichProductsBatch);

  // Produtos sem foto, sem tags ou sem peso (precisam de enriquecimento)
  // A API do ML vai buscar esses dados automaticamente
  const productsNeedingEnrichment = useMemo(() => {
    // Por ora, enriquecer todos os produtos que têm ID do ML
    // já que a busca é gratuita e pode trazer muitos dados úteis
    return allProducts.filter((p) => p.id.startsWith("MLB"));
  }, [allProducts]);

  const handleEnrich = async () => {
    if (productsNeedingEnrichment.length === 0) {
      toast.info("Não há produtos para enriquecer");
      return;
    }

    // Fatia em blocos de ENRICH_CHUNK_SIZE: o validator da server fn recusa
    // arrays maiores, e uma lista de 660 ids derrubava a ação inteira sem
    // enriquecer nada. Cada bloco é uma chamada independente.
    const blocos = fatiar(
      productsNeedingEnrichment.map((p) => p.id),
      ENRICH_CHUNK_SIZE,
    );

    setEnriching(true);
    setProgress({ bloco: 1, total: blocos.length });
    setResult(null);

    // Acumuladores fora do try: o que já passou é preservado mesmo se um
    // bloco posterior falhar.
    let processed = 0;
    let updated = 0;
    let blocosOk = 0;
    let imagensPedidas = 0;
    let imagensEscritas = 0;
    const errors: string[] = [];
    let interrompido: string | null = null;

    for (let i = 0; i < blocos.length; i++) {
      setProgress({ bloco: i + 1, total: blocos.length });

      try {
        const res = await enrichBatchFn({
          data: { ids: blocos[i], fields: enrichFields },
        });

        if (res?.success) {
          processed += res.processed;
          updated += res.updated;
          imagensPedidas += res.imagens?.pedidas ?? 0;
          imagensEscritas += res.imagens?.escritas ?? 0;
          if (res.errors?.length) errors.push(...res.errors);
          blocosOk++;
        } else {
          // A server fn devolve os erros em `errors`, não em `error`.
          const motivo = res?.errors?.join("; ") || "Erro desconhecido";
          errors.push(`Bloco ${i + 1}: ${motivo}`);
          interrompido = motivo;
          break;
        }
      } catch (e: any) {
        const motivo = e?.message || "Erro desconhecido";
        errors.push(`Bloco ${i + 1}: ${motivo}`);
        interrompido = motivo;
        break;
      }
    }

    setResult({
      processed,
      updated,
      errors,
      blocosOk,
      blocosTotal: blocos.length,
      interrompido,
      imagensPedidas,
      imagensEscritas,
    });
    setEnriching(false);
    setProgress(null);

    if (interrompido) {
      toast.error(
        `Interrompido no bloco ${blocosOk + 1} de ${blocos.length}. ` +
          `${updated} produto(s) atualizado(s) antes da falha foram mantidos.`,
        { description: interrompido, duration: 30000 },
      );
    } else if (imagensPedidas > 0 && imagensEscritas === 0) {
      // Não anuncia sucesso quando o que o operador queria (imagem) não veio.
      toast.error(`Nenhuma imagem obtida em ${imagensPedidas} produto(s)`, {
        description:
          "A API do Mercado Livre não entrega anúncio de terceiro. Use \"Buscar imagem\" no editor do produto.",
        duration: 30000,
      });
    } else {
      toast.success(`Processados ${processed} produtos, ${updated} atualizados`);
    }
  };

  const toggleField = (field: "images" | "tags" | "dimensions") => {
    if (enrichFields.includes(field)) {
      setEnrichFields(enrichFields.filter((f) => f !== field));
    } else {
      setEnrichFields([...enrichFields, field]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#B07B1E]" />
            <h2 className="font-serif text-lg text-[#0F3A3E]">Enriquecer Produtos</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3EEE3] rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {result ? (
            <div className="py-4">
              {result.interrompido ? (
                <>
                  {/* Interrompido no meio: o que já foi gravado NÃO é perdido,
                      e o aviso diz exatamente onde parou para o operador poder
                      rodar de novo sabendo o que falta. */}
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0F3A3E] mb-2 text-center">
                    Interrompido
                  </p>
                  <p className="text-sm text-[#51635F] text-center">
                    Falhou no bloco {result.blocosOk + 1} de {result.blocosTotal}.
                  </p>
                  <p className="text-sm text-[#51635F] text-center mt-1">
                    <strong>{result.updated}</strong> de {result.processed} produtos
                    processados foram atualizados e <strong>não</strong> se perderam.
                  </p>
                  <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs text-red-800 break-words">{result.interrompido}</p>
                  </div>
                </>
              ) : (
                <>
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0F3A3E] mb-2 text-center">Concluído!</p>
                  <p className="text-sm text-[#51635F] text-center">
                    {result.updated} de {result.processed} produtos atualizados
                    {result.blocosTotal > 1 && ` (${result.blocosTotal} blocos)`}
                  </p>
                </>
              )}

              {/* Imagem tem contador próprio porque é o campo que o operador
                  vem buscar. "N atualizados" pode ser só tags e dimensões
                  estimadas — foi exatamente o que fez o lote parecer bem
                  sucedido sem trazer foto nenhuma. */}
              {result.imagensPedidas > 0 && (
                <div
                  className={cn(
                    "mt-4 rounded p-3 border",
                    result.imagensEscritas === 0
                      ? "bg-red-50 border-red-200"
                      : "bg-[#F3EEE3] border-[#E9E1D2]",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs",
                      result.imagensEscritas === 0 ? "text-red-800" : "text-[#51635F]",
                    )}
                  >
                    <strong>
                      Imagens: {result.imagensEscritas} de {result.imagensPedidas}
                    </strong>
                    {result.imagensEscritas === 0 && (
                      <>
                        {" "}
                        — a API do Mercado Livre só entrega anúncio da própria conta; item de
                        terceiro responde 403. Para estes produtos, use{" "}
                        <strong>Buscar imagem</strong> no editor do produto (busca por texto) ou
                        envie a foto manualmente.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Erros por produto: o lote pode terminar "com sucesso" e ainda
                  ter itens que falharam individualmente. */}
              {result.errors.length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs text-[#8A938E] cursor-pointer">
                    {result.errors.length} aviso(s) por produto
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto bg-[#F3EEE3] rounded p-2">
                    {result.errors.slice(0, 50).map((err, i) => (
                      <p key={i} className="text-[11px] text-[#51635F] break-words">
                        {err}
                      </p>
                    ))}
                    {result.errors.length > 50 && (
                      <p className="text-[11px] text-[#8A938E] mt-1">
                        ...e outros {result.errors.length - 50}
                      </p>
                    )}
                  </div>
                </details>
              )}

              <div className="flex justify-center">
                <button
                  onClick={onComplete}
                  className="mt-6 px-6 py-2 bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#51635F] mb-4">
                Enrichecer <strong>{productsNeedingEnrichment.length}</strong> produtos que estão sem foto ou tags.
              </p>

              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrichFields.includes("tags")}
                    onChange={() => toggleField("tags")}
                    className="w-4 h-4 accent-[#B07B1E]"
                  />
                  <span className="text-sm">Gerar tags automaticamente</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrichFields.includes("images")}
                    onChange={() => toggleField("images")}
                    className="w-4 h-4 accent-[#B07B1E]"
                  />
                  <span className="text-sm">Buscar imagens na internet</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enrichFields.includes("dimensions")}
                    onChange={() => toggleField("dimensions")}
                    className="w-4 h-4 accent-[#B07B1E]"
                  />
                  <span className="text-sm">Buscar peso e dimensões (Mercado Livre)</span>
                </label>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                <p className="text-xs text-amber-800">
                  <strong>O que será feito:</strong><br />
                  - Tags: Gera tags inteligentes baseadas no nome, marca e categoria<br />
                  - Imagens: Busca foto do Mercado Livre pelo ID do produto<br />
                  - Dimensões: Captura peso, altura, largura e comprimento do ML
                </p>
              </div>

              {enriching && (
                <div className="mb-4">
                  <div className="h-2 bg-[#E9E1D2] rounded overflow-hidden">
                    {/* Largura real do progresso. Antes era 50% fixo, o que
                        fazia um lote de 660 produtos parecer travado. */}
                    <div
                      className="h-full bg-[#B07B1E] transition-all"
                      style={{
                        width: progress
                          ? `${Math.round(((progress.bloco - 1) / progress.total) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#8A938E] mt-2 text-center">
                    {progress && progress.total > 1
                      ? `Processando bloco ${progress.bloco} de ${progress.total}...`
                      : "Processando..."}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleEnrich}
                  disabled={enriching || enrichFields.length === 0 || productsNeedingEnrichment.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#B07B1E] text-white hover:bg-[#9A6A1A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Enriquecer {productsNeedingEnrichment.length} produtos
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SuggestImagesModal({
  allProducts,
  onClose,
}: {
  allProducts: AdminProduct[];
  onClose: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    bloco: number;
    total: number;
    candidatas: number;
  } | null>(null);
  // Pedido de parada do operador. Ref, não state: o loop lê o valor a cada
  // volta e um state novo não chegaria à closure já em execução.
  const pararRef = useRef(false);
  const [result, setResult] = useState<{
    processed: number;
    comCandidatas: number;
    semCandidatas: number;
    candidatasInseridas: number;
    pulados: number;
    errors: string[];
    blocosOk: number;
    blocosTotal: number;
    interrompido: string | null;
    parado: boolean;
  } | null>(null);

  const suggestFn = useServerFn(suggestProductImagesBatch);

  // Alvo: produtos sem foto. É a fila que a busca em lote existe para atender —
  // os ~1210 importados por CSV que ficaram sem imagem porque a API do ML não
  // entrega anúncio de terceiro.
  const productsWithoutImage = useMemo(
    () => allProducts.filter((p) => !p.image),
    [allProducts],
  );

  const handleSuggest = async () => {
    if (productsWithoutImage.length === 0) {
      toast.info("Nenhum produto sem imagem");
      return;
    }

    // Blocos pequenos (IMAGE_CHUNK_SIZE), não os 500 do enriquecimento: aqui
    // cada produto é uma chamada HTTP ao Serper e um bloco grande estoura o
    // timeout do proxy antes de responder.
    const blocos = fatiar(
      productsWithoutImage.map((p) => p.id),
      IMAGE_CHUNK_SIZE,
    );

    pararRef.current = false;
    setRunning(true);
    setProgress({ bloco: 1, total: blocos.length, candidatas: 0 });
    setResult(null);

    // Acumuladores fora do try: blocos que já passaram não se perdem se um
    // posterior falhar.
    let processed = 0;
    let comCandidatas = 0;
    let semCandidatas = 0;
    let candidatasInseridas = 0;
    let pulados = 0;
    let blocosOk = 0;
    const errors: string[] = [];
    let interrompido: string | null = null;
    let parado = false;

    for (let i = 0; i < blocos.length; i++) {
      if (pararRef.current) {
        parado = true;
        break;
      }
      setProgress({ bloco: i + 1, total: blocos.length, candidatas: candidatasInseridas });
      try {
        const res = await suggestFn({ data: { ids: blocos[i] } });
        if (res?.success) {
          processed += res.processed;
          comCandidatas += res.comCandidatas;
          semCandidatas += res.semCandidatas;
          candidatasInseridas += res.candidatasInseridas;
          pulados += res.pulados ?? 0;
          if (res.errors?.length) errors.push(...res.errors);
          blocosOk++;
        } else {
          const motivo = res?.errors?.join("; ") || "Erro desconhecido";
          errors.push(`Bloco ${i + 1}: ${motivo}`);
          interrompido = motivo;
          break;
        }
      } catch (e: any) {
        const motivo = e?.message || "Erro desconhecido";
        errors.push(`Bloco ${i + 1}: ${motivo}`);
        interrompido = motivo;
        break;
      }
    }

    setResult({
      processed,
      comCandidatas,
      semCandidatas,
      candidatasInseridas,
      pulados,
      errors,
      blocosOk,
      blocosTotal: blocos.length,
      interrompido,
      parado,
    });
    setRunning(false);
    setProgress(null);
    pararRef.current = false;

    if (interrompido) {
      toast.error(
        `Interrompido no bloco ${blocosOk + 1} de ${blocos.length}. ` +
          `As candidatas dos ${comCandidatas} produto(s) já processados foram salvas.`,
        { description: interrompido, duration: 30000 },
      );
    } else if (parado) {
      toast.info(
        `Parado a pedido. ${candidatasInseridas} candidata(s) de ${comCandidatas} produto(s) ` +
          `já estão salvas. Rodar de novo continua de onde parou.`,
        { duration: 15000 },
      );
    } else if (candidatasInseridas === 0 && pulados > 0) {
      toast.info(
        `Nada novo: os ${pulados} produto(s) já tinham candidata esperando revisão.`,
        { duration: 15000 },
      );
    } else if (candidatasInseridas === 0) {
      toast.error("Nenhuma candidata encontrada", {
        description: "A busca não retornou imagens para os produtos selecionados.",
        duration: 20000,
      });
    } else {
      toast.success(
        `${candidatasInseridas} candidata(s) para ${comCandidatas} produto(s). Revise em "Revisar imagens".`,
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2]">
          <div className="flex items-center gap-2">
            <Image className="h-5 w-5 text-[#B07B1E]" />
            <h2 className="font-serif text-lg text-[#0F3A3E]">Buscar imagens em lote</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3EEE3] rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {result ? (
            <div className="py-4">
              {result.interrompido ? (
                <>
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0F3A3E] mb-2 text-center">
                    Interrompido
                  </p>
                  <p className="text-sm text-[#51635F] text-center">
                    Falhou no bloco {result.blocosOk + 1} de {result.blocosTotal}.
                  </p>
                  <p className="text-sm text-[#51635F] text-center mt-1">
                    As candidatas dos <strong>{result.comCandidatas}</strong> produtos já
                    processados foram salvas e <strong>não</strong> se perderam. Rodar de novo
                    continua de onde parou.
                  </p>
                  <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-xs text-red-800 break-words">{result.interrompido}</p>
                  </div>
                </>
              ) : result.parado ? (
                <>
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0F3A3E] mb-2 text-center">
                    Parado
                  </p>
                  <p className="text-sm text-[#51635F] text-center">
                    {result.blocosOk} de {result.blocosTotal} blocos concluídos.{" "}
                    {result.candidatasInseridas} candidata(s) salva(s) para{" "}
                    {result.comCandidatas} produto(s).
                  </p>
                  <p className="text-sm text-[#51635F] text-center mt-1">
                    Rodar de novo continua de onde parou: produto que já tem candidata
                    pendente é pulado.
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <p className="text-lg font-medium text-[#0F3A3E] mb-2 text-center">
                    Busca concluída
                  </p>
                  <p className="text-sm text-[#51635F] text-center">
                    {result.candidatasInseridas} candidata(s) salva(s) para{" "}
                    {result.comCandidatas} de {result.processed} produtos.
                  </p>
                  {result.semCandidatas > 0 && (
                    <p className="text-xs text-[#8A938E] text-center mt-1">
                      {result.semCandidatas} produto(s) sem candidata (a busca não retornou
                      imagem).
                    </p>
                  )}
                </>
              )}

              {result.pulados > 0 && (
                <p className="text-xs text-[#8A938E] text-center mt-2">
                  {result.pulados} produto(s) pulado(s): já tinham candidata esperando
                  revisão (sem gastar busca nova).
                </p>
              )}

              {result.errors.length > 0 && (
                <details className="mt-4">
                  <summary className="text-xs text-[#8A938E] cursor-pointer">
                    {result.errors.length} aviso(s)
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto bg-[#F3EEE3] rounded p-2">
                    {result.errors.slice(0, 50).map((err, i) => (
                      <p key={i} className="text-[11px] text-[#51635F] break-words">
                        {err}
                      </p>
                    ))}
                    {result.errors.length > 50 && (
                      <p className="text-[11px] text-[#8A938E] mt-1">
                        ...e outros {result.errors.length - 50}
                      </p>
                    )}
                  </div>
                </details>
              )}

              <div className="flex justify-center gap-3 mt-6">
                {result.candidatasInseridas > 0 && (
                  <Link
                    to="/admin/produtos/imagens"
                    className="px-6 py-2 bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
                  >
                    Revisar agora
                  </Link>
                )}
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#51635F] mb-4">
                Busca fotos na web (por nome + marca) para{" "}
                <strong>{productsWithoutImage.length}</strong> produtos sem imagem. Nada é
                gravado direto: as candidatas ficam para revisão manual em{" "}
                <strong>Revisar imagens</strong>.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                <p className="text-xs text-amber-800">
                  A busca automática erra com frequência (tamanho, embalagem antiga, marca
                  parecida). Por isso a imagem só entra no produto depois que você aprovar a
                  candidata correta na tela de revisão.
                </p>
              </div>

              {running && (
                <div className="mb-4">
                  <div className="h-2 bg-[#E9E1D2] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#B07B1E] transition-all"
                      style={{
                        width: progress
                          ? `${Math.round(((progress.bloco - 1) / progress.total) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#8A938E] mt-2 text-center">
                    {progress
                      ? `Bloco ${progress.bloco} de ${progress.total} · ${progress.candidatas} candidata(s) já salva(s)`
                      : "Buscando..."}
                  </p>
                  {/* Lote longo (~35s por bloco, ~1210 produtos = 101 blocos). Parar
                      é seguro: o que já entrou no banco fica, e rodar de novo pula
                      quem já tem candidata pendente. */}
                  <div className="flex justify-center mt-2">
                    <button
                      onClick={() => {
                        pararRef.current = true;
                        toast.info("Vai parar depois do bloco atual...");
                      }}
                      className="text-xs text-[#51635F] underline hover:text-[#0F3A3E]"
                    >
                      Parar depois deste bloco
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSuggest}
                  disabled={running || productsWithoutImage.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#B07B1E] text-white hover:bg-[#9A6A1A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
                  Buscar para {productsWithoutImage.length} produtos
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal de margem global ──────────────────────────────────────────────────
function MarginModal({
  ids,
  onClose,
  onApplied,
}: {
  ids: string[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const applyFn = useServerFn(applyGlobalMargin);
  const [marginPct, setMarginPct] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const handlePreview = async () => {
    const pct = parseFloat(marginPct);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
      toast.error("Margem inválida. Digite um valor entre 0,1% e 99,9%.");
      return;
    }
    setLoading(true);
    try {
      const res = await applyFn({
        data: { targetMargin: pct / 100, ids, dryRun: true },
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setPreview(res);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao calcular preview");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    setApplying(true);
    try {
      const res = await applyFn({
        data: { targetMargin: preview.targetMargin, ids, dryRun: false },
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Margem aplicada em ${res.atualizados} produto(s).`);
      onApplied();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao aplicar margem");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-lg w-full rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-[#E9E1D2]">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-[#B07B1E]" />
            <h2 className="font-serif text-lg text-[#0F3A3E]">Margem global</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3EEE3] rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-[#51635F] mb-4">
            {ids.length} produto(s) selecionado(s). A margem será aplicada apenas
            aos que tiverem <strong>custo</strong> definido.
          </p>

          <label className="block text-xs text-[#8A938E] mb-1">
            Margem sobre preço de venda (%)
          </label>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="99.9"
              value={marginPct}
              onChange={(e) => setMarginPct(e.target.value)}
              placeholder="Ex: 40"
              className="flex-1 px-3 py-2 border border-[#E9E1D2] text-sm"
            />
            <button
              onClick={handlePreview}
              disabled={loading}
              className="px-4 py-2 bg-[#0F3A3E] text-white text-sm hover:bg-[#1A4F54] disabled:opacity-50"
            >
              {loading ? "Calculando..." : "Pré-visualizar"}
            </button>
          </div>

          {preview && (
            <div className="bg-[#F8F4EA] border border-[#E9E1D2] p-4 mb-4">
              <p className="text-sm text-[#0F3A3E] font-medium mb-2">
                Preview — {preview.afetados} produto(s) com custo
              </p>
              {preview.semCusto > 0 && (
                <p className="text-xs text-[#8A938E] mb-2">
                  {preview.semCusto} produto(s) ignorado(s) por não terem custo.
                </p>
              )}
              <p className="text-xs text-[#51635F]">
                Faixa de preço:{" "}
                <strong>R$ {preview.faixaPrecoAntes}</strong> →{" "}
                <strong>R$ {preview.faixaPrecoDepois}</strong>
              </p>
              {preview.preview && preview.preview.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto border-t border-[#E9E1D2] pt-2">
                  {preview.preview.slice(0, 20).map((p: any) => (
                    <div key={p.id} className="flex justify-between text-xs text-[#51635F] py-1">
                      <span className="truncate max-w-[200px]">{p.name}</span>
                      <span>
                        R$ {p.oldPrice.toFixed(2)} → R$ {p.newPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {preview.preview.length > 20 && (
                    <p className="text-xs text-[#8A938E] mt-1">
                      ...e mais {preview.preview.length - 20} produto(s)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors text-sm"
            >
              Cancelar
            </button>
            {preview && (
              <button
                onClick={handleApply}
                disabled={applying}
                className="px-4 py-2 bg-[#B07B1E] text-white text-sm hover:bg-[#8F6418] disabled:opacity-50"
              >
                {applying ? "Aplicando..." : `Aplicar margem em ${preview.afetados} produto(s)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProdutos;
