import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CompareProduct {
  id: string;
  title: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  description?: string;
}

interface CompareState {
  items: CompareProduct[];
  isOpen: boolean;
  maxItems: number;
  addItem: (product: CompareProduct) => boolean;
  removeItem: (productId: string) => void;
  clearItems: () => void;
  isInCompare: (productId: string) => boolean;
  toggleItem: (product: CompareProduct) => boolean;
  openCompare: () => void;
  closeCompare: () => void;
}

const MAX_COMPARE_ITEMS = 4;

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      maxItems: MAX_COMPARE_ITEMS,

      addItem: (product) => {
        const { items } = get();

        // Check if already in compare
        if (items.some((item) => item.id === product.id)) {
          return false;
        }

        // Check if max reached
        if (items.length >= MAX_COMPARE_ITEMS) {
          return false;
        }

        set({ items: [...items, product] });
        return true;
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      clearItems: () => {
        set({ items: [], isOpen: false });
      },

      isInCompare: (productId) => {
        return get().items.some((item) => item.id === productId);
      },

      toggleItem: (product) => {
        const { items, addItem, removeItem } = get();
        const isInList = items.some((item) => item.id === product.id);

        if (isInList) {
          removeItem(product.id);
          return false;
        } else {
          return addItem(product);
        }
      },

      openCompare: () => {
        set({ isOpen: true });
      },

      closeCompare: () => {
        set({ isOpen: false });
      },
    }),
    {
      name: "fragranciaria-compare",
    }
  )
);
