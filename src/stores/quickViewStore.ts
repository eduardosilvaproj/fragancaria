import { create } from "zustand";

interface QuickViewState {
  productId: string | null;
  isOpen: boolean;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;
}

export const useQuickViewStore = create<QuickViewState>()((set) => ({
  productId: null,
  isOpen: false,

  openQuickView: (productId: string) => {
    set({ productId, isOpen: true });
  },

  closeQuickView: () => {
    set({ isOpen: false });
    // Delay clearing productId to allow exit animation
    setTimeout(() => {
      set({ productId: null });
    }, 300);
  },
}));
