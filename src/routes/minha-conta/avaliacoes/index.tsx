import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Star, MessageSquare, LogIn, CheckCircle, Clock, XCircle } from "lucide-react";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import {
  listMyReviews,
  listReviewableProducts,
  submitReview,
  type MyReview,
  type ReviewableProduct,
} from "@/lib/reviews.functions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/minha-conta/avaliacoes/")({
  component: AvaliacoesPage,
});

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  pending: { label: "Em análise", color: "text-amber-700", bg: "bg-amber-50", icon: Clock },
  approved: { label: "Publicada", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle },
  rejected: { label: "Rejeitada", color: "text-red-700", bg: "bg-red-50", icon: XCircle },
};

function StarRating({
  value,
  onChange,
  readOnly,
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          className={cn(!readOnly && "cursor-pointer")}
        >
          <Star
            className={cn(
              "h-5 w-5",
              n <= value ? "fill-[#B07B1E] text-[#B07B1E]" : "text-[#E9E1D2]",
            )}
          />
        </button>
      ))}
    </div>
  );
}

function AvaliacoesPage() {
  const { user, loading: sessionLoading } = useSupabaseSession();
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [reviewable, setReviewable] = useState<ReviewableProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formProduct, setFormProduct] = useState<ReviewableProduct | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        listMyReviews(),
        listReviewableProducts(),
      ]);
      if (r.success) setReviews(r.data);
      if (p.success) setReviewable(p.data);
    } catch {
      toast.error("Erro ao carregar avaliações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const openForm = (product: ReviewableProduct) => {
    setFormProduct(product);
    setRating(5);
    setTitle("");
    setContent("");
  };

  const handleSubmit = async () => {
    if (!formProduct) return;
    setSubmitting(true);
    const res = await submitReview({
      data: {
        productId: formProduct.productId,
        orderId: formProduct.orderId,
        rating,
        title: title || undefined,
        content: content || undefined,
      },
    });
    setSubmitting(false);
    if (res.success) {
      toast.success("Avaliação enviada! Ficará visível após aprovação.");
      setFormProduct(null);
      load();
    } else {
      toast.error(res.error || "Erro ao enviar avaliação");
    }
  };

  if (sessionLoading) {
    return <p className="text-sm text-[#51635F]">Carregando...</p>;
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl border border-[#E9E1D2] p-8 text-center">
        <LogIn className="h-10 w-10 text-[#0F3A3E] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-[#0F3A3E] mb-2">
          Entre para avaliar
        </h2>
        <p className="text-sm text-[#51635F] mb-6">
          Acesse sua conta para avaliar os produtos que comprou.
        </p>
        <Link
          to="/login"
          search={{ redirect: "/minha-conta/avaliacoes" }}
          className="inline-block rounded-lg bg-[#0F3A3E] text-white px-6 py-2.5 text-sm font-medium hover:bg-[#0c2e31]"
        >
          Entrar
        </Link>
      </div>
    );
  }

  const pendingToReview = reviewable.filter((p) => !p.alreadyReviewed);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Star className="h-5 w-5 text-[#0F3A3E]" />
        <h2 className="text-lg font-semibold text-[#0F3A3E]">Minhas avaliações</h2>
      </header>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E9E1D2] p-8 text-center text-sm text-[#51635F]">
          Carregando...
        </div>
      ) : (
        <>
          {/* Produtos a avaliar */}
          {pendingToReview.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3">
                Produtos que você comprou
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pendingToReview.map((p) => (
                  <div
                    key={p.productId}
                    className="bg-white rounded-2xl border border-[#E9E1D2] p-4 flex items-center gap-3"
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-14 h-14 object-contain bg-[#F5F3EE] rounded-lg"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-[#F5F3EE] rounded-lg" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#0F3A3E] line-clamp-2">{p.name}</p>
                      <button
                        onClick={() => openForm(p)}
                        className="mt-1 text-xs text-[#B07B1E] font-medium hover:underline"
                      >
                        Avaliar produto
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Avaliações enviadas */}
          <section>
            <h3 className="text-sm font-semibold text-[#0F3A3E] mb-3">
              Avaliações enviadas
            </h3>
            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E9E1D2] p-8 text-center">
                <MessageSquare className="h-10 w-10 text-[#8A938E] mx-auto mb-3" />
                <p className="text-sm text-[#51635F]">
                  Você ainda não avaliou nenhum produto.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={r.id}
                      className="bg-white rounded-2xl border border-[#E9E1D2] p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <StarRating value={r.rating} readOnly />
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                            cfg.bg,
                            cfg.color,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                      {r.title && (
                        <p className="text-sm font-medium text-[#0F3A3E]">{r.title}</p>
                      )}
                      {r.content && (
                        <p className="text-sm text-[#51635F] mt-1">{r.content}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* Modal de nova avaliação */}
      {formProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E9E1D2] flex items-center justify-between">
              <h3 className="font-serif text-lg text-[#0F3A3E]">Avaliar produto</h3>
              <button
                onClick={() => setFormProduct(null)}
                className="p-1 hover:bg-[#F5F3EE] rounded"
              >
                <XCircle className="h-5 w-5 text-[#51635F]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#0F3A3E] font-medium">{formProduct.name}</p>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8A938E] mb-2">
                  Sua nota
                </label>
                <StarRating value={rating} onChange={setRating} />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8A938E] mb-1">
                  Título (opcional)
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={255}
                  placeholder="Resuma sua experiência"
                  className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#B07B1E]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#8A938E] mb-1">
                  Comentário (opcional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={4000}
                  rows={4}
                  placeholder="Conte como foi usar o produto"
                  className="w-full rounded-lg border border-[#E9E1D2] px-3 py-2 text-sm outline-none focus:border-[#B07B1E] resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E9E1D2] flex justify-end gap-3">
              <button
                onClick={() => setFormProduct(null)}
                className="px-4 py-2 text-sm border border-[#E9E1D2] rounded-lg hover:bg-[#F5F3EE]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-[#0F3A3E] text-white rounded-lg hover:bg-[#0c2e31] disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Enviar avaliação"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvaliacoesPage;
