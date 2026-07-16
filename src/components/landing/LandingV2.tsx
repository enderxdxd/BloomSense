"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/shop/ProductImage";
import { useReducedMotion } from "@/lib/useReducedMotion";

/*
 * Landing v2 — implementation of the Claude Design handoff
 * ("BloomSense Landing v2"). Palette/typography/copy follow the handoff
 * verbatim (scoped hex values; the app-wide bloom-* tokens are untouched).
 * The 3D hero is the handoff's portable <bloom-hero-v2> web component,
 * self-hosted under /vendor with a vendored three.js 0.161 module so the
 * strict CSP (script-src 'self') admits it.
 */

const ACCENT = "#C98A8E";

export interface LandingProduct {
  name: string;
  price: string;
  desc: string;
  /** Real catalog slug; null on the static fallback set (DB unreachable). */
  slug: string | null;
  imageUrl: string | null;
}

interface LandingV2Props {
  products: LandingProduct[];
}

const CAPTIONS = [
  { a: 0.0, b: 0.05, side: "left" as const, top: "38%", wide: true, text: ["A garden,", "arranged."] },
  { a: 0.06, b: 0.16, side: "right" as const, top: "40%", text: ["It begins in our garden beds."] },
  { a: 0.19, b: 0.3, side: "left" as const, top: "42%", text: ["Garden roses, raised slowly."] },
  { a: 0.33, b: 0.42, side: "right" as const, top: "42%", text: ["Cut at dawn, at first bloom."] },
  { a: 0.46, b: 0.58, side: "right" as const, top: "40%", text: ["Tulips, for the hopeful."] },
  { a: 0.62, b: 0.74, side: "left" as const, top: "38%", text: ["Lavender, for the calm."] },
  { a: 0.78, b: 0.88, side: "left" as const, top: "42%", wide: true, text: ["Gathered for weddings, gifts, and Tuesdays."] },
];

export function LandingV2({ products }: LandingV2Props) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="bg-[#F8F4EC] font-karla text-[#3D3733] selection:bg-[#EFD9DB]">
      <Script src="/vendor/bloom-hero-v2.js" strategy="afterInteractive" />
      <LandingNav />
      <div className="bg-gradient-to-b from-[#FAF6EF] via-[#F8F4EC] to-[#F4EDE1]">
        {reducedMotion ? <HeroStatic /> : <HeroJourney />}
        <Arrangements products={products} />
        <Craft />
        <MiniQuiz />
        <Weddings />
        <Visit />
        <LandingFooter />
      </div>
    </div>
  );
}

/* ============================ NAV ============================ */

const NAV_ITEMS = [
  { href: "/#arrangements", label: "Arrangements" },
  { href: "/#quiz", label: "Find your flower" },
  { href: "/#weddings", label: "Weddings" },
  { href: "/#craft", label: "Our craft" },
] as const;

function LandingNav() {
  return (
    <nav
      aria-label="Landing"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 sm:px-12"
    >
      <Link
        href="/"
        className="pointer-events-auto font-serif text-[27px] font-semibold tracking-[0.04em]"
      >
        Bloom
        <span className="italic" style={{ color: ACCENT }}>
          Sense
        </span>
      </Link>
      <div className="pointer-events-auto hidden items-center gap-[clamp(14px,2.2vw,34px)] whitespace-nowrap text-[13px] uppercase tracking-[0.10em] md:flex">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="text-[#3D3733] transition hover:text-[#C98A8E]"
          >
            {item.label}
          </a>
        ))}
        <Link
          href="/catalog"
          className="rounded-full border border-[#3D3733] px-5 py-[9px] text-[#3D3733] transition hover:bg-[#3D3733] hover:text-[#F8F4EC]"
        >
          Order
        </Link>
      </div>
      <Link
        href="/catalog"
        className="pointer-events-auto rounded-full border border-[#3D3733] px-5 py-[9px] text-[13px] uppercase tracking-[0.10em] transition hover:bg-[#3D3733] hover:text-[#F8F4EC] md:hidden"
      >
        Order
      </Link>
    </nav>
  );
}

