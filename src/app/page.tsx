"use client";

import { useState } from "react";
import type { FloralProfile, QuizInput } from "@/lib/schema";

const HARDCODED_QUIZ: QuizInput = {
  occasion: "anniversary",
  recipientRelationship: "spouse",
  budgetUSD: 150,
  vibe: ["romantic", "timeless"],
  preferredColors: ["blush", "ivory"],
  notes: "Ten-year anniversary, intimate dinner at home.",
};

type Status = "idle" | "loading" | "success" | "error";

export default function HomePage() {
  const [status, setStatus] = useState<Status>("idle");
  const [profile, setProfile] = useState<FloralProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setStatus("loading");
    setError(null);
    setProfile(null);

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(HARDCODED_QUIZ),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `Request failed with ${res.status}`);
      }

      const data = (await res.json()) as FloralProfile;
      setProfile(data);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-bloom-cream px-6 py-16 text-bloom-primary">
      <div className="mx-auto max-w-2xl">
        <header>
          <h1 className="text-4xl font-semibold tracking-tight">BloomSense</h1>
          <p className="mt-2 text-bloom-rose">
            AI-curated floral personality preview.
          </p>
        </header>

        <section className="mt-10 rounded-2xl border border-bloom-gold/40 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-medium uppercase tracking-wide text-bloom-rose">
            Quiz answers
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-bloom-cream p-4 text-xs">
            {JSON.stringify(HARDCODED_QUIZ, null, 2)}
          </pre>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === "loading"}
            className="mt-6 inline-flex items-center rounded-full bg-bloom-primary px-6 py-3 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Generating…" : "Generate floral profile"}
          </button>
        </section>

        {status === "error" && error !== null && (
          <p
            role="alert"
            className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {status === "success" && profile !== null && (
          <article className="mt-10 rounded-2xl border border-bloom-sage/40 bg-white p-6 shadow-sm">
            <header>
              <h2 className="text-2xl font-semibold text-bloom-primary">
                {profile.profileName}
              </h2>
              <p className="mt-2 text-bloom-rose">{profile.description}</p>
            </header>

            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-bloom-sage">
                  Dominant flowers
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {profile.dominantFlowers.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-bloom-cream px-3 py-1 text-xs text-bloom-primary"
                    >
                      {f}
                    </span>
                  ))}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-bloom-sage">
                  Color palette
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {profile.colorPalette.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-bloom-cream px-3 py-1 text-xs text-bloom-primary"
                    >
                      {c}
                    </span>
                  ))}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-bloom-sage">
                  Mood
                </dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {profile.moodKeywords.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-bloom-gold/30 px-3 py-1 text-xs text-bloom-primary"
                    >
                      {m}
                    </span>
                  ))}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-bloom-sage">
                  Arrangement style
                </dt>
                <dd className="mt-2 text-sm font-medium capitalize text-bloom-primary">
                  {profile.recommendedArrangementStyle}
                </dd>
              </div>
            </dl>
          </article>
        )}
      </div>
    </main>
  );
}
