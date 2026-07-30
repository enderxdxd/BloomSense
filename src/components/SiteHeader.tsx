"use client";

import { CircleUserRound, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  cartItemCount,
  useCartHydrated,
  useCartStore,
} from "@/lib/cart-store";

const NAV_LINKS = [
  { href: "/quiz", label: "Quiz" },
  { href: "/catalog", label: "Catalog" },
  { href: "/orders", label: "Orders" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const { status } = useSession();
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const setOpen = useCartStore((s) => s.setOpen);
  const count = hydrated ? cartItemCount(items) : 0;

  // The landing ships its own fixed nav (design handoff v2); the app
  // header would double up over the 3D hero.
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-30 border-b border-bloom-gold/20 bg-bloom-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center"
        >
          <Image
            src="/brand/bloomsense-logo.svg"
            alt="BloomSense"
            width={124}
            height={54}
            className="h-10 w-auto"
            priority
          />
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

          {status === "authenticated" ? (
            <Link
              href="/account"
              aria-label="Your account"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-bloom-primary/80 transition hover:bg-white hover:text-bloom-primary"
            >
              <CircleUserRound size={17} />
              <span className="hidden sm:inline">Account</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-bloom-gold/40 px-3.5 py-1.5 text-sm text-bloom-primary transition hover:border-bloom-rose hover:bg-white"
            >
              Sign in
            </Link>
          )}

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
