import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  Image,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Store,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { syncAllProducts, isShopifyConfigured, getSyncStats } from "@/lib/shopify-sync";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/produtos")({
  component: AdminProdutos,
});

// Mock data - será substituído por dados reais do Supabase
const MOCK_PRODUCTS = [
  {
    id: "1",
    sku: "KER-001",
    name: "Kérastase Elixir Ultime Óleo Original",
    brand: "Kérastase",
    category: "Finalizadores",
    price: 289.90,
    compare_at_price: 349.90,
    stock_quantity: 45,
    stock_status: "in_stock",
    is_active: true,
    image: "/images/products/kerastase-elixir.png",
  },
  {
    id: "2",
    sku: "WEL-002",
    name: "Wella Professionals Oil Reflections",
    brand: "Wella",
    category: "Tratamentos",
    price: 159.90,
    compare_at_price: null,
    stock_quantity: 3,
    stock_status: "low_stock",
    is_active: true,
    image: "/images/products/wella-oil.png",
  },
  {
    id: "3",
    sku: "LOR-003",
    name: "L'Oréal Professionnel Serie Expert Absolut Repair",
    brand: "L'Oréal",
    category: "Máscaras",
    price: 199.90,
    compare_at_price: 229.90,
    stock_quantity: 0,
    stock_status: "out_of_stock",
    is_active: true,
    image: "/images/products/loreal-absolut.png",
  },
  {
    id: "4",
    sku: "SCH-004",
    name: "Schwarzkopf BC Bonacure Peptide Repair",
    brand: "Schwarzkopf",
    category: "Shampoos",
    price: 89.90,
    compare_at_price: null,
    stock_quantity: 28,
    stock_status: "in_stock",
    is_active: false,
    image: "/images/products/schwarzkopf-peptide.png",
  },
];

function AdminProdutos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const handleShopifySync = async () => {
    if (!isShopifyConfigured()) {
      toast.error("Shopify não configurado", {
        description: "Configure as variáveis VITE_SHOPIFY_STORE_DOMAIN e VITE_SHOPIFY_STOREFRONT_TOKEN no .env"
      });
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: 0 });

    try {
      const result = await syncAllProducts((current, total) => {
        setSyncProgress({ current, total });
      });

      if (result.success) {
        toast.success("Sincronização concluída!", {
          description: `${result.imported} importados, ${result.updated} atualizados`
        });
      } else {
        toast.error("Erro na sincronização", {
          description: result.errors[0] || "Verifique as configurações"
        });
      }
    } catch (error: any) {
      toast.error("Erro ao sincronizar", {
        description: error.message
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredProducts = MOCK_PRODUCTS.filter((product) => {
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

    return matchesSearch && matchesStatus;
  });

  const toggleSelectProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id));
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

  return (
    <div className="p-6 md:p-8">
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
          <button
            onClick={handleShopifySync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#00875A] text-[#00875A] hover:bg-[#00875A]/10 transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {syncProgress.total > 0
                  ? `${syncProgress.current}/${syncProgress.total}`
                  : "Sincronizando..."
                }
              </>
            ) : (
              <>
                <Store className="h-4 w-4" />
                Sincronizar Shopify
              </>
            )}
          </button>
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
            {MOCK_PRODUCTS.length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Ativos
          </p>
          <p className="font-serif text-2xl text-emerald-600">
            {MOCK_PRODUCTS.filter((p) => p.is_active).length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Estoque Baixo
          </p>
          <p className="font-serif text-2xl text-amber-600">
            {MOCK_PRODUCTS.filter((p) => p.stock_status === "low_stock").length}
          </p>
        </div>
        <div className="bg-white border border-[#E9E1D2] p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Sem Estoque
          </p>
          <p className="font-serif text-2xl text-red-600">
            {MOCK_PRODUCTS.filter((p) => p.stock_status === "out_of_stock").length}
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E9E1D2] text-sm focus:outline-none focus:border-[#B07B1E]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
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
              <select className="w-full px-3 py-2 border border-[#E9E1D2] text-sm">
                <option>Todas</option>
                <option>Kérastase</option>
                <option>L'Oréal</option>
                <option>Wella</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A938E] mb-1">Categoria</label>
              <select className="w-full px-3 py-2 border border-[#E9E1D2] text-sm">
                <option>Todas</option>
                <option>Shampoos</option>
                <option>Tratamentos</option>
                <option>Finalizadores</option>
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
                    checked={selectedProducts.length === filteredProducts.length}
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
              {filteredProducts.map((product) => (
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
                      <button className="p-2 hover:bg-[#F3EEE3] rounded transition-colors">
                        <Eye className="h-4 w-4 text-[#51635F]" />
                      </button>
                      <button className="p-2 hover:bg-[#F3EEE3] rounded transition-colors">
                        <Edit className="h-4 w-4 text-[#51635F]" />
                      </button>
                      <button className="p-2 hover:bg-red-50 rounded transition-colors">
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
            Mostrando {filteredProducts.length} de {MOCK_PRODUCTS.length} produtos
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3] disabled:opacity-50">
              Anterior
            </button>
            <button className="px-3 py-1 bg-[#0F3A3E] text-white text-sm">1</button>
            <button className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3]">
              2
            </button>
            <button className="px-3 py-1 border border-[#E9E1D2] text-sm hover:bg-[#F3EEE3]">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminProdutos;
