"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";

/** Rendered on the order confirmation page: empties the cart once. */
export function ClearCartOnMount() {
  const clear = useCartStore((s) => s.clear);

  useEffect(() => {
    clear();
  }, [clear]);

  return null;
}
