"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

/**
 * "Visualize my arrangement" — generates (or fetches the cached) mood
 * board for the visitor's persisted floral profile.
 */
export function MoodBoard() {
  const [status, setStatus] = useState<Status>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/moodboard/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : `Generation failed (${res.status}).`,
        );
      }
      setUrl(String(data.url));
      setCached(Boolean(data.cached));
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
      setStatus("error");
    }
  }

  return (
    <section aria-labelledby="moodboard-heading" className="mt-14">
      <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
        Mood board
      </p>
      <h2
        id="moodboard-heading"
        className="mt-2 font-serif text-3xl font-semibold text-bloom-primary"
      >
        Pin it to the wall
      </h2>
      <p className="mt-2 max-w-xl text-sm text-bloom-rose">
        A stylist&apos;s collage of your palette, textures and blooms — saved
        to your profile so it&apos;s always one click away.
      </p>

      <div className="mt-6">
        {status === "idle" && (
          <button
            type="button"
            onClick={generate}
            className="rounded-full bg-bloom-primary px-7 py-3 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose"
          >
            Visualize my arrangement
          </button>
        )}

        {status === "loading" && (
          <div className="relative mx-auto aspect-square w-full max-w-xl overflow-hidden rounded-2xl bg-gradient-to-br from-bloom-cream via-bloom-cream to-bloom-gold/15">
            <motion.div
              aria-hidden
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[10px] uppercase tracking-[0.32em] text-bloom-rose">
                Pinning your board…
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={generate}
              className="rounded-full border border-bloom-rose/40 px-5 py-2.5 text-sm text-bloom-rose transition hover:bg-bloom-cream"
            >
              Try again
            </button>
          </div>
        )}

        {status === "success" && url && (
          <figure className="mx-auto w-full max-w-xl">
            <motion.img
              src={url}
              alt="AI-generated floral mood board for your profile"
              initial={{ opacity: 0, scale: 1.03, rotate: -0.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="w-full rounded-2xl shadow-[0_24px_60px_-24px_rgba(109,46,70,0.4)]"
            />
            <figcaption className="mt-2 text-center text-xs italic text-bloom-rose">
              {cached
                ? "From your saved profile."
                : "Freshly generated and saved to your profile."}
            </figcaption>
          </figure>
        )}
      </div>
    </section>
  );
}
