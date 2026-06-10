import { motion } from "framer-motion";
import { Instagram, Heart, MessageCircle } from "lucide-react";
import { Button } from "../ui/button";

const MotionDiv = motion.div as any;

const INSTA_POSTS = [
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=400&auto=format&fit=crop",
];

export const InstagramFeed = () => {
  return (
    <section className="py-40 bg-[#F8F6F2] overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-24">
          <MotionDiv 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-6 mb-8"
          >
            <div className="w-16 h-[1px] bg-[#B8955A]" />
            <span className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A]">Comunidade Premium</span>
            <div className="w-16 h-[1px] bg-[#B8955A]" />
          </MotionDiv>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-serif text-5xl md:text-6xl font-light text-[#1C1C1A] mb-8"
          >
            Siga-nos no <span className="italic">Instagram</span>
          </motion.h2>
          <Button variant="link" className="text-[#B8955A] text-[12px] uppercase tracking-[0.3em] font-bold">
            @fragranciaria_boutique
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {INSTA_POSTS.map((post, i) => (
            <MotionDiv 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative aspect-square overflow-hidden bg-white shadow-xl cursor-pointer"
            >
              <img src={post} alt="Instagram post" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 fill-white" />
                  <span className="text-xs font-bold">{Math.floor(Math.random() * 500) + 100}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 fill-white" />
                  <span className="text-xs font-bold">{Math.floor(Math.random() * 50) + 10}</span>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
        
        <div className="mt-20 flex justify-center">
          <Button className="bg-[#1C1C1A] hover:bg-[#B8955A] text-white px-16 h-16 rounded-none text-[12px] uppercase tracking-[0.3em] font-bold transition-all duration-500 shadow-2xl">
            Seguir Instagram
          </Button>
        </div>
      </div>
    </section>
  );
};