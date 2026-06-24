import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Star,
  Search,
  Filter,
  Image,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye,
  EyeOff,
  Check,
  X,
  Camera,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviews,
});

interface Review {
  id: string;
  customer: string;
  product: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  date: string;
  status: "pending" | "approved" | "rejected";
  helpful: number;
  verified: boolean;
}

const MOCK_REVIEWS: Review[] = [
  {
    id: "1",
    customer: "Maria S.",
    product: "Kit Loiro Perfeito",
    rating: 5,
    title: "Produto incrível!",
    content: "Amei o resultado! Meu cabelo ficou super hidratado e o loiro muito mais bonito. Recomendo demais!",
    images: ["/images/reviews/review1.jpg"],
    date: "2024-01-18",
    status: "pending",
    helpful: 12,
    verified: true,
  },
  {
    id: "2",
    customer: "João P.",
    product: "Máscara Kérastase",
    rating: 4,
    title: "Muito bom, mas caro",
    content: "O produto é excelente, meu cabelo ficou muito mais macio. Só acho que o preço poderia ser mais acessível.",
    date: "2024-01-17",
    status: "approved",
    helpful: 8,
    verified: true,
  },
  {
    id: "3",
    customer: "Ana C.",
    product: "Shampoo Wella",
    rating: 5,
    title: "Superou expectativas",
    content: "Já estou no terceiro pote! Não troco por nada. Entrega rápida e produto original.",
    images: ["/images/reviews/review2.jpg", "/images/reviews/review3.jpg"],
    date: "2024-01-16",
    status: "approved",
    helpful: 24,
    verified: true,
  },
  {
    id: "4",
    customer: "Pedro L.",
    product: "Coloração L'Oréal",
    rating: 2,
    title: "Não gostei da cor",
    content: "A cor ficou diferente do que eu esperava. Achei que ia ficar mais escuro.",
    date: "2024-01-15",
    status: "pending",
    helpful: 2,
    verified: false,
  },
];

const STATUS_CONFIG = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Aprovado", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-700" },
};

function AdminReviews() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  const filteredReviews = MOCK_REVIEWS.filter((review) => {
    const matchesSearch =
      review.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || review.status === statusFilter;
    const matchesRating =
      ratingFilter === "all" || review.rating === parseInt(ratingFilter);
    return matchesSearch && matchesStatus && matchesRating;
  });

  const avgRating =
    MOCK_REVIEWS.reduce((sum, r) => sum + r.rating, 0) / MOCK_REVIEWS.length;
  const pendingCount = MOCK_REVIEWS.filter((r) => r.status === "pending").length;
  const withPhotos = MOCK_REVIEWS.filter((r) => r.images && r.images.length > 0).length;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
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

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600 fill-yellow-500" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Média Geral
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{avgRating.toFixed(1)}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Pendentes
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{pendingCount}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Com Fotos
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{withPhotos}</p>
        </div>

        <div className="bg-white border border-[#E9E1D2] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A938E] mb-1">
            Total Reviews
          </p>
          <p className="font-serif text-2xl text-[#0F3A3E]">{MOCK_REVIEWS.length}</p>
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
      <div className="space-y-4">
        {filteredReviews.map((review) => (
          <div
            key={review.id}
            className="bg-white border border-[#E9E1D2] p-6 hover:shadow-sm transition-shadow"
          >
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F3A3E] flex items-center justify-center text-white font-medium">
                    {review.customer.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#0F3A3E]">
                        {review.customer}
                      </span>
                      {review.verified && (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3" />
                          Compra verificada
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          STATUS_CONFIG[review.status].color
                        )}
                      >
                        {STATUS_CONFIG[review.status].label}
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
                                : "text-gray-200"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#8A938E]">{review.date}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#B07B1E] mb-1">{review.product}</p>
                <h4 className="font-medium text-[#0F3A3E] mb-2">{review.title}</h4>
                <p className="text-sm text-[#51635F] mb-3">{review.content}</p>

                {/* Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {review.images.map((img, index) => (
                      <div
                        key={index}
                        className="w-16 h-16 bg-[#F5F3EE] rounded-lg flex items-center justify-center"
                      >
                        <Image className="h-6 w-6 text-[#8A938E]" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-[#8A938E]">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {review.helpful} acharam útil
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col gap-2">
                {review.status === "pending" && (
                  <>
                    <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors">
                      <Check className="h-4 w-4" />
                      Aprovar
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors">
                      <X className="h-4 w-4" />
                      Rejeitar
                    </button>
                  </>
                )}
                {review.status === "approved" && (
                  <button className="flex items-center gap-2 px-4 py-2 border border-[#E9E1D2] text-[#51635F] rounded-lg text-sm hover:bg-[#F9F7F3] transition-colors">
                    <EyeOff className="h-4 w-4" />
                    Ocultar
                  </button>
                )}
                <button className="flex items-center gap-2 px-4 py-2 border border-[#E9E1D2] text-[#51635F] rounded-lg text-sm hover:bg-[#F9F7F3] transition-colors">
                  <MessageSquare className="h-4 w-4" />
                  Responder
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminReviews;
