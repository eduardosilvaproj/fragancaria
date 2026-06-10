import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "../ui/button";
import { ChevronRight, ArrowLeft, CheckCircle2, ShoppingCart, Sparkles, Clock, Star } from "lucide-react";

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

export const AIQuiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

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

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="max-w-5xl mx-auto bg-[#F8F6F2] overflow-hidden flex flex-col md:flex-row shadow-[0_40px_100px_rgba(0,0,0,0.05)] border border-black/[0.03]">
          {/* Left Side: Info & Progress */}
          <div className="md:w-[40%] bg-[#1C1C1A] text-white p-10 md:p-14 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#B8955A] rounded-full blur-[100px]" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-[#B8955A] mb-8">
                <Sparkles className="h-5 w-5" />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Diagnóstico Exclusivo</span>
              </div>
              <h3 className="font-serif text-4xl md:text-5xl mb-8 font-light leading-tight">Ciência e <span className="italic text-[#B8955A]">Beleza</span></h3>
              <p className="text-white/40 text-sm leading-relaxed mb-12 font-light">Nosso algoritmo analisa as necessidades específicas do seu fio para criar um ritual personalizado de alta performance.</p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Clock className="h-4 w-4 text-[#B8955A]/60" />
                    <span className="text-[10px] uppercase tracking-widest text-white/60">Tempo estimado: 45 segundos</span>
                </div>
                <div className="flex items-center gap-4">
                    <Star className="h-4 w-4 text-[#B8955A]/60" />
                    <span className="text-[10px] uppercase tracking-widest text-white/60">Baseado em +10.000 diagnósticos</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-12">
              <div className="flex justify-between items-end mb-4">
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8955A]">Progresso</span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">{step + 1} de {QUESTIONS.length}</span>
              </div>
              <div className="h-[2px] w-full bg-white/10">
                <MotionDiv 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-[#B8955A]" 
                />
              </div>
            </div>
          </div>

          {/* Right Side: Questions/Result */}
          <div className="flex-1 p-10 md:p-20 bg-white min-h-[500px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!showResult ? (
                <MotionDiv 
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6 }}
                  className="flex-1 flex flex-col justify-center"
                >
                  {step > 0 && (
                    <button 
                      onClick={() => setStep(step - 1)}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#1C1C1A]/30 mb-10 hover:text-[#B8955A] transition-colors group"
                    >
                      <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" /> Voltar
                    </button>
                  )}
                  <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B8955A] mb-4">Questão 0{step + 1}</h4>
                  <h2 className="font-serif text-4xl md:text-5xl text-[#1C1C1A] mb-12 font-light leading-tight">{QUESTIONS[step].question}</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {QUESTIONS[step].options.map(option => (
                      <button 
                        key={option}
                        onClick={() => handleAnswer(option)}
                        className="p-8 border border-black/[0.03] hover:border-[#B8955A] hover:bg-[#F8F6F2] text-left transition-all group flex items-center justify-between"
                      >
                        <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#1C1C1A]/80">{option}</span>
                        <div className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center group-hover:bg-[#B8955A] group-hover:border-[#B8955A] transition-all">
                            <ChevronRight className="h-4 w-4 text-[#B8955A] group-hover:text-white transition-all" />
                        </div>
                      </button>
                    ))}
                  </div>
                </MotionDiv>
              ) : (
                <MotionDiv 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                  className="flex-1 flex flex-col items-center text-center justify-center"
                >
                  <div className="w-24 h-24 rounded-full bg-[#B8955A]/10 flex items-center justify-center mb-10">
                    <CheckCircle2 className="h-10 w-10 text-[#B8955A]" />
                  </div>
                  <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#B8955A] mb-4">Análise Concluída</h4>
                  <h2 className="font-serif text-5xl text-[#1C1C1A] mb-8 font-light italic">Seu Ritual <span className="text-[#B8955A]">Personalizado</span></h2>
                  <p className="text-[#1C1C1A]/50 text-sm mb-12 max-w-sm font-light leading-relaxed">Identificamos as necessidades dos seus fios. O ritual abaixo foi selecionado por nossos especialistas para o seu perfil.</p>
                  
                  <div className="bg-[#F8F6F2] p-10 w-full mb-12 flex items-center gap-8 text-left border border-black/[0.03] group hover:border-[#B8955A]/30 transition-all cursor-pointer">
                    <div className="relative w-24 h-24 shrink-0 overflow-hidden">
                        <img 
                        src="https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=200&auto=format&fit=crop" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt="Recommended"
                        />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.3em] text-[#B8955A] font-bold mb-2">Recomendação Premium</p>
                      <h5 className="font-serif text-2xl mb-2 text-[#1C1C1A] font-light">Kérastase Nutritive Kit</h5>
                      <p className="text-xl font-light text-[#1C1C1A]">R$ 542,00</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <Button className="bg-[#1C1C1A] hover:bg-[#B8955A] text-white flex-1 h-16 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all duration-500 shadow-xl">
                      <ShoppingCart className="h-4 w-4 mr-3" /> Adicionar à Sacola
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={resetQuiz}
                      className="border-black/10 hover:border-[#1C1C1A] flex-1 h-16 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all duration-500"
                    >
                      Refazer Diagnóstico
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
