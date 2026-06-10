import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "../ui/button";
import { ChevronRight, ArrowLeft, CheckCircle2, ShoppingCart } from "lucide-react";

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

  return (
    <section className="py-40 bg-[#F8F6F2] overflow-hidden">
      <div className="container mx-auto px-4 md:px-12">
        <div className="max-w-4xl mx-auto bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-[#0A0A0A] text-white p-12 flex flex-col justify-between">
            <div>
              <h3 className="font-serif text-3xl mb-6">Diagnóstico <span className="text-[#B8955A]">IA</span></h3>
              <p className="text-white/40 text-sm leading-relaxed uppercase tracking-widest font-bold mb-12">Descubra o ritual perfeito para o seu cabelo em menos de 1 minuto.</p>
            </div>
            {!showResult && (
              <div className="space-y-4">
                {QUESTIONS.map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= step ? "bg-[#B8955A] scale-125" : "bg-white/10"}`} />
                    <span className={`text-[10px] uppercase tracking-widest ${i <= step ? "text-white" : "text-white/20"}`}>Passo 0{i+1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 p-12 md:p-20 min-h-[500px] flex flex-col">
            <AnimatePresence mode="wait">
              {!showResult ? (
                <MotionDiv 
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 flex flex-col"
                >
                  {step > 0 && (
                    <button 
                      onClick={() => setStep(step - 1)}
                      className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#1C1C1A]/40 mb-8 hover:text-[#B8955A] transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" /> Voltar
                    </button>
                  )}
                  <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A] mb-4">Pergunta 0{step + 1}</h4>
                  <h2 className="font-serif text-4xl text-[#1C1C1A] mb-12">{QUESTIONS[step].question}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {QUESTIONS[step].options.map(option => (
                      <button 
                        key={option}
                        onClick={() => handleAnswer(option)}
                        className="p-6 border border-black/5 hover:border-[#B8955A] hover:bg-[#B8955A]/5 text-left transition-all group flex items-center justify-between"
                      >
                        <span className="text-sm uppercase tracking-widest font-medium text-[#1C1C1A]">{option}</span>
                        <ChevronRight className="h-4 w-4 text-[#B8955A] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                      </button>
                    ))}
                  </div>
                </MotionDiv>
              ) : (
                <MotionDiv 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 flex flex-col items-center text-center justify-center"
                >
                  <CheckCircle2 className="h-20 w-20 text-[#B8955A] mb-8" />
                  <h4 className="text-[11px] uppercase tracking-[0.4em] font-bold text-[#B8955A] mb-4">Resultado Pronto</h4>
                  <h2 className="font-serif text-5xl text-[#1C1C1A] mb-8 italic underline decoration-[#B8955A]/30">Seu Ritual Ideal</h2>
                  <p className="text-[#1C1C1A]/60 text-sm mb-12 max-w-sm">Com base nas suas respostas, recomendamos o Ritual Kérastase Nutritive para recuperação intensa.</p>
                  
                  <div className="bg-[#F8F6F2] p-8 w-full mb-12 flex items-center gap-6 text-left border-l-4 border-[#B8955A]">
                    <img 
                      src="https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=200&auto=format&fit=crop" 
                      className="w-20 h-20 object-cover shadow-lg"
                      alt="Recommended"
                    />
                    <div>
                      <h5 className="font-serif text-xl mb-1 text-[#1C1C1A]">Kérastase Nutritive Kit</h5>
                      <p className="text-[10px] uppercase tracking-widest text-[#B8955A] font-bold">R$ 542,00</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <Button className="bg-[#1C1C1A] hover:bg-[#B8955A] text-white flex-1 h-14 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all">
                      <ShoppingCart className="h-4 w-4 mr-3" /> Adicionar Ritual
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={resetQuiz}
                      className="border-black/10 hover:border-[#1C1C1A] flex-1 h-14 rounded-none text-[11px] uppercase tracking-[0.3em] font-bold transition-all"
                    >
                      Refazer Teste
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