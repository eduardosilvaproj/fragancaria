import { useState } from "react";
import { Bell, X, Check, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const MotionDiv = motion.div as any;

interface StockAlertProps {
  productId: string;
  productName: string;
  className?: string;
  variant?: "button" | "inline";
}

export function StockAlert({
  productId,
  productName,
  className,
  variant = "button",
}: StockAlertProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setIsSubmitting(true);

    // Simulate API call - in production, this would send to backend
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Save to localStorage for demo purposes
    const alerts = JSON.parse(localStorage.getItem("fragranciaria-stock-alerts") || "[]");
    alerts.push({
      productId,
      productName,
      email,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("fragranciaria-stock-alerts", JSON.stringify(alerts));

    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success("Você será notificado quando o produto voltar ao estoque!");

    setTimeout(() => {
      setIsOpen(false);
      setIsSubmitted(false);
      setEmail("");
    }, 2000);
  };

  if (variant === "inline") {
    return (
      <div className={cn("bg-[#FEF3C7] border border-[#F59E0B]/30 p-4", className)}>
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-[#D97706] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[14px] text-[#92400E] font-medium">
              Produto esgotado
            </p>
            <p className="text-[13px] text-[#A16207] mt-1">
              Deixe seu email para ser avisado quando voltar ao estoque.
            </p>

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 px-3 py-2 border border-[#E9E1D2] text-[13px] outline-none focus:border-[#B07B1E] transition-colors"
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0F3A3E] text-white text-[11px] uppercase tracking-[0.1em] font-semibold hover:bg-[#16504F] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "..." : "Avisar"}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2 mt-3 text-[#1c6b4a]">
                <Check className="w-4 h-4" />
                <span className="text-[13px]">Email cadastrado com sucesso!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-2 text-[13px] text-[#D97706] hover:text-[#B45309] transition-colors",
          className
        )}
      >
        <Bell className="w-4 h-4" />
        <span>Avise-me quando disponível</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setIsOpen(false)}
          >
            <MotionDiv
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-[400px] bg-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E9E1D2]">
                <h3 className="font-serif text-[20px] text-[#0F3A3E]">
                  Avise-me
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-[#75827E] hover:text-[#0F3A3E] hover:bg-[#F8F4EA] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {!isSubmitted ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-[#FEF3C7] flex items-center justify-center">
                        <Bell className="w-6 h-6 text-[#D97706]" />
                      </div>
                      <div>
                        <p className="text-[14px] text-[#0F3A3E] font-medium">
                          Produto temporariamente esgotado
                        </p>
                        <p className="text-[12px] text-[#75827E] mt-0.5">
                          {productName}
                        </p>
                      </div>
                    </div>

                    <p className="text-[14px] text-[#51635F] mb-5">
                      Deixe seu email e avisaremos assim que o produto estiver disponível novamente.
                    </p>

                    <form onSubmit={handleSubmit}>
                      <div className="relative mb-4">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9AA39F]" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Digite seu melhor email"
                          className="w-full pl-11 pr-4 py-3.5 border border-[#E9E1D2] text-[14px] outline-none focus:border-[#B07B1E] transition-colors"
                          autoFocus
                          disabled={isSubmitting}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-[#0F3A3E] text-white text-[12px] uppercase tracking-[0.16em] font-semibold hover:bg-[#16504F] transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? "Cadastrando..." : "Quero ser avisado"}
                      </button>

                      <p className="text-[11px] text-[#9AA39F] text-center mt-3">
                        Não enviamos spam. Você receberá apenas um email.
                      </p>
                    </form>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-[#1c6b4a]/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-[#1c6b4a]" />
                    </div>
                    <h4 className="font-serif text-[20px] text-[#0F3A3E] mb-2">
                      Cadastrado!
                    </h4>
                    <p className="text-[14px] text-[#51635F]">
                      Você receberá um email assim que<br />
                      o produto estiver disponível.
                    </p>
                  </div>
                )}
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
}
