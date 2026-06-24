import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SimpleCartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  vendor: string;
}

interface SimpleCartStore {
  items: SimpleCartItem[];
  isOpen: boolean;
  addItem: (item: Omit<SimpleCartItem, 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setIsOpen: (open: boolean) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<SimpleCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(i => i.id === item.id);
        const qty = item.quantity || 1;

        if (existingItem) {
          set({
            items: items.map(i =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + qty }
                : i
            )
          });
        } else {
          set({ items: [...items, { ...item, quantity: qty }] });
        }
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        const { items } = get();
        set({
          items: items.map(i => i.id === id ? { ...i, quantity } : i)
        });
      },

      removeItem: (id) => {
        const { items } = get();
        set({ items: items.filter(i => i.id !== id) });
      },

      clearCart: () => set({ items: [] }),

      setIsOpen: (open) => set({ isOpen: open }),

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'fragranciaria-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
