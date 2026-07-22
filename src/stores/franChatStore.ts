import { create } from "zustand";

export interface FranChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FranChatState {
  isOpen: boolean;
  prefillMessage: string | null;
  messages: FranChatMessage[];
  isLoading: boolean;
  /** Identificador de navegador (UUID). Persiste em localStorage.
   *  Não é identidade de pessoa — limpar navegador gera nova sessão. */
  sessionId: string;
  /** Quem está respondendo: 'fran' (IA) ou 'human' (atendente). null se nunca
   *  houve conversa. Atualizado pelo polling. */
  repliedBy: "fran" | "human" | null;
  /** Timestamp ISO (com ms) da última mensagem conhecida. Usado como cursor
   *  no polling para pedir só mensagens mais novas. */
  lastPollTimestamp: string;
  open: (prefill?: string) => void;
  close: () => void;
  addMessage: (msg: FranChatMessage) => void;
  setLoading: (v: boolean) => void;
  clearMessages: () => void;
  setRepliedBy: (v: "fran" | "human" | null) => void;
  setLastPollTimestamp: (v: string) => void;
  /** Carrega histórico do banco e popula messages. Retorna true se achou conversa. */
  loadHistory: () => Promise<boolean>;
}

function loadSessionId(): string {
  const key = "fran_session_id";
  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;
  } catch { /* localStorage indisponível — gera nova */ }
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(key, id);
  } catch { /* ignora */ }
  return id;
}

export const useFranChatStore = create<FranChatState>()((set, get) => ({
  isOpen: false,
  prefillMessage: null,
  messages: [],
  isLoading: false,
  sessionId: loadSessionId(),
  repliedBy: null,
  lastPollTimestamp: new Date().toISOString(),

  open: (prefill) =>
    set({ isOpen: true, prefillMessage: prefill ?? null }),

  close: () =>
    set({ isOpen: false, prefillMessage: null }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setLoading: (v) => set({ isLoading: v }),

  clearMessages: () => set({ messages: [], prefillMessage: null }),

  setRepliedBy: (v) => set({ repliedBy: v }),

  setLastPollTimestamp: (v) => set({ lastPollTimestamp: v }),

  loadHistory: async () => {
    const { getWebHistory } = await import("@/lib/whatsapp.functions");
    const sessionId = get().sessionId;
    const result = await getWebHistory({ data: { sessionId } });
    if (!result.success) {
      if (result.error === "rate_limited") {
        console.warn("[FranStore] loadHistory rate limited");
      }
      return false;
    }
    if (result.messages.length === 0) {
      return false;
    }
    const msgs = result.messages.map((m) => ({
      role: (m.sender === "customer" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));
    // Último timestamp vira cursor do polling
    const lastTs = result.messages[result.messages.length - 1].created_at;
    set({ messages: msgs, lastPollTimestamp: lastTs });
    if (result.repliedBy) {
      set({ repliedBy: result.repliedBy });
    }
    return true;
  },
}));
