"use client";

import { motion } from "framer-motion";
import type { FloralProfile } from "@/lib/schema";

interface FloralProfileCardProps {
  profile: FloralProfile;
}

export function FloralProfileCard({ profile }: FloralProfileCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-10 overflow-hidden rounded-2xl border border-bloom-sage/40 bg-white shadow-sm"
    >
      <header className="border-b border-bloom-cream bg-gradient-to-br from-bloom-cream to-white p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-bloom-sage">
          {profile.recommendedArrangementStyle.replace(/-/g, " ")}
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold text-bloom-primary sm:text-4xl">
          {profile.profileName}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-bloom-rose sm:text-base">
          {profile.description}
        </p>
      </header>

      <dl className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
        <section>
          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bloom-sage">
            Dominant flowers
          </dt>
          <dd className="mt-3 flex flex-wrap gap-2">
            {profile.dominantFlowers.map((flower) => (
              <span
                key={flower}
                className="rounded-full border border-bloom-gold/40 bg-bloom-cream px-3 py-1 text-xs font-medium text-bloom-primary"
              >
                {flower}
              </span>
            ))}
          </dd>
        </section>

        <section>
          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bloom-sage">
            Color palette
          </dt>
          <dd className="mt-3 flex flex-wrap gap-3">
            {profile.colorPalette.map((color) => (
              <div key={color} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-6 w-6 rounded-full border border-bloom-rose/30 shadow-inner"
                  style={{ backgroundColor: cssColor(color) }}
                />
                <span className="text-xs text-bloom-primary">{color}</span>
              </div>
            ))}
          </dd>
        </section>

        <section className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bloom-sage">
            Mood
          </dt>
          <dd className="mt-3 flex flex-wrap gap-2">
            {profile.moodKeywords.map((word) => (
              <span
                key={word}
                className="rounded-full bg-bloom-gold/25 px-3 py-1 text-xs font-medium uppercase tracking-wide text-bloom-primary"
              >
                {word}
              </span>
            ))}
          </dd>
        </section>
      </dl>
    </motion.article>
  );
}

function cssColor(value: string): string {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed;
  return trimmed.toLowerCase();
}
