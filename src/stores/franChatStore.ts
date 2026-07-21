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
  open: (prefill?: string) => void;
  close: () => void;
  addMessage: (msg: FranChatMessage) => void;
  setLoading: (v: boolean) => void;
  clearMessages: () => void;
}

export const useFranChatStore = create<FranChatState>()((set) => ({
  isOpen: false,
  prefillMessage: null,
  messages: [],
  isLoading: false,

  open: (prefill) =>
    set({ isOpen: true, prefillMessage: prefill ?? null }),

  close: () =>
    set({ isOpen: false, prefillMessage: null }),

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setLoading: (v) => set({ isLoading: v }),

  clearMessages: () => set({ messages: [], prefillMessage: null }),
}));
