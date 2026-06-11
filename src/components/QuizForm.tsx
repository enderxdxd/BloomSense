"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cake, Calendar, Heart, Sparkles, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { FloralProfile, QuizInput } from "@/lib/schema";
import { QuizInputSchema } from "@/lib/schema";

interface QuizFormProps {
  onProfileGenerated: (
    profile: FloralProfile,
    occasion: QuizInput["occasion"],
  ) => void;
  onError: (message: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

type OccasionOption = QuizInput["occasion"];

const OCCASION_OPTIONS: ReadonlyArray<{
  value: OccasionOption;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: "wedding",
    label: "Wedding",
    description: "Vows, ceremonies, and the big day.",
    icon: Heart,
  },
  {
    value: "anniversary",
    label: "Anniversary",
    description: "Marking a milestone together.",
    icon: Calendar,
  },
  {
    value: "birthday",
    label: "Birthday",
    description: "A bright celebration just for them.",
    icon: Cake,
  },
  {
    value: "just-because",
    label: "Just because",
    description: "No occasion needed — flowers as a gesture.",
    icon: Sparkles,
  },
];

const STYLE_OPTIONS = [
  "rustic",
  "modern",
  "classic",
  "bohemian",
  "romantic",
  "minimalist",
] as const;

const COLOR_OPTIONS = [
  "blush",
  "ivory",
  "sage",
  "burgundy",
  "coral",
  "lavender",
  "gold",
  "white",
] as const;

interface DraftAnswers {
  occasion: OccasionOption | null;
  vibe: string[];
  preferredColors: string[];
  budgetUSD: string;
  recipientRelationship: string;
  notes: string;
}

const EMPTY_DRAFT: DraftAnswers = {
  occasion: null,
  vibe: [],
  preferredColors: [],
  budgetUSD: "",
  recipientRelationship: "",
  notes: "",
};

const STEP_TITLES = [
  "What's the occasion?",
  "Pick the vibe",
  "Choose your colors",
  "Budget & recipient",
] as const;

export function QuizForm({
  onProfileGenerated,
  onError,
  onLoadingChange,
}: QuizFormProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftAnswers>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = STEP_TITLES.length;
  const canAdvance = isStepValid(step, draft);

  function toggleArrayValue<T extends string>(
    field: "vibe" | "preferredColors",
    value: T,
    limit: number,
  ) {
    setDraft((prev) => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v) => v !== value) };
      }
      if (current.length >= limit) return prev;
      return { ...prev, [field]: [...current, value] };
    });
  }

  async function handleSubmit() {
    if (submitting) return;

    const parseResult = QuizInputSchema.safeParse({
      occasion: draft.occasion,
      vibe: draft.vibe,
      preferredColors:
        draft.preferredColors.length > 0 ? draft.preferredColors : undefined,
      budgetUSD: Number(draft.budgetUSD),
      recipientRelationship: draft.recipientRelationship,
      notes: draft.notes.trim() === "" ? undefined : draft.notes,
    });

    if (!parseResult.success) {
      onError("Please fill in every step before submitting.");
      return;
    }

    setSubmitting(true);
    onLoadingChange(true);
    onError("");

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parseResult.data),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `Request failed with ${res.status}`);
      }

      const { profile } = (await res.json()) as { profile: FloralProfile };
      onProfileGenerated(profile, parseResult.data.occasion);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
      onLoadingChange(false);
    }
  }

  return (
    <section
      aria-busy={submitting}
      className={`rounded-2xl border border-bloom-gold/40 bg-white p-6 shadow-sm transition-opacity sm:p-8 ${
        submitting ? "pointer-events-none opacity-70" : ""
      }`}
    >
      <header className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-bloom-sage">
          Step {step + 1} of {totalSteps}
        </p>
        <ol className="flex gap-1.5" aria-hidden>
          {STEP_TITLES.map((_, i) => (
            <li
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i <= step ? "bg-bloom-primary" : "bg-bloom-cream"
              }`}
            />
          ))}
        </ol>
      </header>

      <h2 className="mt-3 font-serif text-2xl font-semibold text-bloom-primary sm:text-3xl">
        {STEP_TITLES[step]}
      </h2>

      <div className="relative mt-6 min-h-[260px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {step === 0 && (
              <OccasionStep
                value={draft.occasion}
                onSelect={(occasion) =>
                  setDraft((prev) => ({ ...prev, occasion }))
                }
              />
            )}

            {step === 1 && (
              <ChipMultiSelect
                label="Choose 1–3 words that fit"
                options={[...STYLE_OPTIONS]}
                selected={draft.vibe}
                onToggle={(v) => toggleArrayValue("vibe", v, 3)}
              />
            )}

            {step === 2 && (
              <ChipMultiSelect
                label="Pick 2–4 colors you love"
                options={[...COLOR_OPTIONS]}
                selected={draft.preferredColors}
                onToggle={(v) => toggleArrayValue("preferredColors", v, 4)}
              />
            )}

            {step === 3 && (
              <BudgetStep
                draft={draft}
                onChange={(patch) =>
                  setDraft((prev) => ({ ...prev, ...patch }))
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="rounded-full border border-bloom-rose/40 px-5 py-2.5 text-sm font-medium text-bloom-rose transition hover:bg-bloom-cream disabled:invisible"
        >
          Back
        </button>

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance || submitting}
            className="rounded-full bg-bloom-primary px-6 py-2.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canAdvance || submitting}
            aria-busy={submitting}
            className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-full bg-bloom-primary px-6 py-2.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Spinner />
                <span>Crafting your profile…</span>
              </>
            ) : (
              <span>Generate my profile</span>
            )}
          </button>
        )}
      </footer>
    </section>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function isStepValid(step: number, draft: DraftAnswers): boolean {
  switch (step) {
    case 0:
      return draft.occasion !== null;
    case 1:
      return draft.vibe.length >= 1;
    case 2:
      return draft.preferredColors.length >= 2;
    case 3: {
      const budget = Number(draft.budgetUSD);
      return (
        Number.isFinite(budget) &&
        budget > 0 &&
        budget <= 10_000 &&
        draft.recipientRelationship.trim().length > 0
      );
    }
    default:
      return false;
  }
}

interface OccasionStepProps {
  value: OccasionOption | null;
  onSelect: (occasion: OccasionOption) => void;
}

function OccasionStep({ value, onSelect }: OccasionStepProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {OCCASION_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
              isSelected
                ? "border-bloom-primary bg-bloom-cream shadow-sm"
                : "border-bloom-gold/40 bg-white hover:border-bloom-rose hover:bg-bloom-cream/60"
            }`}
          >
            <span
              className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                isSelected
                  ? "bg-bloom-primary text-bloom-cream"
                  : "bg-bloom-cream text-bloom-primary"
              }`}
            >
              <Icon size={18} />
            </span>
            <span className="flex-1">
              <span className="block font-serif text-lg font-semibold text-bloom-primary">
                {option.label}
              </span>
              <span className="block text-xs text-bloom-rose">
                {option.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface ChipMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

function ChipMultiSelect({
  label,
  options,
  selected,
  onToggle,
}: ChipMultiSelectProps) {
  return (
    <div>
      <p className="text-sm text-bloom-rose">{label}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full border px-4 py-2 text-sm font-medium capitalize transition ${
                isSelected
                  ? "border-bloom-primary bg-bloom-primary text-bloom-cream"
                  : "border-bloom-gold/40 bg-white text-bloom-primary hover:border-bloom-rose hover:bg-bloom-cream"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface BudgetStepProps {
  draft: DraftAnswers;
  onChange: (patch: Partial<DraftAnswers>) => void;
}

function BudgetStep({ draft, onChange }: BudgetStepProps) {
  return (
    <div className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-bloom-rose">
          Budget (USD)
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={10000}
          value={draft.budgetUSD}
          onChange={(e) => onChange({ budgetUSD: e.target.value })}
          placeholder="150"
          className="mt-2 w-full rounded-xl border border-bloom-gold/40 bg-white px-4 py-2.5 text-bloom-primary outline-none transition focus:border-bloom-primary"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-bloom-rose">
          Recipient (who&apos;s it for?)
        </span>
        <input
          type="text"
          maxLength={50}
          value={draft.recipientRelationship}
          onChange={(e) => onChange({ recipientRelationship: e.target.value })}
          placeholder="spouse, friend, mother…"
          className="mt-2 w-full rounded-xl border border-bloom-gold/40 bg-white px-4 py-2.5 text-bloom-primary outline-none transition focus:border-bloom-primary"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-bloom-rose">
          Notes <span className="text-bloom-sage">(optional)</span>
        </span>
        <textarea
          rows={3}
          maxLength={500}
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Anything else we should know about them or the moment?"
          className="mt-2 w-full resize-none rounded-xl border border-bloom-gold/40 bg-white px-4 py-2.5 text-sm text-bloom-primary outline-none transition focus:border-bloom-primary"
        />
      </label>
    </div>
  );
}
