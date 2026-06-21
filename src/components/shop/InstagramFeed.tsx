import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

const POSTS = [
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400",
  "https://images.unsplash.com/photo-1519735777090-ec97162dc266?q=80&w=400",
  "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?q=80&w=400",
  "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?q=80&w=400",
  "https://images.unsplash.com/photo-1605497788044-5a32c7078486?q=80&w=400",
  "https://images.unsplash.com/photo-1560869713-7d0a29430803?q=80&w=400",
];

export const InstagramFeed = () => {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
            <div className="max-w-xl">
                <div className="section-label">
                    <span>Comunidade</span>
                </div>
                <h2 className="font-serif text-4xl md:text-5xl font-light">Siga a <span className="italic">Fragranciaria</span></h2>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-3xl font-serif font-light mb-2">+28.000</span>
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#1A1A1A]/40 font-bold">Seguidores no Instagram</p>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {POSTS.map((post, i) => (
            <MotionDiv
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="aspect-square overflow-hidden group relative cursor-pointer"
            >
              <img 
                src={post} 
                alt="Instagram" 
                className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-[#D4AF37]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </MotionDiv>
          ))}
        </div>
      </div>
    </section>
  );
};
