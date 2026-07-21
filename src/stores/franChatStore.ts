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
  open: (prefill?: string) => void;
  close: () => void;
  addMessage: (msg: FranChatMessage) => void;
  setLoading: (v: boolean) => void;
  clearMessages: () => void;
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

  open: (prefill) =>
    set({ isOpen: true, prefillMessage: prefill ?? null }),

  close: () =>
    set({ isOpen: false, prefillMessage: null }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setLoading: (v) => set({ isLoading: v }),

  clearMessages: () => set({ messages: [], prefillMessage: null }),
}));
