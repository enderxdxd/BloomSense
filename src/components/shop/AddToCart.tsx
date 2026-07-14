"use client";

import { useState } from "react";
import { useCartStore, type AddableProduct } from "@/lib/cart-store";

interface AddToCartProps {
  product: AddableProduct;
}

export function AddToCart({ product }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const add = useCartStore((s) => s.add);
  const inCart = useCartStore(
    (s) => s.items.find((i) => i.id === product.id)?.quantity ?? 0,
  );

  const outOfStock = product.stock <= 0;
  const maxQty = Math.max(0, Math.min(product.stock, 10) - inCart);
  const capped = !outOfStock && maxQty === 0;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-bloom-sage">
          Qty
        </span>
        <div className="flex items-center rounded-full border border-bloom-gold/40">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={outOfStock || capped || quantity <= 1}
            className="px-3.5 py-2 text-bloom-primary transition hover:text-bloom-rose disabled:opacity-40"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-8 text-center text-sm font-medium text-bloom-primary"
          >
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={outOfStock || capped || quantity >= maxQty}
            className="px-3.5 py-2 text-bloom-primary transition hover:text-bloom-rose disabled:opacity-40"
          >
            +
          </button>
        </div>
      </label>

      <button
        type="button"
        onClick={() => {
          add(product, quantity);
          setQuantity(1);
        }}
        disabled={outOfStock || capped}
        className="rounded-full bg-bloom-primary px-7 py-3 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:cursor-not-allowed disabled:opacity-50"
      >
        {outOfStock
          ? "Out of stock"
          : capped
            ? "Max quantity in cart"
            : "Add to cart"}
      </button>

      {inCart > 0 && (
        <p className="text-xs text-bloom-sage">{inCart} already in your cart</p>
      )}
    </div>
  );
}
