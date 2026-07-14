"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import {
  cartSubtotal,
  useCartHydrated,
  useCartStore,
} from "@/lib/cart-store";
import { ProductImage } from "./ProductImage";

export function CartDrawer() {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  if (!hydrated) return null;

  const subtotal = cartSubtotal(items);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            aria-label="Close cart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-bloom-primary/30 backdrop-blur-[2px]"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-bloom-cream px-6 py-5">
              <h2 className="font-serif text-xl font-semibold text-bloom-primary">
                Your cart
              </h2>
              <button
                type="button"
                aria-label="Close cart"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-bloom-rose transition hover:bg-bloom-cream hover:text-bloom-primary"
              >
                <X size={18} />
              </button>
            </header>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <span aria-hidden className="font-serif text-4xl text-bloom-gold/60">
                  ✿
                </span>
                <p className="text-sm text-bloom-rose">
                  Your cart is empty — take the quiz or browse the catalog.
                </p>
                <Link
                  href="/catalog"
                  onClick={() => setOpen(false)}
                  className="mt-2 rounded-full bg-bloom-primary px-5 py-2.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose"
                >
                  Browse catalog
                </Link>
              </div>
            ) : (
              <>
                <ul
                  aria-live="polite"
                  className="flex-1 space-y-4 overflow-y-auto px-6 py-5"
                >
                  {items.map((item) => (
                    <li key={item.id} className="flex gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bloom-cream">
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          sizes="80px"
                        />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={() => setOpen(false)}
                            className="text-sm font-medium text-bloom-primary hover:text-bloom-rose"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            aria-label={`Remove ${item.name} from cart`}
                            onClick={() => remove(item.id)}
                            className="text-xs text-bloom-rose underline-offset-2 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-bloom-gold/40">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() =>
                                setQuantity(item.id, item.quantity - 1)
                              }
                              className="px-3 py-1.5 text-sm text-bloom-primary hover:text-bloom-rose"
                            >
                              −
                            </button>
                            <span className="min-w-7 text-center text-xs font-medium text-bloom-primary">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() =>
                                setQuantity(item.id, item.quantity + 1)
                              }
                              disabled={
                                item.quantity >= Math.min(item.maxStock, 10)
                              }
                              className="px-3 py-1.5 text-sm text-bloom-primary hover:text-bloom-rose disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-bloom-primary">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <footer className="border-t border-bloom-cream px-6 py-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-bloom-rose">Subtotal</span>
                    <span className="font-serif text-xl font-semibold text-bloom-primary">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-bloom-rose/80">
                    Prices are re-verified at checkout.
                  </p>
                  <Link
                    href="/checkout"
                    onClick={() => setOpen(false)}
                    className="mt-4 block rounded-full bg-bloom-primary px-6 py-3 text-center text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose"
                  >
                    Checkout
                  </Link>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
