"use client";

import { CircleUserRound, Menu, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  cartItemCount,
  useCartHydrated,
  useCartStore,
} from "@/lib/cart-store";
import { isActiveLink, visibleNavLinks } from "@/lib/nav";

export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const setOpen = useCartStore((s) => s.setOpen);
  const count = hydrated ? cartItemCount(items) : 0;

  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A tap on a link navigates without unmounting the header, so the panel
  // has to be closed explicitly.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // The landing ships its own fixed nav (design handoff v2); the app
  // header would double up over the 3D hero.
  if (pathname === "/") return null;

  const authenticated = status === "authenticated";
  const links = visibleNavLinks({
    authenticated,
    role: session?.user?.role,
  });

  return (
    <header className="sticky top-0 z-30 border-b border-bloom-gold/20 bg-bloom-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src="/brand/bloomsense-logo.svg"
            alt="BloomSense"
            width={124}
            height={54}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {/* Type matches the landing nav's voice — uppercase micro-caps with
            wide tracking — so crossing from / into the app is not a jolt. */}
        <nav
          aria-label="Main"
          className="hidden flex-1 items-center justify-center gap-7 md:flex"
        >
          {links.map((link) => {
            const active = isActiveLink(link, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative py-1 text-[12px] uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? "text-bloom-primary"
                    : "text-bloom-primary/65 hover:text-bloom-primary"
                }`}
              >
                {link.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-0.5 h-px bg-bloom-rose"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {authenticated ? (
            <Link
              href="/account"
              aria-label="Your account"
              aria-current={pathname.startsWith("/account") ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] uppercase tracking-[0.12em] transition ${
                pathname.startsWith("/account")
                  ? "bg-white text-bloom-primary"
                  : "text-bloom-primary/70 hover:bg-white hover:text-bloom-primary"
              }`}
            >
              <CircleUserRound size={17} />
              <span className="hidden sm:inline">Account</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-bloom-gold/40 px-4 py-1.5 text-[12px] uppercase tracking-[0.12em] text-bloom-primary transition hover:border-bloom-rose hover:bg-white"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative rounded-full p-2 text-bloom-primary transition hover:bg-white"
          >
            <ShoppingBag size={19} />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bloom-primary px-1 text-[10px] font-semibold text-bloom-cream"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
            <span aria-live="polite" className="sr-only">
              {count} items in cart
            </span>
          </button>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="rounded-full p-2 text-bloom-primary transition hover:bg-white md:hidden"
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="site-menu"
          aria-label="Main mobile"
          className="border-t border-bloom-gold/20 bg-bloom-cream/95 px-4 pb-3 pt-1 sm:px-6 md:hidden"
        >
          {links.map((link) => {
            const active = isActiveLink(link, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b border-bloom-gold/15 py-3 text-[12px] uppercase tracking-[0.14em] last:border-0 ${
                  active ? "text-bloom-primary" : "text-bloom-primary/70"
                }`}
              >
                {/* Same rose rule as the desktop nav — a colour shift alone
                    is too quiet to read as "you are here" on a small panel. */}
                <span className="relative inline-block">
                  {link.label}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-1 h-px bg-bloom-rose"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
