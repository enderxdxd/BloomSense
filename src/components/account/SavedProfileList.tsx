"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface SavedProfileSummary {
  id: string;
  title: string;
  occasion: string;
  flowerTypes: string[];
  palette: string[];
  arrangement: string;
  moodBoardUrl: string | null;
  createdAt: string;
}

export function SavedProfileList({
  profiles,
  limit,
}: {
  profiles: SavedProfileSummary[];
  limit: number;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete the saved quiz “${title}”? This frees one of your ${limit} slots.`)) {
      return;
    }
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/account/profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? `Delete failed (${res.status}).`);
    } else {
      router.refresh();
    }
    setBusyId(null);
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-bloom-gold/30 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-bloom-rose">
          No saved quizzes yet.{" "}
          <Link href="/quiz" className="underline underline-offset-2">
            Take the quiz
          </Link>{" "}
          — results are saved here automatically (up to {limit}).
        </p>
      </div>
    );
  }

  return (
    <div>
      {error !== "" && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <li
            key={profile.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-bloom-gold/30 bg-white shadow-sm"
          >
            <Link
              href={`/account/profiles/${profile.id}`}
              className="group block"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-bloom-cream via-bloom-cream to-bloom-gold/15">
                {profile.moodBoardUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.moodBoardUrl}
                    alt=""
                    className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span aria-hidden className="font-serif text-4xl text-bloom-gold/50">
                      ✿
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-bloom-sage">
                  {profile.occasion} · {profile.arrangement.replace(/-/g, " ")}
                </p>
                <h3 className="mt-1 font-serif text-lg font-semibold text-bloom-primary group-hover:text-bloom-rose">
                  {profile.title}
                </h3>
                <p className="mt-1 truncate text-xs text-bloom-rose">
                  {profile.flowerTypes.slice(0, 3).join(" · ")}
                </p>
              </div>
            </Link>
            <div className="mt-auto flex items-center justify-between border-t border-bloom-cream px-4 py-2.5">
              <span className="text-[11px] text-bloom-rose">
                {new Date(profile.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                onClick={() => void remove(profile.id, profile.title)}
                disabled={busyId === profile.id}
                className="text-xs text-bloom-rose underline-offset-2 hover:underline disabled:opacity-50"
              >
                {busyId === profile.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
