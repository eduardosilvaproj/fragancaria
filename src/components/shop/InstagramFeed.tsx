import { motion } from "framer-motion";
import { Heart, MessageCircle, Instagram } from "lucide-react";
import { Button } from "../ui/button";

const MotionDiv = motion.div as any;

const INSTA_POSTS = [
  { url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop", size: "small" },
  { url: "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=400&auto=format&fit=crop", size: "large" },
  { url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=400&auto=format&fit=crop", size: "small" },
  { url: "https://images.unsplash.com/photo-1552046122-03184de85e08?q=80&w=400&auto=format&fit=crop", size: "small" },
  { url: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?q=80&w=400&auto=format&fit=crop", size: "large" },
  { url: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=400&auto=format&fit=crop", size: "small" },
];

export const InstagramFeed = () => {
  return (
    <section className="py-40 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-24">
          <div className="section-label">
            <span>Comunidade Premium</span>
          </div>
          <h2 className="font-serif font-light text-[#1C1C1A] mb-8">Siga-nos no <span className="italic text-[#B8955A]">Instagram</span></h2>
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#B8955A] text-[12px] uppercase tracking-[0.4em] font-bold hover:text-[#1C1C1A] transition-colors"
          >
            @fragranciaria_boutique
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[250px]">
          {INSTA_POSTS.map((post, i) => (
            <MotionDiv 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={post.size === 'large' ? 'md:row-span-2' : ''}
            >
              <div className="group relative w-full h-full overflow-hidden bg-[#F8F6F2] cursor-pointer">
                <img 
                    src={post.url} 
                    alt="Instagram post" 
                    className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110 grayscale group-hover:grayscale-0" 
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col items-center justify-center gap-4 text-white">
                  <Instagram className="h-6 w-6 mb-2 text-[#B8955A]" />
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 fill-white" />
                        <span className="text-[10px] font-bold tracking-widest">{Math.floor(Math.random() * 500) + 100}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 fill-white" />
                        <span className="text-[10px] font-bold tracking-widest">{Math.floor(Math.random() * 50) + 10}</span>
                    </div>
                  </div>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
        
        <div className="mt-20 flex justify-center">
          <Button className="bg-[#1C1C1A] hover:bg-[#B8955A] text-white px-16 h-18 rounded-none text-[12px] uppercase tracking-[0.4em] font-bold transition-all duration-700 shadow-[0_30px_60px_rgba(0,0,0,0.1)] hover:-translate-y-2">
            Seguir Instagram
          </Button>
        </div>
      </div>
    </section>
  );
};
