"use client";

import { motion } from "framer-motion";
import type { FloralProfile } from "@/lib/schema";

interface FloralProfileCardProps {
  profile: FloralProfile;
  heroImageUrl: string | null;
  heroImageStatus: "idle" | "loading" | "success" | "error";
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const sectionTransition = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

export function FloralProfileCard({
  profile,
  heroImageUrl,
  heroImageStatus,
}: FloralProfileCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="mt-12 overflow-hidden rounded-3xl border border-bloom-gold/30 bg-white shadow-[0_20px_60px_-30px_rgba(109,46,70,0.35)]"
    >
      <HeroImage
        status={heroImageStatus}
        url={heroImageUrl}
        signatureFlower={profile.signatureFlower}
      />

      <div className="px-6 pb-12 pt-10 sm:px-12 sm:pb-16 sm:pt-14">
        <motion.header
          {...fadeUp}
          transition={{ ...sectionTransition, delay: 0.05 }}
          className="border-b border-bloom-cream pb-8"
        >
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            Arrangement · {profile.recommendedArrangementStyle.replace(/-/g, " ")}
          </p>
          <h2 className="mt-4 font-serif text-4xl font-semibold leading-[1.05] text-bloom-primary sm:text-6xl">
            {profile.profileName}
          </h2>
          <p className="mt-4 font-serif text-lg italic text-bloom-rose sm:text-xl">
            {profile.tagline}
          </p>
        </motion.header>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.7fr,1fr]">
          <motion.div
            {...fadeUp}
            transition={{ ...sectionTransition, delay: 0.15 }}
            className="space-y-5"
          >
            <p className="font-serif text-xl leading-relaxed text-bloom-primary sm:text-2xl">
              {profile.description}
            </p>
            <p className="text-base leading-[1.85] text-bloom-primary/85 sm:text-[17px]">
              {profile.narrative}
            </p>
          </motion.div>

          <motion.aside
            {...fadeUp}
            transition={{ ...sectionTransition, delay: 0.25 }}
            className="space-y-8 lg:border-l lg:border-bloom-cream lg:pl-10"
          >
            <SidebarSection label="Palette">
              <ul className="space-y-2.5">
                {profile.colorPalette.map((color) => (
                  <li key={color} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="h-7 w-7 shrink-0 rounded-full border border-bloom-rose/20 shadow-inner"
                      style={{ backgroundColor: cssColor(color) }}
                    />
                    <span className="text-sm text-bloom-primary">{color}</span>
                  </li>
                ))}
              </ul>
            </SidebarSection>

            <SidebarSection label="Flowers">
              <ul className="space-y-1.5">
                {profile.dominantFlowers.map((flower) => {
                  const isSignature = flower === profile.signatureFlower;
                  return (
                    <li
                      key={flower}
                      className={`flex items-baseline gap-2 text-sm ${
                        isSignature
                          ? "font-semibold text-bloom-primary"
                          : "text-bloom-primary/80"
                      }`}
                    >
                      <span aria-hidden className="text-bloom-gold">
                        {isSignature ? "✿" : "·"}
                      </span>
                      <span>{flower}</span>
                      {isSignature && (
                        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-bloom-sage">
                          signature
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SidebarSection>

            <SidebarSection label="Mood">
              <p className="font-serif text-lg italic leading-relaxed text-bloom-rose">
                {profile.moodKeywords.join(" · ")}
              </p>
            </SidebarSection>
          </motion.aside>
        </div>

        <motion.section
          {...fadeUp}
          transition={{ ...sectionTransition, delay: 0.35 }}
          className="mt-14 border-t border-bloom-cream pt-10"
        >
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            Styling notes
          </p>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {profile.stylingNotes.map((note, i) => (
              <li key={i} className="flex gap-4">
                <span className="font-serif text-3xl font-semibold text-bloom-gold/80">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-bloom-primary/90">
                  {note}
                </p>
              </li>
            ))}
          </ol>
        </motion.section>

        <footer className="mt-12 flex items-center justify-between border-t border-bloom-cream pt-6 text-xs text-bloom-rose">
          <span className="uppercase tracking-[0.24em]">BloomSense</span>
          <span className="italic">Generated by AI · curated for you</span>
        </footer>
      </div>
    </motion.article>
  );
}

interface SidebarSectionProps {
  label: string;
  children: React.ReactNode;
}

function SidebarSection({ label, children }: SidebarSectionProps) {
  return (
    <section>
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-bloom-sage">
        {label}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

interface HeroImageProps {
  status: FloralProfileCardProps["heroImageStatus"];
  url: string | null;
  signatureFlower: string;
}

function HeroImage({ status, url, signatureFlower }: HeroImageProps) {
  if (status === "success" && url) {
    return (
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bloom-cream">
        <motion.img
          src={url}
          alt={`Editorial photograph of a ${signatureFlower} arrangement`}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bloom-primary/15 via-transparent to-transparent" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-bloom-cream via-bloom-gold/20 to-bloom-rose/15">
        <p className="text-xs uppercase tracking-[0.32em] text-bloom-rose">
          {signatureFlower}
        </p>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-bloom-cream via-bloom-cream to-bloom-gold/15">
      <motion.div
        aria-hidden
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-bloom-rose">
          Painting your {signatureFlower}…
        </p>
      </div>
    </div>
  );
}

function cssColor(value: string): string {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed;
  return trimmed.toLowerCase();
}
