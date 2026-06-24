import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  id: string;
  title: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  image: string;
  addedAt: number;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: Omit<WishlistItem, "addedAt">) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: Omit<WishlistItem, "addedAt">) => boolean; // returns true if added, false if removed
  isInWishlist: (id: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();
        if (!items.find((i) => i.id === item.id)) {
          set({
            items: [
              ...items,
              { ...item, addedAt: Date.now() },
            ],
          });
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        });
      },

      toggleItem: (item) => {
        const { items } = get();
        const exists = items.find((i) => i.id === item.id);

        if (exists) {
          set({
            items: items.filter((i) => i.id !== item.id),
          });
          return false;
        } else {
          set({
            items: [
              ...items,
              { ...item, addedAt: Date.now() },
            ],
          });
          return true;
        }
      },

      isInWishlist: (id) => {
        return get().items.some((item) => item.id === id);
      },

      clearWishlist: () => {
        set({ items: [] });
      },
    }),
    {
      name: "fragranciaria-wishlist",
    }
  )
);
