"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { FloralProfileCard } from "@/components/FloralProfileCard";
import { FloralProfileSkeleton } from "@/components/FloralProfileSkeleton";
import { MoodBoard } from "@/components/MoodBoard";
import { QuizForm } from "@/components/QuizForm";
import { ProductCard } from "@/components/shop/ProductCard";
import type {
  FloralProfile,
  QuizInput,
  RecommendedProduct,
} from "@/lib/schema";

type ImageStatus = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [profile, setProfile] = useState<FloralProfile | null>(null);
  const [occasion, setOccasion] = useState<QuizInput["occasion"] | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>(
    [],
  );
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [heroStatus, setHeroStatus] = useState<ImageStatus>("idle");

  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const [sceneStatus, setSceneStatus] = useState<ImageStatus>("idle");

  useEffect(() => {
    if (profile === null || occasion === null) return;

    let cancelled = false;
    setHeroStatus("loading");
    setHeroUrl(null);
    setSceneStatus("loading");
    setSceneUrl(null);

    const heroPromise = fetch("/api/profile/hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signatureFlower: profile.signatureFlower,
        arrangementStyle: profile.recommendedArrangementStyle,
        colorPalette: profile.colorPalette,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Hero failed: ${res.status}`);
        return (await res.json()) as { url: string };
      })
      .then((data) => {
        if (cancelled) return;
        setHeroUrl(data.url);
        setHeroStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Hero image generation failed:", err);
        setHeroStatus("error");
      });

    const scenePromise = fetch("/api/profile/scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occasion,
        signatureFlower: profile.signatureFlower,
        dominantFlowers: profile.dominantFlowers,
        arrangementStyle: profile.recommendedArrangementStyle,
        colorPalette: profile.colorPalette,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Scene failed: ${res.status}`);
        return (await res.json()) as { url: string };
      })
      .then((data) => {
        if (cancelled) return;
        setSceneUrl(data.url);
        setSceneStatus("success");
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Scene image generation failed:", err);
        setSceneStatus("error");
      });

    void Promise.allSettled([heroPromise, scenePromise]);

    return () => {
      cancelled = true;
    };
  }, [profile, occasion]);

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
            onProfileGenerated={(p, submittedOccasion, recs) => {
              setProfile(p);
              setOccasion(submittedOccasion);
              setRecommendations(recs);
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
          <>
            <FloralProfileCard
              profile={profile}
              heroImageUrl={heroUrl}
              heroImageStatus={heroStatus}
              sceneImageUrl={sceneUrl}
              sceneImageStatus={sceneStatus}
              occasion={occasion}
            />

            {recommendations.length > 0 && (
              <section aria-labelledby="matched-heading" className="mt-14">
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
                  Matched for you
                </p>
                <h2
                  id="matched-heading"
                  className="mt-2 font-serif text-3xl font-semibold text-bloom-primary"
                >
                  Arrangements that fit your profile
                </h2>
                <p className="mt-2 max-w-xl text-sm text-bloom-rose">
                  Picked from our live catalog — each with why it suits{" "}
                  <span className="italic">{profile.profileName}</span>.
                </p>
                <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {recommendations.map((rec) => (
                    <li key={rec.id}>
                      <ProductCard product={rec} matchReason={rec.reason} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <MoodBoard />
          </>
        )}
      </div>
    </main>
  );
}