/* ============================ HERO ============================ */

function HeroContent() {
  return (
    <bloom-hero-v2
      accent={ACCENT}
      motion="55"
      dof="true"
      particles="true"
      className="absolute inset-0"
    />
  );
}

function FinalHeadline({ visible }: { visible: boolean }) {
  return (
    <div
      data-final
      className="pointer-events-none absolute left-[8%] top-1/2 flex max-w-[440px] -translate-y-1/2 flex-col gap-[22px]"
      style={visible ? { opacity: 1 } : { opacity: 0 }}
    >
      <div
        className="text-[13px] uppercase tracking-[0.22em]"
        style={{ color: ACCENT }}
      >
        Boutique florist · est. 2026
      </div>
      <h1 className="m-0 font-serif text-[clamp(46px,5.2vw,72px)] font-medium leading-[1.04] text-[#3D3733]">
        From seed
        <br />
        to{" "}
        <em className="italic" style={{ color: ACCENT }}>
          sentiment.
        </em>
      </h1>
      <p className="m-0 max-w-[380px] text-[17px] leading-[1.65] text-[#6B5F55]">
        Arrangements grown, gathered and tied by hand in our atelier —
        delivered the morning they bloom.
      </p>
      <div className="pointer-events-auto mt-1.5 flex flex-wrap gap-3.5">
        <Link
          href="/catalog"
          className="rounded-full bg-[#3D3733] px-[30px] py-[15px] text-[14px] uppercase tracking-[0.1em] text-[#F8F4EC] transition hover:bg-[#C98A8E] hover:text-white"
        >
          Shop bouquets
        </Link>
        <a
          href="/#craft"
          className="rounded-full border border-[#C9BBA8] px-[30px] py-[15px] text-[14px] uppercase tracking-[0.1em] text-[#3D3733] transition hover:border-[#3D3733]"
        >
          Our craft
        </a>
      </div>
    </div>
  );
}

