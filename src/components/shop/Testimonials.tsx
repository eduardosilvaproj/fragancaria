import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect } from "react";

const MotionDiv = motion.div as any;

const TESTIMONIALS = [
  {
    name: "Mariana Silva",
    location: "São Paulo, SP",
    text: "O ritual da Kérastase transformou completamente meu cabelo. A consultoria via WhatsApp foi fundamental para eu escolher os produtos certos.",
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
    text: "A experiência de compra é maravilhosa. O site é lindo e as recomendações de rituais são perfeitas para quem não sabe o que o cabelo precisa.",
    stars: 5,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
  }
];

export const Testimonials = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });

  useEffect(() => {
    if (emblaApi) {
      const interval = setInterval(() => {
        emblaApi.scrollNext();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [emblaApi]);

  return (
    <section className="py-40 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-24">
          <MotionDiv 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-6 mb-8"
          >
            <div className="w-16 h-[1px] bg-[#B8955A]" />
            <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">Vozes da Experiência</span>
            <div className="w-16 h-[1px] bg-[#B8955A]" />
          </MotionDiv>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-5xl md:text-6xl font-light text-[#1C1C1A]"
          >
            Relatos de <span className="italic text-[#B8955A]">Transformação</span>
          </motion.h2>
        </div>

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-6">
                <MotionDiv 
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[#F8F6F2] p-12 h-full flex flex-col items-center text-center relative"
                >
                  <Quote className="absolute top-8 left-8 h-12 w-12 text-[#B8955A]/10 stroke-[1]" />
                  <div className="w-24 h-24 rounded-full overflow-hidden mb-8 border-4 border-white shadow-xl">
                    <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(testimonial.stars)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-[#B8955A] text-[#B8955A]" />
                    ))}
                  </div>
                  <p className="font-serif text-xl leading-relaxed text-[#1C1C1A] mb-8 italic">"{testimonial.text}"</p>
                  <div className="mt-auto">
                    <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-[#1C1C1A] mb-1">{testimonial.name}</h4>
                    <p className="text-[9px] uppercase tracking-widest text-[#B8955A] font-bold">{testimonial.location}</p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-[8px] uppercase tracking-widest font-bold text-[#1C1C1A]/40">Compra Verificada</span>
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