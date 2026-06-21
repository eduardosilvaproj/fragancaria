import { motion } from "framer-motion";
import { Star, Quote, CheckCircle2 } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from 'embla-carousel-autoplay'
import { useEffect } from "react";

const MotionDiv = motion.div as any;

const TESTIMONIALS = [
  {
    name: "Mariana Silva",
    location: "São Paulo, SP",
    text: "O ritual da Kérastase transformou completamente meu cabelo. A consultoria foi fundamental para eu escolher os produtos certos.",
    stars: 5,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop"
  },
  {
    name: "Beatriz Santos",
    location: "Rio de Janeiro, RJ",
    text: "Sempre compro meus produtos da Wella aqui. Entrega rápida e produtos 100% originais. Recomendo muito a Fragranciaria!",
    stars: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop"
  },
  {
    name: "Camila Oliveira",
    location: "Curitiba, PR",
    text: "A experiência de compra é maravilhosa. O site é lindo e as recomendações de rituais são perfeitas.",
    stars: 5,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
  },
  {
    name: "Juliana Costa",
    location: "Belo Horizonte, MG",
    text: "Produtos impecáveis e embalagem luxuosa. Sinto que estou em um spa toda vez que uso meu kit Keune.",
    stars: 5,
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=200&auto=format&fit=crop"
  }
];

export const Testimonials = () => {
  const [emblaRef] = useEmblaCarousel({ loop: true, align: "center" }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);

  return (
    <section className="py-40 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-24">
          <div className="section-label">
            <span>Vozes da Experiência</span>
          </div>
          <h2 className="font-serif font-light text-[#1A1A1A]">Relatos de <span className="italic text-[#D4AF37]">Transformação</span></h2>
          <div className="flex flex-col items-center mt-12 gap-4">
            <div className="flex items-center gap-4">
                <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-[#D4AF37] text-[#D4AF37]" />
                    ))}
                </div>
                <span className="font-serif text-3xl font-light">4.9/5</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1A1A1A]/40">Baseado em milhares de avaliações reais de clientes autenticados</p>
          </div>
        </div>

        <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
          <div className="flex">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="flex-[0_0_100%] md:flex-[0_0_45%] lg:flex-[0_0_30%] px-4">
                <MotionDiv 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-[#F8F6F2] p-12 h-full flex flex-col items-center text-center relative border border-black/[0.02]"
                >
                  <Quote className="absolute top-8 left-8 h-10 w-10 text-[#D4AF37]/10 stroke-[1]" />
                  <div className="w-20 h-20 rounded-full overflow-hidden mb-8 grayscale hover:grayscale-0 transition-all duration-700 shadow-xl border-2 border-white">
                    <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.stars)].map((_, j) => (
                      <Star key={j} className="h-3 w-3 fill-[#D4AF37] text-[#D4AF37]" />
                    ))}
                  </div>
                  <p className="font-serif text-[18px] leading-relaxed text-[#1A1A1A] mb-8 italic font-light">"{testimonial.text}"</p>
                  <div className="mt-auto">
                    <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1A1A1A] mb-1">{testimonial.name}</h4>
                    <p className="text-[9px] uppercase tracking-widest text-[#D4AF37] font-bold mb-4">{testimonial.location}</p>
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      <span className="text-[8px] uppercase tracking-widest font-bold text-[#1A1A1A]/60">Cliente Autenticado</span>
                    </div>
                  </div>
                </MotionDiv>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
