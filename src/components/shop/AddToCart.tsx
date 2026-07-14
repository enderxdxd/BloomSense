"use client";

import { useState } from "react";

export interface CartProductInput {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
}

interface AddToCartProps {
  product: CartProductInput;
}

/**
 * Quantity selector + add-to-cart. Cart state lands in Phase 11A — until
 * then the button is disabled with an explanatory label.
 */
export function AddToCart({ product }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  const outOfStock = product.stock <= 0;
  const maxQty = Math.min(product.stock, 10);

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
            disabled={outOfStock || quantity <= 1}
            className="px-3.5 py-2 text-bloom-primary transition hover:text-bloom-rose disabled:opacity-40"
          >
            −
          </button>
          <span aria-live="polite" className="min-w-8 text-center text-sm font-medium text-bloom-primary">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={outOfStock || quantity >= maxQty}
            className="px-3.5 py-2 text-bloom-primary transition hover:text-bloom-rose disabled:opacity-40"
          >
            +
          </button>
        </div>
      </label>

      <button
        type="button"
        disabled
        title="Cart arrives in the next release"
        className="rounded-full bg-bloom-primary px-7 py-3 text-sm font-medium text-bloom-cream opacity-50"
      >
        Add to cart — coming soon
      </button>
    </div>
  );
}
