"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  maxStock: number;
  quantity: number;
}

export interface AddableProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (product: AddableProduct, quantity: number) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

const MAX_PER_LINE = 10;

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,

      add: (product, quantity) =>
        set((state) => {
          const cap = Math.min(product.stock, MAX_PER_LINE);
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + quantity, cap) }
                  : i,
              ),
              isOpen: true,
            };
          }
          return {
            items: [
              ...state.items,
              {
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageUrl: product.imageUrl,
                maxStock: product.stock,
                quantity: Math.min(quantity, cap),
              },
            ],
            isOpen: true,
          };
        }),

      remove: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      setQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.id === id
                ? {
                    ...i,
                    quantity: Math.max(
                      0,
                      Math.min(quantity, Math.min(i.maxStock, MAX_PER_LINE)),
                    ),
                  }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),
      setOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "bloomsense-cart",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * True once the persisted cart has been rehydrated on the client. Gate any
 * cart-dependent render on this to avoid SSR hydration mismatches.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    setHydrated(useCartStore.persist.hasHydrated());
    return unsub;
  }, []);

  return hydrated;
}
