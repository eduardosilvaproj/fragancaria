import { motion } from "framer-motion";
import { Star, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MotionDiv = motion.div as any;

type ApprovedReview = {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  customerName: string | null;
};

export const Testimonials = () => {
  const [reviews, setReviews] = useState<ApprovedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("product_reviews")
          .select("id, rating, title, content, customers:customer_id (name)")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(6);
        const mapped: ApprovedReview[] = (data ?? []).map((r: any) => ({
          id: r.id,
          rating: Number(r.rating ?? 0),
          title: r.title ?? null,
          content: r.content ?? null,
          customerName: r.customers?.name ?? null,
        }));
        setReviews(mapped);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="py-40 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-[1px] bg-[#B07B1E]" />
            <span className="text-[10px] uppercase tracking-[0.5em] font-bold text-[#B07B1E]">
              Experiência do Cliente
            </span>
            <div className="w-12 h-[1px] bg-[#B07B1E]" />
          </div>
          <h2 className="font-serif font-light text-[#1C302E] text-4xl md:text-5xl">
            O que nossos clientes <span className="italic text-[#B07B1E]">dizem</span>
          </h2>
        </div>

        {!loading && reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {reviews.map((review, i) => (
              <MotionDiv
                key={review.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#F8F6F2] p-8 border border-black/[0.02] flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <Star
                      key={s}
                      className={
                        s < review.rating
                          ? "h-4 w-4 text-[#B07B1E] fill-[#B07B1E]"
                          : "h-4 w-4 text-[#B07B1E]/20"
                      }
                    />
                  ))}
                </div>
                {review.title && (
                  <h3 className="font-serif text-lg text-[#1C302E] mb-2">
                    {review.title}
                  </h3>
                )}
                {review.content && (
                  <p className="text-[#1C302E]/70 text-sm leading-relaxed flex-1">
                    "{review.content}"
                  </p>
                )}
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C302E]/40 mt-6">
                  {review.customerName || "Cliente verificado"}
                </p>
              </MotionDiv>
            ))}
          </div>
        ) : (
          <MotionDiv
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="bg-[#F8F6F2] p-16 border border-black/[0.02]">
              <MessageSquare className="h-16 w-16 text-[#B07B1E]/20 mx-auto mb-8" />
              <h3 className="font-serif text-2xl text-[#1C302E] mb-4">
                Avaliações em breve
              </h3>
              <p className="text-[#1C302E]/60 text-sm mb-8 leading-relaxed">
                Estamos coletando avaliações de nossos clientes. Em breve você poderá ver experiências reais de quem já comprou conosco.
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-[#B07B1E]/30" />
                  ))}
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C302E]/30">
                  Aguardando avaliações
                </span>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1C302E]/40 mt-8">
              Comprou conosco?{" "}
              <Link to="/minha-conta/avaliacoes" className="text-[#B07B1E] hover:underline">
                Deixe sua avaliação
              </Link>
            </p>
          </MotionDiv>
        )}
      </div>
    </section>
  );
};
