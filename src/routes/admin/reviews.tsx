import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import {
  Star,
  Search,
  MessageSquare,
  Check,
  X,
  Camera,
  Award,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listReviewsForAdmin,
  moderateReview,
  replyToReview,
  type AdminReviewRow,
} from "@/lib/reviews-admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Aprovado", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-700" },
};

function AdminReviews() {
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listReviewsForAdmin({ data: {} });
      if (res.success) {
        setReviews(res.data);
      } else {
        toast.error("Erro ao carregar avaliações: " + res.error);
      }
    } catch {
      toast.error("Erro ao carregar avaliações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleModerate = async (
    reviewId: string,
    status: "approved" | "rejected",
  ) => {
    setActing(reviewId);
    const res = await moderateReview({ data: { reviewId, status } });
    setActing(null);
    if (res.success) {
      toast.success(status === "approved" ? "Avaliação aprovada" : "Avaliação rejeitada");
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status } : r)),
      );
    } else {
      toast.error("Erro: " + res.error);
    }
  };

  const handleReply = async (reviewId: string) => {
    const reply = window.prompt("Resposta da loja:");
    if (!reply?.trim()) return;
    const res = await replyToReview({ data: { reviewId, reply: reply.trim() } });
    if (res.success) {
      toast.success("Resposta enviada");
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, storeReply: reply.trim() } : r)),
      );
    } else {
      toast.error("Erro: " + res.error);
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchQuery ||
      (review.customerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (review.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || review.status === statusFilter;
    const matchesRating =
      ratingFilter === "all" || review.rating === parseInt(ratingFilter);
    return matchesSearch && matchesStatus && matchesRating;
  });

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  const pendingCount = reviews.filter((r) => r.status === "pending").length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Star className="h-6 w-6 text-[#B07B1E]" />
            <span className="text-[11px] tracking-[0.2em] text-[#B07B1E] uppercase font-medium">
              Gestão
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#0F3A3E]">
            Reviews & UGC
          </h1>
          <p className="text-[#51635F] mt-2">
            Gerencie avaliações de clientes e conteúdo gerado pelos usuários.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-[#E9E1D2] rounded-lg hover:bg-[#F8F4EA] disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mb-3">
            <Star className="h-5 w-5 text-yellow-600 fill-yellow-500" />
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Média Geral
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{avgRating.toFixed(1)}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3">
            <MessageSquare className="h-5 w-5 text-amber-600" />
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pendentes
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{pendingCount}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Aprovados
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{approvedCount}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
            <Award className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total Reviews
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{reviews.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E9E1D2] p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 bg-[#F5F3EE] rounded-lg px-4 py-2">
            <Search className="h-4 w-4 text-[#8A938E]" />
            <input
              type="text"
              placeholder="Buscar por cliente, produto ou conteúdo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#F5F3EE] rounded-lg px-4 py-2 text-sm outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovados</option>
            <option value="rejected">Rejeitados</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-[#F5F3EE] rounded-lg px-4 py-2 text-sm outline-none"
          >
            <option value="all">Todas as notas</option>
            <option value="5">5 estrelas</option>
            <option value="4">4 estrelas</option>
            <option value="3">3 estrelas</option>
            <option value="2">2 estrelas</option>
            <option value="1">1 estrela</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="bg-white border border-[#E9E1D2] p-12 text-center text-[#8A938E]">
          Carregando avaliações...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white border border-[#E9E1D2] p-12 text-center">
          <Star className="h-12 w-12 text-[#E9E1D2] mx-auto mb-4" />
          <p className="text-[#8A938E]">
            {reviews.length === 0
              ? "Nenhuma avaliação ainda. As avaliações dos clientes aparecerão aqui."
              : "Nenhuma avaliação encontrada com esses filtros."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white border border-[#E9E1D2] p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium">
                      {(review.customerName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#0F3A3E]">
                          {review.customerName || "Cliente"}
                        </span>
                        {review.isVerifiedPurchase && (
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            <Check className="h-3 w-3" />
                            Compra verificada
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full",
                            STATUS_CONFIG[review.status]?.color,
                          )}
                        >
                          {STATUS_CONFIG[review.status]?.label ?? review.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-4 w-4",
                                i < review.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-200",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#8A938E]">
                          {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[#B07B1E] mb-1 font-mono">
                    {review.productId}
                  </p>
                  {review.title && (
                    <h4 className="font-medium text-[#0F3A3E] mb-2">{review.title}</h4>
                  )}
                  {review.content && (
                    <p className="text-sm text-[#51635F] mb-3">{review.content}</p>
                  )}
                  {review.storeReply && (
                    <div className="mt-2 p-3 bg-[#F8F4EA] rounded-lg border-l-2 border-[#B07B1E]">
                      <p className="text-[10px] uppercase tracking-wider text-[#B07B1E] font-semibold mb-1">
                        Resposta da loja
                      </p>
                      <p className="text-sm text-[#51635F]">{review.storeReply}</p>
                    </div>
                  )}
                </div>

                <div className="flex md:flex-col gap-2">
                  {review.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleModerate(review.id, "approved")}
                        disabled={acting === review.id}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Aprovar
                      </button>
                      <button
                        onClick={() => handleModerate(review.id, "rejected")}
                        disabled={acting === review.id}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Rejeitar
                      </button>
                    </>
                  )}
                  {review.status === "approved" && (
                    <button
                      onClick={() => handleModerate(review.id, "rejected")}
                      disabled={acting === review.id}
                      className="flex items-center gap-2 px-4 py-2 border border-[#E9E1D2] text-[#51635F] rounded-lg text-sm hover:bg-[#F9F7F3] disabled:opacity-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Ocultar
                    </button>
                  )}
                  {review.status === "rejected" && (
                    <button
                      onClick={() => handleModerate(review.id, "approved")}
                      disabled={acting === review.id}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Aprovar
                    </button>
                  )}
                  <button
                    onClick={() => handleReply(review.id)}
                    className="flex items-center gap-2 px-4 py-2 border border-[#E9E1D2] text-[#51635F] rounded-lg text-sm hover:bg-[#F9F7F3] transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Responder
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminReviews;
