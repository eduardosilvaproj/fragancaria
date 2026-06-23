import { motion } from "framer-motion";
import { Star, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";

const MotionDiv = motion.div as any;

// TODO: Integrar com app de reviews do Shopify (Judge.me, Loox, etc.)
// Quando houver reviews reais, substituir este componente

export const Testimonials = () => {
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
            <Link to="/contato" className="text-[#B07B1E] hover:underline">
              Deixe sua avaliação
            </Link>
          </p>
        </MotionDiv>
      </div>
    </section>
  );
};
