import { z } from "zod";

export const OCCASIONS = [
  "wedding",
  "anniversary",
  "birthday",
  "sympathy",
  "celebration",
  "just-because",
] as const;

export const ARRANGEMENT_STYLES = [
  "cascading",
  "hand-tied",
  "structured",
  "wild-garden",
  "minimalist",
] as const;

export const QuizInputSchema = z.object({
  occasion: z.enum(OCCASIONS),
  recipientRelationship: z.string().trim().min(1).max(50),
  budgetUSD: z.number().int().positive().max(10_000),
  vibe: z.array(z.string().trim().min(1)).min(1).max(5),
  preferredColors: z.array(z.string().trim().min(1)).max(5).optional(),
  notes: z.string().trim().max(500).optional(),
});

const FloralProfileBase = z.object({
  profileName: z.string().trim().min(1).max(60),
  tagline: z.string().trim().min(8).max(120),
  description: z.string().trim().min(20).max(500),
  narrative: z.string().trim().min(120).max(900),
  dominantFlowers: z.array(z.string().trim().min(1)).min(3).max(5),
  signatureFlower: z.string().trim().min(1).max(60),
  colorPalette: z.array(z.string().trim().min(1)).min(3).max(5),
  moodKeywords: z.array(z.string().trim().min(1)).min(3).max(5),
  recommendedArrangementStyle: z.enum(ARRANGEMENT_STYLES),
  stylingNotes: z.array(z.string().trim().min(10).max(220)).length(3),
});

const signatureInDominant = {
  check: (p: { dominantFlowers: string[]; signatureFlower: string }) =>
    p.dominantFlowers.includes(p.signatureFlower),
  params: {
    message: "signatureFlower must be one of dominantFlowers",
    path: ["signatureFlower"],
  },
};

export const FloralProfileSchema = FloralProfileBase.refine(
  signatureInDominant.check,
  signatureInDominant.params,
);

/**
 * Shape GPT must return when the catalog is injected into the prompt
 * (Phase 10C): the editorial profile plus product recommendations whose
 * IDs are validated against the injected catalog server-side.
 */
export const AIQuizResponseSchema = FloralProfileBase.extend({
  recommendations: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(60),
        reason: z.string().trim().min(8).max(220),
      }),
    )
    .min(3)
    .max(5),
}).refine(signatureInDominant.check, signatureInDominant.params);

/** Client-safe recommended product payload returned by /api/quiz/submit. */
export interface RecommendedProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  reason: string;
}

export const HeroImageRequestSchema = z.object({
  signatureFlower: z.string().trim().min(1).max(60),
  arrangementStyle: z.enum(ARRANGEMENT_STYLES),
  colorPalette: z.array(z.string().trim().min(1)).min(1).max(5),
  vibe: z.array(z.string().trim().min(1)).min(0).max(5).optional(),
});

export const SceneImageRequestSchema = z.object({
  occasion: z.enum(OCCASIONS),
  signatureFlower: z.string().trim().min(1).max(60),
  dominantFlowers: z.array(z.string().trim().min(1)).min(1).max(5),
  arrangementStyle: z.enum(ARRANGEMENT_STYLES),
  colorPalette: z.array(z.string().trim().min(1)).min(1).max(5),
  vibe: z.array(z.string().trim().min(1)).min(0).max(5).optional(),
});

export type QuizInput = z.infer<typeof QuizInputSchema>;
export type FloralProfile = z.infer<typeof FloralProfileSchema>;
export type AIQuizResponse = z.infer<typeof AIQuizResponseSchema>;
export type HeroImageRequest = z.infer<typeof HeroImageRequestSchema>;
export type SceneImageRequest = z.infer<typeof SceneImageRequestSchema>;
