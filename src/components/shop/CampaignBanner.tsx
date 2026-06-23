import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

const MotionDiv = motion.div as any;

const CAMPAIGNS = [
  {
    title: "COLEÇÃO PROFISSIONAL",
    subtitle: "As melhores marcas para cuidar dos seus fios em casa.",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=2000&auto=format&fit=crop",
    cta: "Ver produtos",
    link: "/produtos"
  },
  {
    title: "KÉRASTASE",
    subtitle: "Curadoria exclusiva para nutrição profunda.",
    image: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=2000&auto=format&fit=crop",
    cta: "Descobrir",
    link: "/produtos"
  }
];

export const CampaignBanner = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % CAMPAIGNS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-[#0F3A3E] overflow-hidden py-16">
      <div className="container mx-auto px-4 md:px-12">
        <div className="relative h-[400px] overflow-hidden">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 flex items-center justify-center text-center p-8"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={CAMPAIGNS[current].image}
                  alt={CAMPAIGNS[current].title}
                  className="w-full h-full object-cover opacity-30 grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F3A3E] via-transparent to-[#0F3A3E]" />
              </div>

              <div className="relative z-10 max-w-2xl">
                <MotionDiv
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="font-serif text-5xl md:text-7xl text-white mb-6 font-light tracking-tight">
                    {CAMPAIGNS[current].title}
                  </h2>
                  <p className="text-[#B07B1E] text-sm uppercase tracking-[0.4em] font-bold mb-10">
                    {CAMPAIGNS[current].subtitle}
                  </p>
                  <Link to={CAMPAIGNS[current].link as any}>
                    <Button className="bg-[#B07B1E] hover:bg-white text-[#0F3A3E] hover:text-[#0F3A3E] px-12 h-14 rounded-none text-[10px] uppercase tracking-[0.4em] font-bold transition-all duration-500">
                      {CAMPAIGNS[current].cta}
                      <ArrowRight className="ml-4 h-4 w-4" />
                    </Button>
                  </Link>
                </MotionDiv>
              </div>
            </MotionDiv>
          </AnimatePresence>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {CAMPAIGNS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-12 h-[2px] transition-all duration-500 ${current === i ? "bg-[#B07B1E]" : "bg-white/10"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
