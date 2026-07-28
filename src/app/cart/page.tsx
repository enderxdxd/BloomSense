"use client";

import Link from "next/link";
import {
  cartSubtotal,
  useCartHydrated,
  useCartStore,
} from "@/lib/cart-store";
import {
  deliveryFeeCents,
  FREE_DELIVERY_THRESHOLD_CENTS,
} from "@/lib/delivery";
import { ProductImage } from "@/components/shop/ProductImage";

export default function CartPage() {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  if (!hydrated) return null;

  const subtotalCents = Math.round(cartSubtotal(items) * 100);
  const feeCents = deliveryFeeCents(subtotalCents);
  const shortfall = FREE_DELIVERY_THRESHOLD_CENTS - subtotalCents;

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            BloomSense
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-bloom-primary">
            Your cart
          </h1>
        </header>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-bloom-gold/30 bg-white p-12 text-center shadow-sm">
            <span aria-hidden className="font-serif text-5xl text-bloom-gold/50">
              ✿
            </span>
            <p className="mt-4 text-sm text-bloom-rose">
              Your cart is empty. Take the{" "}
              <Link href="/quiz" className="underline underline-offset-2">
                quiz
              </Link>{" "}
              for a personal match, or{" "}
              <Link href="/catalog" className="underline underline-offset-2">
                browse the catalog
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
            <section aria-label="Cart items">
              <ul className="space-y-4">
                {items.map((item) => {
                  const cap = Math.min(item.maxStock, 10);
                  return (
                    <li
                      key={item.id}
                      className="flex gap-4 rounded-2xl border border-bloom-gold/30 bg-white p-4 shadow-sm"
                    >
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-bloom-cream">
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          sizes="96px"
                        />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/product/${item.slug}`}
                            className="font-serif text-lg font-semibold text-bloom-primary hover:text-bloom-rose"
                          >
                            {item.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            className="text-xs text-bloom-rose underline-offset-2 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-bloom-rose">
                          ${item.price.toFixed(2)} each
                        </p>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="flex items-center rounded-full border border-bloom-gold/40">
                            <button
                              type="button"
                              aria-label={`Decrease ${item.name} quantity`}
                              onClick={() =>
                                setQuantity(item.id, item.quantity - 1)
                              }
                              className="px-3.5 py-1.5 text-bloom-primary hover:text-bloom-rose"
                            >
                              −
                            </button>
                            <span className="min-w-8 text-center text-sm font-medium text-bloom-primary">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase ${item.name} quantity`}
                              onClick={() =>
                                setQuantity(item.id, item.quantity + 1)
                              }
                              disabled={item.quantity >= cap}
                              className="px-3.5 py-1.5 text-bloom-primary hover:text-bloom-rose disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-serif text-lg font-semibold text-bloom-primary">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        {item.quantity >= cap && (
                          <p className="mt-1.5 text-xs text-bloom-gold">
                            Maximum available for this arrangement.
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={clear}
                className="mt-4 text-xs text-bloom-rose underline-offset-2 hover:underline"
              >
                Empty cart
              </button>
            </section>

            <aside className="h-fit rounded-2xl border border-bloom-gold/30 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-medium uppercase tracking-[0.28em] text-bloom-sage">
                Summary
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-bloom-rose">Subtotal</dt>
                  <dd className="text-bloom-primary">
                    ${(subtotalCents / 100).toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-bloom-rose">Delivery</dt>
                  <dd className="text-bloom-primary">
                    {feeCents === 0 ? "Free" : `$${(feeCents / 100).toFixed(2)}`}
                  </dd>
                </div>
              </dl>
              {shortfall > 0 && (
                <p className="mt-3 rounded-lg bg-bloom-cream px-3 py-2 text-xs text-bloom-sage">
                  Add ${(shortfall / 100).toFixed(2)} more for free delivery.
                </p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-bloom-cream pt-4">
                <span className="text-sm text-bloom-rose">Total</span>
                <span className="font-serif text-2xl font-semibold text-bloom-primary">
                  ${((subtotalCents + feeCents) / 100).toFixed(2)}
                </span>
              </div>
              <Link
                href="/checkout"
                className="mt-5 block rounded-full bg-bloom-primary px-6 py-3.5 text-center text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose"
              >
                Checkout
              </Link>
              <Link
                href="/catalog"
                className="mt-3 block text-center text-xs text-bloom-rose underline-offset-2 hover:underline"
              >
                Continue shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
