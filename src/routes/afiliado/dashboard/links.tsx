import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Plus,
  Copy,
  ExternalLink,
  BarChart3,
  Search,
  Eye,
  ShoppingBag,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAffiliateStore } from "@/stores/affiliateStore";
import { linkService } from "@/lib/supabase";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/data/products";

export const Route = createFileRoute("/afiliado/dashboard/links")({
  component: LinksPage,
});

function LinksPage() {
  const { links, loadLinks, createLink, affiliate } = useAffiliateStore();
  const [isCreating, setIsCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { products } = useProducts();

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateLink = async (product?: Product) => {
    setIsCreating(true);
    try {
      const newLink = await createLink(
        product?.id,
        product?.name,
        product?.images?.[0],
        product?.price
      );
      toast.success("Link criado com sucesso!");
      setShowModal(false);
      setSelectedProduct(null);
      setSearchQuery("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar link");
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = (code: string, productId?: string) => {
    const url = linkService.generateLinkUrl(code, productId);
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-[24px] md:text-[32px] text-[#0F3A3E]">Meus Links</h1>
          <p className="text-[14px] text-[#75827E] mt-1">
            Gerencie seus links de afiliado e acompanhe a performance
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 bg-[#B07B1E] hover:bg-[#C68C28] text-white px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Link
        </button>
      </div>

      {/* Main Link Card */}
      <div className="bg-[#0F3A3E] text-white p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#E8C25A] mb-1">
              Link Principal (todos os produtos)
            </p>
            <p className="text-[13px] text-white/70">
              Use este link para qualquer produto da loja
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/10 px-4 py-2.5 text-[13px] truncate max-w-[280px]">
              {affiliate?.affiliate_code
                ? linkService.generateLinkUrl(affiliate.affiliate_code)
                : "..."}
            </div>
            <button
              onClick={() => affiliate?.affiliate_code && copyLink(affiliate.affiliate_code)}
              className="bg-[#E8C25A] hover:bg-[#F0D06A] text-[#0F3A3E] p-2.5 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white border border-[#E9E1D2]">
        <div className="p-4 md:p-6 border-b border-[#E9E1D2]">
          <h2 className="font-serif text-[18px] text-[#0F3A3E]">
            Links de Produtos Específicos
          </h2>
          <p className="text-[12px] text-[#75827E] mt-1">
            Crie links para produtos específicos e acompanhe quais convertem melhor
          </p>
        </div>

        {links.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <BarChart3 className="h-12 w-12 text-[#E0D8C7] mx-auto mb-4" />
            <p className="text-[15px] text-[#0F3A3E] font-medium">
              Nenhum link criado ainda
            </p>
            <p className="text-[13px] text-[#75827E] mt-1 max-w-[300px] mx-auto">
              Crie links para produtos específicos para acompanhar a performance individual.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-2 bg-[#0F3A3E] hover:bg-[#16504F] text-white px-6 py-3 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Criar Primeiro Link
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E9E1D2] bg-[#F8F4EA]">
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Produto
                  </th>
                  <th className="text-center p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Cliques
                  </th>
                  <th className="text-center p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Conversões
                  </th>
                  <th className="text-center p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium hidden md:table-cell">
                    Taxa
                  </th>
                  <th className="text-left p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium hidden lg:table-cell">
                    Criado em
                  </th>
                  <th className="text-right p-4 text-[11px] uppercase tracking-[0.1em] text-[#75827E] font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-b border-[#F3EEE3] hover:bg-[#FDFCFA]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {link.product_image ? (
                          <img
                            src={link.product_image}
                            alt={link.product_name || ""}
                            className="w-12 h-12 object-cover bg-[#F8F4EA]"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-[#F8F4EA] flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-[#B07B1E]" />
                          </div>
                        )}
                        <div>
                          <p className="text-[13px] font-medium text-[#0F3A3E] line-clamp-1">
                            {link.product_name || "Link Geral"}
                          </p>
                          <p className="text-[11px] text-[#75827E]">
                            {link.code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[14px] text-[#0F3A3E]">
                        {link.clicks?.toLocaleString("pt-BR") || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-[14px] text-[#1C6B4A]">
                        {link.conversions || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center hidden md:table-cell">
                      <span className="text-[14px] text-[#0F3A3E]">
                        {link.clicks > 0
                          ? ((link.conversions / link.clicks) * 100).toFixed(1)
                          : "0"}
                        %
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-[12px] text-[#75827E]">
                        {formatDate(link.created_at)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => copyLink(link.code, link.product_id)}
                          className="p-2 text-[#75827E] hover:text-[#0F3A3E] hover:bg-[#F3EEE3] transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {link.product_id && (
                          <Link
                            to="/produto/$id"
                            params={{ id: link.product_id }}
                            target="_blank"
                            className="p-2 text-[#75827E] hover:text-[#0F3A3E] hover:bg-[#F3EEE3] transition-colors"
                            title="Ver produto"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Link Modal */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px] bg-white z-50 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#E9E1D2]">
              <h2 className="font-serif text-[20px] text-[#0F3A3E]">Criar Novo Link</h2>
              <p className="text-[13px] text-[#75827E] mt-1">
                Escolha um produto ou crie um link geral
              </p>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A938E]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full pl-10 pr-4 py-3 bg-[#F8F4EA] border border-[#E0D8C7] text-[14px] placeholder:text-[#8A938E] focus:border-[#B07B1E] outline-none"
                />
              </div>

              {/* Products List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {filteredProducts.slice(0, 20).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full flex items-center gap-3 p-3 border transition-colors text-left ${
                      selectedProduct?.id === product.id
                        ? "border-[#B07B1E] bg-[#FDF8F0]"
                        : "border-[#E9E1D2] hover:border-[#B07B1E]/50"
                    }`}
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover bg-[#F8F4EA]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#0F3A3E] truncate">
                        {product.name}
                      </p>
                      <p className="text-[11px] text-[#B07B1E]">{product.brand}</p>
                    </div>
                    <p className="text-[13px] font-medium text-[#0F3A3E]">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-[#E9E1D2] flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleCreateLink()}
                disabled={isCreating}
                className="flex-1 flex items-center justify-center gap-2 border border-[#0F3A3E] text-[#0F3A3E] hover:bg-[#0F3A3E] hover:text-white px-4 py-3 text-[12px] uppercase tracking-[0.12em] font-medium transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Link Geral"
                )}
              </button>
              <button
                onClick={() => selectedProduct && handleCreateLink(selectedProduct)}
                disabled={!selectedProduct || isCreating}
                className="flex-1 flex items-center justify-center gap-2 bg-[#B07B1E] hover:bg-[#C68C28] text-white px-4 py-3 text-[12px] uppercase tracking-[0.12em] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Criar Link do Produto"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
