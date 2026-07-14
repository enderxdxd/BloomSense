"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

const PetalField = dynamic(() => import("@/components/three/PetalField"), {
  ssr: false,
  loading: () => null,
});

const DESKTOP_PETALS = 200;
const MOBILE_PETALS = 60;

export function Hero() {
  const reducedMotion = useReducedMotion();
  const [petalCount, setPetalCount] = useState<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    setPetalCount(query.matches ? DESKTOP_PETALS : MOBILE_PETALS);
    const onChange = (e: MediaQueryListEvent) =>
      setPetalCount(e.matches ? DESKTOP_PETALS : MOBILE_PETALS);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <section
      aria-label="BloomSense introduction"
      className="relative flex h-[92vh] min-h-[540px] items-center justify-center overflow-hidden bg-gradient-to-b from-bloom-cream via-bloom-cream to-white"
    >
      {petalCount !== null && (
        <PetalField count={petalCount} reducedMotion={reducedMotion} />
      )}

      <div className="pointer-events-none relative z-10 px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.4em] text-bloom-sage">
          BloomSense
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-5xl font-semibold leading-[1.02] text-bloom-primary sm:text-7xl">
          Flowers that read
          <br />
          the moment
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-bloom-rose sm:text-base">
          Four questions. One AI-styled floral profile. Arrangements matched
          from a live catalog and delivered with intent.
        </p>
        <div className="pointer-events-auto mt-8">
          <MagneticLink href="/quiz" reducedMotion={reducedMotion}>
            Find my flowers
          </MagneticLink>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent"
      />
    </section>
  );
}

interface MagneticLinkProps {
  href: string;
  children: React.ReactNode;
  reducedMotion: boolean;
}

/** CTA that leans subtly toward the cursor (14E micro-interaction). */
function MagneticLink({ href, children, reducedMotion }: MagneticLinkProps) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMouseMove(e: React.MouseEvent) {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    ref.current.style.transform = `translate(${dx * 0.18}px, ${dy * 0.3}px)`;
  }

  function onMouseLeave() {
    if (ref.current) ref.current.style.transform = "translate(0, 0)";
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="inline-block rounded-full bg-bloom-primary px-9 py-4 text-sm font-medium text-bloom-cream shadow-lg transition-colors duration-200 hover:bg-bloom-rose"
      style={{ transition: "transform 0.18s ease-out, background-color 0.2s" }}
    >
      {children}
    </Link>
  );
}
