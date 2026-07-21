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

export const useFranChatStore = create<FranChatState>()((set) => ({
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
}));
