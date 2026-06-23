import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify/client";

const MotionDiv = motion.div as any;

const GET_RITUAL_PRODUCTS = `
  query GetRitualProducts($first: Int!) {
    products(first: $first, query: "product_type:Kit OR product_type:Shampoo OR product_type:Máscara OR product_type:Finalizador") {
      edges {
        node {
          id
          title
          handle
          vendor
          productType
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
`;

// Passos do ritual - será preenchido com produtos reais
const RITUAL_LABELS = [
  { step: "Passo 01", action: "Limpar", type: "Shampoo" },
  { step: "Passo 02", action: "Tratar", type: "Máscara" },
  { step: "Passo 03", action: "Condicionar", type: "Condicionador" },
  { step: "Passo 04", action: "Finalizar", type: "Finalizador" },
];

export const RitualSection = () => {
  const { data: productsData } = useQuery({
    queryKey: ["ritual-products"],
    queryFn: () => storefrontApiRequest(GET_RITUAL_PRODUCTS, { first: 20 }),
  });

  const allProducts = productsData?.data?.products?.edges || [];

  // Mapear produtos reais para cada passo do ritual
  const ritualProducts = RITUAL_LABELS.map((label) => {
    const product = allProducts.find((p: any) =>
      p.node.productType?.toLowerCase().includes(label.type.toLowerCase())
    );
    return {
      ...label,
      product: product?.node || null,
    };
  }).filter(item => item.product);

  // Se não tiver produtos suficientes, não renderizar a seção
  if (ritualProducts.length < 2) return null;

  return (
    <section className="bg-[#0F3A3E] text-white overflow-hidden relative py-20">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#B07B1E] rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 md:px-12 relative z-10">
        <div className="text-center mb-16">
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B07B1E] block mb-2">
            Experiência de Salão
          </span>
          <h2 className="font-serif font-light text-white text-3xl md:text-4xl mb-4">
            Monte seu Ritual <span className="italic text-[#B07B1E]">Completo</span>
          </h2>
          <p className="text-white/50 text-sm max-w-lg mx-auto">
            Combine produtos para potencializar os resultados
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {ritualProducts.map((item, index) => (
            <Link
              key={item.step}
              to={`/produto/${item.product.handle}` as any}
            >
              <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <div className="aspect-square overflow-hidden mb-4 bg-white/5 border border-white/10 group-hover:border-[#B07B1E]/30 transition-all">
                  {item.product.images?.edges?.[0]?.node?.url && (
                    <img
                      src={item.product.images.edges[0].node.url}
                      alt={item.product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                </div>
                <div className="text-center">
                  <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#B07B1E] block mb-1">
                    {item.step}: {item.action}
                  </span>
                  <h4 className="text-sm font-serif text-white line-clamp-2">
                    {item.product.title}
                  </h4>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">
                    {item.product.vendor}
                  </span>
                </div>
              </MotionDiv>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/produtos" search={{ productType: "Kit" }}>
            <Button className="bg-[#B07B1E] hover:bg-white text-[#0F3A3E] px-10 h-12 rounded-none text-[10px] uppercase tracking-[0.3em] font-bold transition-all">
              Ver Kits Completos
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
