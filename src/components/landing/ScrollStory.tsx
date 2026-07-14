"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

const STORY = [
  {
    eyebrow: "The problem",
    title: "Choosing flowers is guesswork",
    body: "Marco wants to mark ten years with his wife. The shop offers him 'roses or something seasonal'. Nothing about it says her. Most floral gifts fail quietly like this — right gesture, wrong flowers.",
    accent: "✿",
  },
  {
    eyebrow: "The idea",
    title: "BloomSense reads the moment",
    body: "Four questions about the occasion, the person, and the feeling. Our AI stylist turns them into a floral profile — signature bloom, palette, arrangement style — written like a page from a magazine, not a form result.",
    accent: "❀",
  },
  {
    eyebrow: "The craft",
    title: "From profile to doorstep",
    body: "The profile is matched against our florists' live catalog — real stems, real stock. Preview the arrangement in your space, check out securely, and follow every order from confirmation to delivery.",
    accent: "✾",
  },
] as const;

export function ScrollStory() {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".story-section").forEach((section) => {
        gsap.fromTo(
          section.querySelectorAll(".story-reveal"),
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.12,
            scrollTrigger: { trigger: section, start: "top 72%" },
          },
        );
        const accent = section.querySelector(".story-accent");
        if (accent) {
          gsap.fromTo(
            accent,
            { yPercent: 18, rotate: -8 },
            {
              yPercent: -18,
              rotate: 8,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        }
      });
    }, rootRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div ref={rootRef}>
      {STORY.map((chapter, i) => (
        <section
          key={chapter.eyebrow}
          className={`story-section relative overflow-hidden px-4 py-24 sm:py-32 ${
            i % 2 === 1 ? "bg-bloom-cream" : "bg-white"
          }`}
        >
          <span
            aria-hidden
            className={`story-accent pointer-events-none absolute font-serif text-[180px] leading-none text-bloom-rose/10 sm:text-[280px] ${
              i % 2 === 1 ? "-right-8 top-8" : "-left-8 bottom-8"
            }`}
          >
            {chapter.accent}
          </span>

          <div
            className={`mx-auto flex max-w-5xl flex-col gap-2 ${
              i % 2 === 1 ? "items-end text-right" : "items-start"
            }`}
          >
            <p className="story-reveal text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
              {chapter.eyebrow}
            </p>
            <h2 className="story-reveal max-w-xl font-serif text-4xl font-semibold leading-tight text-bloom-primary sm:text-5xl">
              {chapter.title}
            </h2>
            <p className="story-reveal mt-3 max-w-lg text-sm leading-[1.9] text-bloom-primary/80 sm:text-base">
              {chapter.body}
            </p>
          </div>
        </section>
      ))}

      <section className="story-section bg-bloom-primary px-4 py-24 text-center sm:py-28">
        <p className="story-reveal text-xs font-medium uppercase tracking-[0.32em] text-bloom-gold">
          Two minutes, start to profile
        </p>
        <h2 className="story-reveal mx-auto mt-3 max-w-2xl font-serif text-4xl font-semibold text-bloom-cream sm:text-5xl">
          Let the flowers say it properly
        </h2>
        <div className="story-reveal mt-8">
          <Link
            href="/quiz"
            className="inline-block rounded-full bg-bloom-cream px-9 py-4 text-sm font-medium text-bloom-primary transition hover:bg-bloom-gold"
          >
            Take the quiz
          </Link>
        </div>
      </section>
    </div>
  );
}
