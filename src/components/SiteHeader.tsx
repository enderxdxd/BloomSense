"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import {
  cartItemCount,
  useCartHydrated,
  useCartStore,
} from "@/lib/cart-store";

const NAV_LINKS = [
  { href: "/", label: "Quiz" },
  { href: "/catalog", label: "Catalog" },
  { href: "/orders", label: "Orders" },
] as const;

export function SiteHeader() {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const setOpen = useCartStore((s) => s.setOpen);
  const count = hydrated ? cartItemCount(items) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-bloom-gold/20 bg-bloom-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-wide text-bloom-primary"
        >
          BloomSense
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-sm text-bloom-primary/80 transition hover:bg-white hover:text-bloom-primary"
            >
              {link.label}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative ml-1 rounded-full p-2 text-bloom-primary transition hover:bg-white"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-bloom-primary px-1 text-[10px] font-semibold text-bloom-cream"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
            <span aria-live="polite" className="sr-only">
              {count} items in cart
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
