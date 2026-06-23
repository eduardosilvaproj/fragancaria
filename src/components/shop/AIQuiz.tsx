import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "../ui/button";
import { ChevronRight, ArrowLeft, CheckCircle2, ShoppingCart, Sparkles, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify/client";

const MotionDiv = motion.div as any;

const QUESTIONS = [
  {
    id: 1,
    question: "Qual o seu tipo de cabelo?",
    options: ["Liso", "Ondulado", "Cacheado", "Crespo"]
  },
  {
    id: 2,
    question: "Qual sua principal necessidade?",
    options: ["Hidratação", "Nutrição", "Reconstrução", "Loiros"]
  },
  {
    id: 3,
    question: "Possui química?",
    options: ["Sim, coloração", "Sim, alisamento", "Sim, luzes", "Não"]
  },
  {
    id: 4,
    question: "Frequência de calor (secador/chapinha)?",
    options: ["Diária", "Frequente", "Ocasional", "Raramente"]
  }
];

const GET_RECOMMENDED_PRODUCT = `
  query GetRecommendedProduct($first: Int!) {
    products(first: $first, query: "product_type:Kit") {
      edges {
        node {
          id
          title
          handle
          vendor
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

export const AIQuiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ["quiz-recommended-product"],
    queryFn: () => storefrontApiRequest(GET_RECOMMENDED_PRODUCT, { first: 5 }),
    enabled: showResult,
  });

  const recommendedProduct = productsData?.data?.products?.edges?.[0]?.node;

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const resetQuiz = () => {
    setStep(0);
    setAnswers([]);
    setShowResult(false);
  };

  const progress = ((step + 1) / QUESTIONS.length) * 100;

  const formatPrice = (amount: string, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(parseFloat(amount));
  };

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#D4AF37] font-bold">Diagnóstico</span>
          <h2 className="font-serif font-light text-[#1A1A1A] text-2xl md:text-3xl mt-1">
            Descubra seu Ritual Ideal
          </h2>
        </div>

        <div className="max-w-4xl mx-auto bg-white overflow-hidden flex flex-col md:flex-row shadow-lg border border-black/5">
          {/* Left Side: Info & Progress */}
          <div className="md:w-[35%] bg-[#0F3A45] text-white p-8 md:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#D4AF37] rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 text-[#D4AF37] mb-6">
                <Sparkles className="h-4 w-4" />
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold">Quiz Personalizado</span>
              </div>
              <h3 className="font-serif text-2xl md:text-3xl mb-4 font-light">Encontre os produtos <span className="italic text-[#D4AF37]">certos</span></h3>
              <p className="text-white/50 text-xs leading-relaxed mb-8">Responda 4 perguntas rápidas e receba recomendações personalizadas.</p>

              <div className="flex items-center gap-3">
                <Clock className="h-3 w-3 text-[#D4AF37]/60" />
                <span className="text-[9px] uppercase tracking-wider text-white/50">~45 segundos</span>
              </div>
            </div>

            <div className="relative z-10 mt-8">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#D4AF37]">Progresso</span>
                <span className="text-[9px] text-white/40">{step + 1}/{QUESTIONS.length}</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full">
                <MotionDiv
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-[#D4AF37] rounded-full"
                />
              </div>
            </div>
          </div>

          {/* Right Side: Questions/Result */}
          <div className="flex-1 p-8 md:p-12 bg-white min-h-[400px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!showResult ? (
                <MotionDiv
                  key={step}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                  className="flex-1 flex flex-col justify-center"
                >
                  {step > 0 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-[#1A1A1A]/30 mb-6 hover:text-[#D4AF37] transition-colors group"
                    >
                      <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" /> Voltar
                    </button>
                  )}
                  <h4 className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] mb-2">Questão {step + 1}</h4>
                  <h2 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-8 font-light">{QUESTIONS[step].question}</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {QUESTIONS[step].options.map(option => (
                      <button
                        key={option}
                        onClick={() => handleAnswer(option)}
                        className="p-5 border border-black/5 hover:border-[#D4AF37] hover:bg-[#F7F5F2] text-left transition-all group flex items-center justify-between"
                      >
                        <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#1A1A1A]/70">{option}</span>
                        <ChevronRight className="h-4 w-4 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                </MotionDiv>
              ) : (
                <MotionDiv
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex-1 flex flex-col items-center text-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-[#D4AF37]" />
                  </div>
                  <h4 className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] mb-2">Análise Concluída</h4>
                  <h2 className="font-serif text-2xl text-[#1A1A1A] mb-6 font-light">Seu Ritual <span className="italic text-[#D4AF37]">Personalizado</span></h2>

                  {recommendedProduct ? (
                    <Link to={`/produto/${recommendedProduct.handle}` as any} className="w-full">
                      <div className="bg-[#F7F5F2] p-6 w-full mb-8 flex items-center gap-6 text-left border border-black/5 group hover:border-[#D4AF37]/30 transition-all cursor-pointer">
                        <div className="relative w-20 h-20 shrink-0 overflow-hidden bg-white">
                          {recommendedProduct.images?.edges?.[0]?.node?.url && (
                            <img
                              src={recommendedProduct.images.edges[0].node.url}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              alt={recommendedProduct.title}
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.2em] text-[#D4AF37] font-bold mb-1">Recomendação</p>
                          <h5 className="font-serif text-lg mb-1 text-[#1A1A1A] font-light line-clamp-2">{recommendedProduct.title}</h5>
                          <p className="text-lg font-light text-[#1A1A1A]">
                            {formatPrice(recommendedProduct.priceRange.minVariantPrice.amount, recommendedProduct.priceRange.minVariantPrice.currencyCode)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-[#F7F5F2] p-6 w-full mb-8 text-center">
                      <p className="text-sm text-[#1A1A1A]/50">Carregando recomendação...</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Link to="/produtos" search={{ productType: "Kit" }} className="flex-1">
                      <Button className="bg-[#0F3A45] hover:bg-[#D4AF37] text-white w-full h-12 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold transition-all">
                        <ShoppingCart className="h-4 w-4 mr-2" /> Ver Todos os Kits
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={resetQuiz}
                      className="border-black/10 hover:border-[#0F3A45] h-12 rounded-none text-[10px] uppercase tracking-[0.2em] font-bold transition-all"
                    >
                      Refazer
                    </Button>
                  </div>
                </MotionDiv>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