/** Full scroll journey: 1150vh track, sticky viewport, progress-driven captions. */
function HeroJourney() {
  const trackRef = useRef<HTMLElement>(null);
  const capRefs = useRef<Array<HTMLDivElement | null>>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const update = () => {
      raf = 0;
      const r = track.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp01(-r.top / total) : 0;

      CAPTIONS.forEach((cap, i) => {
        const el = capRefs.current[i];
        if (!el) return;
        const fadeIn = clamp01((p - cap.a) / 0.025);
        const fadeOut = clamp01((cap.b - p) / 0.025);
        const o = cap.a === 0 ? fadeOut : Math.min(fadeIn, fadeOut);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 14}px)`;
      });

      if (hintRef.current) {
        hintRef.current.style.opacity = String(clamp01((0.06 - p) / 0.025));
      }

      const final = finalRef.current?.querySelector<HTMLElement>("[data-final]");
      if (final) {
        const o = clamp01((p - 0.9) / 0.05);
        final.style.opacity = String(o);
        final.style.transform = `translateY(calc(-50% + ${(1 - o) * 24}px))`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={trackRef}
      aria-label="BloomSense — from seed to sentiment"
      data-bloom-track="true"
      className="relative h-[1150vh]"
    >
      <div ref={finalRef} className="sticky top-0 h-screen overflow-hidden">
        <HeroContent />

        <div aria-hidden className="pointer-events-none absolute inset-0">
          {CAPTIONS.map((cap, i) => (
            <div
              key={i}
              ref={(el) => {
                capRefs.current[i] = el;
              }}
              className={`absolute font-serif italic leading-[1.3] text-[#6B5F55] opacity-0 ${
                cap.side === "left" ? "left-[8%] sm:left-[10%]" : "right-[12%] text-right"
              } ${cap.wide ? "max-w-[420px] text-[38px] sm:text-[46px]" : "max-w-[320px] text-[28px] sm:text-[34px]"}`}
              style={{
                top: cap.top,
                ...(i === 0 ? { color: "#59504A", lineHeight: 1.25 } : {}),
              }}
            >
              {cap.text.map((line, li) => (
                <span key={li}>
                  {li > 0 && <br />}
                  {line}
                </span>
              ))}
            </div>
          ))}
        </div>

        <FinalHeadline visible={false} />

        <div
          ref={hintRef}
          aria-hidden
          className="pointer-events-none absolute bottom-9 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2.5"
        >
          <div className="text-[12px] uppercase tracking-[0.24em] text-[#9A8D7E]">
            Scroll to bloom
          </div>
          <div className="h-11 w-px animate-[bloomHintBob_2.4s_ease-in-out_infinite] bg-gradient-to-b from-[#C9BBA8] to-transparent" />
        </div>
      </div>
    </section>
  );
}

/**
 * Reduced motion: no 11-viewport journey. One viewport, the hero in its
 * ambient mode (no [data-bloom-track] ancestor → the component opens the
 * garden immediately at motion×0.15) with the headline readable at once.
 */
function HeroStatic() {
  return (
    <section
      aria-label="BloomSense — from seed to sentiment"
      className="relative h-svh min-h-[560px] overflow-hidden"
    >
      <HeroContent />
      <FinalHeadline visible />
    </section>
  );
}

/* ======================== ARRANGEMENTS ======================== */

function Arrangements({ products }: { products: LandingProduct[] }) {
  return (
    <section
      id="arrangements"
      className="mx-auto max-w-[1240px] px-6 pb-[100px] pt-[120px] sm:px-12"
    >
      <div className="mb-14 flex flex-wrap items-baseline justify-between gap-6">
        <h2 className="m-0 font-serif text-[46px] font-medium text-[#3D3733]">
          Signature arrangements
        </h2>
        <Link
          href="/catalog"
          className="border-b border-[#C9BBA8] pb-1 text-[13px] uppercase tracking-[0.16em] transition hover:text-[#C98A8E]"
        >
          View all
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-9">
        {products.map((product) => {
          const card = (
            <>
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[18px] bg-[#F1EAE0]">
                {product.imageUrl ? (
                  <ProductImage src={product.imageUrl} alt={product.name} />
                ) : (
                  <PlaceholderTile label={product.name} />
                )}
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-serif text-2xl font-medium">
                  {product.name}
                </div>
                <div className="text-[15px] text-[#9A8D7E]">{product.price}</div>
              </div>
              <div className="-mt-2 text-[15px] leading-[1.6] text-[#6B5F55]">
                {product.desc}
              </div>
            </>
          );
          const className = "group flex flex-col gap-4";
          return product.slug ? (
            <Link key={product.name} href={`/product/${product.slug}`} className={className}>
              {card}
            </Link>
          ) : (
            <Link key={product.name} href="/catalog" className={className}>
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function PlaceholderTile({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#EFD9DB] via-[#F1EAE0] to-[#DCE3D2]"
    >
      <span aria-hidden className="font-serif text-5xl text-[#3D3733]/25">
        ✿
      </span>
    </div>
  );
}

/* ============================ CRAFT ============================ */

function Craft() {
  return (
    <section id="craft" className="bg-[#F1EAE0] px-6 py-[110px] sm:px-12">
      <div className="mx-auto grid max-w-[1080px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-16">
        <div className="flex flex-col gap-6">
          <div
            className="text-[13px] uppercase tracking-[0.22em]"
            style={{ color: ACCENT }}
          >
            Our craft
          </div>
          <h2 className="m-0 font-serif text-[44px] font-medium leading-[1.15]">
            Grown slowly.
            <br />
            Arranged{" "}
            <em className="italic" style={{ color: ACCENT }}>
              deliberately.
            </em>
          </h2>
          <p className="m-0 text-[17px] leading-[1.7] text-[#6B5F55]">
            We grow most of what we sell — garden roses, tulips and lavender
            raised in our own beds, cut at dawn and arranged the same morning.
            No cold storage, no imports, no two bouquets alike.
          </p>
          <div className="mt-2 flex gap-10">
            <div className="flex flex-col gap-1">
              <div className="font-serif text-4xl text-[#3D3733]">48h</div>
              <div className="text-[13px] uppercase tracking-[0.1em] text-[#9A8D7E]">
                Seed-cut to door
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="font-serif text-4xl text-[#3D3733]">100%</div>
              <div className="text-[13px] uppercase tracking-[0.1em] text-[#9A8D7E]">
                Grown in-house
              </div>
            </div>
          </div>
        </div>
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px]">
          <PlaceholderTile label="Atelier — florists at work" />
        </div>
      </div>
    </section>
  );
}

/* ========================= MINI QUIZ ========================= */

const SUGGESTIONS: Record<
  string,
  { name: string; price: string; note: string; desc: string }
> = {
  Anniversary: {
    name: "The Dawn Garden",
    price: "$85",
    note: "Romance, in full bloom.",
    desc: "Garden roses and white tulips — our most-loved pairing for the ones who stayed.",
  },
  "New home": {
    name: "Ivory & Ash",
    price: "$95",
    note: "Calm for new rooms.",
    desc: "An all-white arrangement with eucalyptus that settles a space instantly.",
  },
  "Thank you": {
    name: "Lavender Hour",
    price: "$68",
    note: "Gratitude that lingers.",
    desc: "Dried lavender and cream ranunculus — it keeps its scent for weeks.",
  },
  "Just because": {
    name: "The Dawn Garden",
    price: "$85",
    note: "The florist’s pick this week.",
    desc: "Whatever bloomed best at dawn today, tied with silk ribbon.",
  },
};

function MiniQuiz() {
  const [picked, setPicked] = useState<string | null>(null);
  const suggestion = picked ? SUGGESTIONS[picked] : null;

  return (
    <section id="quiz" className="px-6 py-[110px] sm:px-12">
      <div className="mx-auto flex max-w-[860px] flex-col items-center gap-5 text-center">
        <div
          className="text-[13px] uppercase tracking-[0.22em]"
          style={{ color: ACCENT }}
        >
          Find your flower
        </div>
        <h2 className="m-0 font-serif text-[44px] font-medium leading-[1.15]">
          What is the{" "}
          <em className="italic" style={{ color: ACCENT }}>
            occasion?
          </em>
        </h2>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {Object.keys(SUGGESTIONS).map((label) => {
            const selected = picked === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setPicked(label)}
                aria-pressed={selected}
                className={`rounded-full border px-[26px] py-[13px] text-[14px] uppercase tracking-[0.08em] transition-all duration-[250ms] ${
                  selected
                    ? "border-[#3D3733] bg-[#3D3733] text-[#F8F4EC]"
                    : "border-[#C9BBA8] bg-transparent text-[#3D3733] hover:border-[#3D3733]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {suggestion && (
          <div className="mt-[26px] flex max-w-[560px] flex-col items-center gap-2.5 rounded-[20px] border border-[#E3D9C9] bg-[#FCF9F3] px-10 py-[34px]">
            <div className="text-[12px] uppercase tracking-[0.2em] text-[#9A8D7E]">
              Our suggestion
            </div>
            <div className="font-serif text-[32px] font-medium text-[#3D3733]">
              {suggestion.name}
            </div>
            <div
              className="font-serif text-[19px] italic"
              style={{ color: ACCENT }}
            >
              {suggestion.note}
            </div>
            <div className="text-[15px] leading-[1.6] text-[#6B5F55]">
              {suggestion.desc}
            </div>
            <a
              href="/#arrangements"
              className="mt-2 rounded-full bg-[#3D3733] px-[26px] py-[13px] text-[13px] uppercase tracking-[0.1em] text-[#F8F4EC] transition hover:bg-[#C98A8E] hover:text-white"
            >
              See this arrangement · {suggestion.price}
            </a>
          </div>
        )}

        <p className="mt-4 text-[14px] text-[#9A8D7E]">
          Want it styled to the person, not just the occasion?{" "}
          <Link
            href="/quiz"
            className="underline underline-offset-4 transition hover:text-[#C98A8E]"
          >
            Take the full AI quiz
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

/* ========================== WEDDINGS ========================== */

function Weddings() {
  return (
    <section id="weddings" className="bg-[#F1EAE0] px-6 py-[110px] sm:px-12">
      <div className="mx-auto grid max-w-[1080px] grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-16">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px]">
          <PlaceholderTile label="Wedding ceremony florals" />
        </div>
        <div className="flex flex-col gap-6">
          <div
            className="text-[13px] uppercase tracking-[0.22em]"
            style={{ color: ACCENT }}
          >
            Weddings &amp; events
          </div>
          <h2 className="m-0 font-serif text-[44px] font-medium leading-[1.15]">
            Your day,
            <br />
            in{" "}
            <em className="italic" style={{ color: ACCENT }}>
              flower.
            </em>
          </h2>
          <p className="m-0 text-[17px] leading-[1.7] text-[#6B5F55]">
            Bouquets, arches, tablescapes and boutonnières — composed around
            your palette from roses, tulips, lavender and gypsophila grown in
            our own beds. One florist, start to finish.
          </p>
          <div className="flex gap-3.5">
            <Link
              href="/catalog?category=WEDDING_PACKAGE"
              className="rounded-full bg-[#3D3733] px-[30px] py-[15px] text-[14px] uppercase tracking-[0.1em] text-[#F8F4EC] transition hover:bg-[#C98A8E] hover:text-white"
            >
              Plan with us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================ VISIT ============================ */

function Visit() {
  return (
    <section id="visit" className="px-6 py-[120px] text-center sm:px-12">
      <div className="mx-auto flex max-w-[620px] flex-col items-center gap-[22px]">
        <h2 className="m-0 font-serif text-[44px] font-medium leading-[1.15]">
          Fresh stems,{" "}
          <em className="italic" style={{ color: ACCENT }}>
            every Friday.
          </em>
        </h2>
        <p className="m-0 text-[17px] leading-[1.7] text-[#6B5F55]">
          Join the weekly bouquet subscription, or visit the atelier — 14
          Rosemary Lane, open Tuesday through Saturday.
        </p>
        <Link
          href="/catalog"
          className="mt-2 rounded-full bg-[#3D3733] px-9 py-4 text-[14px] uppercase tracking-[0.1em] text-[#F8F4EC] transition hover:bg-[#C98A8E] hover:text-white"
        >
          Start a subscription
        </Link>
      </div>
    </section>
  );
}

/* =========================== FOOTER =========================== */

function LandingFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-[#E3D9C9] px-6 py-10 sm:px-12">
      <div className="font-serif text-[21px] font-semibold">
        Bloom
        <span className="italic" style={{ color: ACCENT }}>
          Sense
        </span>
      </div>
      <div className="flex gap-7 text-[13px] uppercase tracking-[0.1em] text-[#6B5F55]">
        <a href="/#arrangements" className="transition hover:text-[#C98A8E]">
          Arrangements
        </a>
        <a href="/#craft" className="transition hover:text-[#C98A8E]">
          Our craft
        </a>
        <a href="/#visit" className="transition hover:text-[#C98A8E]">
          Visit
        </a>
      </div>
      <div className="text-[13px] text-[#9A8D7E]">
        © 2026 BloomSense Atelier
      </div>
    </footer>
  );
}
