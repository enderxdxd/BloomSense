"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { FloralProfileCard } from "@/components/FloralProfileCard";
import { FloralProfileSkeleton } from "@/components/FloralProfileSkeleton";
import { QuizForm } from "@/components/QuizForm";
import type { FloralProfile } from "@/lib/schema";

type HeroStatus = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [profile, setProfile] = useState<FloralProfile | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [heroStatus, setHeroStatus] = useState<HeroStatus>("idle");

  useEffect(() => {
    if (profile === null) return;

    let cancelled = false;
    setHeroStatus("loading");
    setHeroUrl(null);

    void (async () => {
      try {
        const res = await fetch("/api/profile/hero", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signatureFlower: profile.signatureFlower,
            arrangementStyle: profile.recommendedArrangementStyle,
            colorPalette: profile.colorPalette,
          }),
        });
        if (!res.ok) throw new Error(`Hero failed: ${res.status}`);
        const data = (await res.json()) as { url: string };
        if (cancelled) return;
        setHeroUrl(data.url);
        setHeroStatus("success");
      } catch (err) {
        if (cancelled) return;
        console.error("Hero image generation failed:", err);
        setHeroStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile]);

  function handleRetry() {
    setError("");
  }

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center sm:mb-14">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            BloomSense
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-bloom-primary sm:text-6xl">
            Your floral profile, curated by AI
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-bloom-rose sm:text-base">
            Answer four quick questions and we&apos;ll craft an editorial mood
            board: signature bloom, palette, styling notes, and a hero image
            painted for your occasion.
          </p>
        </header>

        <div className="mx-auto max-w-2xl">
          <QuizForm
            onProfileGenerated={(p) => {
              setProfile(p);
              setError("");
            }}
            onError={setError}
            onLoadingChange={setLoading}
          />
        </div>

        {loading && <FloralProfileSkeleton />}

        {!loading && error !== "" && (
          <div className="mx-auto max-w-2xl">
            <ErrorState message={error} onRetry={handleRetry} />
          </div>
        )}

        {!loading && profile !== null && error === "" && (
          <FloralProfileCard
            profile={profile}
            heroImageUrl={heroUrl}
            heroImageStatus={heroStatus}
          />
        )}
      </div>
    </main>
  );
}
