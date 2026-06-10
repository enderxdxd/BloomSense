"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { FloralProfileCard } from "@/components/FloralProfileCard";
import { FloralProfileSkeleton } from "@/components/FloralProfileSkeleton";
import { QuizForm } from "@/components/QuizForm";
import type { FloralProfile } from "@/lib/schema";

export default function HomePage() {
  const [profile, setProfile] = useState<FloralProfile | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  function handleRetry() {
    setError("");
  }

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 text-center sm:mb-12">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            BloomSense
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-bloom-primary sm:text-5xl">
            Your floral profile, curated by AI
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-bloom-rose sm:text-base">
            Answer four quick questions and we&apos;ll generate a personalized mood
            board of flowers, palette, and arrangement style.
          </p>
        </header>

        <QuizForm
          onProfileGenerated={(p) => {
            setProfile(p);
            setError("");
          }}
          onError={setError}
          onLoadingChange={setLoading}
        />

        {loading && <FloralProfileSkeleton />}

        {!loading && error !== "" && (
          <ErrorState message={error} onRetry={handleRetry} />
        )}

        {!loading && profile !== null && error === "" && (
          <FloralProfileCard profile={profile} />
        )}
      </div>
    </main>
  );
}
