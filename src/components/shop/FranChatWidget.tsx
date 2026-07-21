import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFranChatStore, type FranChatMessage } from "@/stores/franChatStore";
import { chatWithFran } from "@/lib/agent/fran-chat.functions";

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

const SESSION_LIMIT = 25;

function FranMessage({ msg }: { msg: FranChatMessage }) {
  const isUser = msg.role === "user";
  // Transforma links /produto/{id} em links clicáveis
  const rendered = msg.content.replace(
    /\/produto\/(\S+)/g,
    (_, id) => `/produto/${id}`,
  );

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-[#0F3A3E] text-white rounded-br-sm"
            : "bg-[#F0EBE0] text-[#0F3A3E] rounded-bl-sm"
        }`}
      >
        {isUser ? (
          rendered
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#B07B1E]">
              <Sparkles className="w-3 h-3" />
              Fran
            </div>
            <div
              dangerouslySetInnerHTML={{
                __html: rendered.replace(
                  /\/produto\/(\S+)/g,
                  '<a href="/produto/$1" class="text-[#B07B1E] underline hover:no-underline">/produto/$1</a>',
                ),
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function FranChatWidget() {
  const { isOpen, prefillMessage, messages, isLoading, open, close, addMessage, setLoading, clearMessages } =
    useFranChatStore();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasUsedPrefill, setHasUsedPrefill] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll ao receber nova mensagem
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // Dispara o prefillMessage na primeira vez que abre com uma
  useEffect(() => {
    if (isOpen && prefillMessage && !hasUsedPrefill) {
      setHasUsedPrefill(true);
      // Envia a mensagem pré-preenchida automaticamente
      handleSend(prefillMessage);
    }
  }, [isOpen, prefillMessage, hasUsedPrefill]);

  const sessionId = useFranChatStore((s) => s.sessionId);

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isLoading) return;
      setInput("");
      setError(null);

      const userMsg: FranChatMessage = { role: "user", content: msg };
      addMessage(userMsg);
      setLoading(true);

      try {
        const result = await chatWithFran({
          data: {
            mensagem: msg,
            historico: messages.map((m) => ({ role: m.role, content: m.content })),
            sessionId,
          },
        });

        if (!result.success) {
          if (result.error === "human_mode") {
            addMessage({ role: "assistant", content: result.resposta });
          } else {
            setError(result.error);
          }
        } else {
          addMessage({ role: "assistant", content: result.resposta });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao conectar com a Fran.");
      } finally {
        setLoading(false);
      }
    },
    [input, isLoading, messages, addMessage, setLoading, sessionId],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sessionExhausted = messages.filter((m) => m.role === "user").length >= SESSION_LIMIT;

  return (
    <>
      {/* Botão flutuante (bolha) */}
      {!isOpen && (
        <MotionButton
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => open()}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#0F3A3E] text-white rounded-full shadow-lg hover:bg-[#1a4f54] transition-colors"
          aria-label="Abrir chat com a Fran"
        >
          <MessageCircle className="w-7 h-7" />
        </MotionButton>
      )}

      {/* Painel de chat */}
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-120px)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#E0D8C7]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#0F3A3E] text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#B07B1E] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Fran</p>
                  <p className="text-[11px] text-white/70">Consultora de Beleza</p>
                </div>
              </div>
              <button
                onClick={() => { close(); setHasUsedPrefill(false); }}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Fechar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F8F6F0]">
              {messages.length === 0 && (
                <div className="text-center text-[#75827E] text-sm mt-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-[#B07B1E]" />
                  <p>Olá! Sou a Fran, consultora de beleza da Fragranciaria.</p>
                  <p className="mt-1 text-xs">
                    Me pergunte sobre produtos, dicas de cuidados capilares e muito mais!
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <FranMessage key={i} msg={msg} />
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#F0EBE0] rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-[#B07B1E]/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-[#B07B1E]/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-[#B07B1E]/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Session exhausted banner */}
            {sessionExhausted && (
              <div className="px-4 py-3 bg-[#FFF8E1] border-t border-[#E0D8C7] text-sm text-[#0F3A3E]">
                <p className="font-medium text-xs uppercase tracking-wider mb-1">Limite de mensagens atingido</p>
                <p className="text-xs">
                  Fale com nossa equipe no{" "}
                  <a
                    href="https://wa.me/5516997150373?text=Olá! Preciso de ajuda com produtos capilares."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#25D366] font-semibold underline"
                  >
                    WhatsApp
                  </a>{" "}
                  para atendimento personalizado.
                </p>
              </div>
            )}

            {/* Input */}
            {!sessionExhausted && (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-[#E0D8C7] bg-white flex-shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua dúvida..."
                  disabled={isLoading}
                  className="flex-1 bg-[#F8F6F0] border border-[#E0D8C7] rounded-full px-4 py-2.5 text-sm text-[#0F3A3E] placeholder:text-[#9AA39F] outline-none focus:border-[#B07B1E] transition-colors disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="flex-shrink-0 w-10 h-10 bg-[#0F3A3E] text-white rounded-full flex items-center justify-center hover:bg-[#1a4f54] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Enviar mensagem"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </MotionDiv>
        )}
      </AnimatePresence>
    </>
  );
}
