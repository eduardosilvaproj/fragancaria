import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  Image,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PRODUCTS, BRANDS, CATEGORIES, type Product } from "@/data/products";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProdutos,
});

// Mapear produtos locais para o formato da tabela admin
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
}

function mapProductToAdmin(product: Product): AdminProduct {
  const quantity = product.quantity ?? 10;
  let stock_status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";

  if (!product.inStock || quantity === 0) {
    stock_status = "out_of_stock";
  } else if (quantity <= 5) {
    stock_status = "low_stock";
  }

  return {
    id: product.id,
    sku: product.sku || product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    compare_at_price: product.originalPrice || null,
    stock_quantity: quantity,
    stock_status,
    is_active: product.inStock,
    image: product.images[0] || null,
  };
}

// Número de produtos por página
const ITEMS_PER_PAGE = 20;

function AdminProdutos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingProduct, setViewingProduct] = useState<AdminProduct | null>(null);

  // Converter todos os produtos para o formato admin
  const allProducts = useMemo(() => PRODUCTS.map(mapProductToAdmin), []);

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
    // Como a rota de edição ainda não existe, mostrar um toast informativo
    toast.info("Edição em desenvolvimento", {
      description: "A página de edição de produtos será implementada em breve. Por enquanto, edite o arquivo src/data/products.ts"
    });
  };

  const handleDelete = (product: AdminProduct) => {
    // Como os produtos são locais (arquivo estático), apenas mostramos um aviso
    toast.error("Ação não disponível", {
      description: "Os produtos são gerenciados via arquivo local. Para remover, edite o arquivo src/data/products.ts"
    });
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
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors">
            <Upload className="h-4 w-4" />
            Importar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] hover:bg-[#F3EEE3] transition-colors">
            <Download className="h-4 w-4" />
            Exportar
          </button>
          <Link
            to="/admin/produtos/novo"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F3A3E] text-white hover:bg-[#16504F] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Produto
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
            <button className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 transition-colors">
              Ativar
            </button>
            <button className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 transition-colors">
              Desativar
            </button>
            <button className="px-3 py-1 text-sm bg-red-500/80 hover:bg-red-500 transition-colors">
              Excluir
            </button>
          </div>
        </div>
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
    </div>
  );
}

export default AdminProdutos;
