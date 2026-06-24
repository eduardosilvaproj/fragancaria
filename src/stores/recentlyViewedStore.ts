import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentlyViewedProduct {
  id: string;
  title: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  image: string;
  viewedAt: number; // timestamp
}

interface RecentlyViewedState {
  items: RecentlyViewedProduct[];
  addItem: (product: Omit<RecentlyViewedProduct, "viewedAt">) => void;
  clearHistory: () => void;
  getRecentItems: (limit?: number, excludeId?: string) => RecentlyViewedProduct[];
}

const MAX_ITEMS = 12; // Keep last 12 viewed products

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          // Remove if already exists (will be re-added at the top)
          const filtered = state.items.filter((item) => item.id !== product.id);

          // Add new item at the beginning
          const newItem: RecentlyViewedProduct = {
            ...product,
            viewedAt: Date.now(),
          };

          // Keep only MAX_ITEMS
          const updatedItems = [newItem, ...filtered].slice(0, MAX_ITEMS);

          return { items: updatedItems };
        });
      },

      clearHistory: () => {
        set({ items: [] });
      },

      getRecentItems: (limit = 8, excludeId) => {
        const { items } = get();
        let filtered = items;

        // Exclude current product if viewing a product page
        if (excludeId) {
          filtered = items.filter((item) => item.id !== excludeId);
        }

        return filtered.slice(0, limit);
      },
    }),
    {
      name: "fragranciaria-recently-viewed",
    }
  )
);
