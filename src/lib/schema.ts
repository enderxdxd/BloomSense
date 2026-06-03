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

export const FloralProfileSchema = z.object({
  profileName: z.string().trim().min(1).max(60),
  description: z.string().trim().min(20).max(500),
  dominantFlowers: z.array(z.string().trim().min(1)).min(3).max(5),
  colorPalette: z.array(z.string().trim().min(1)).min(3).max(5),
  moodKeywords: z.array(z.string().trim().min(1)).min(3).max(5),
  recommendedArrangementStyle: z.enum(ARRANGEMENT_STYLES),
});

export type QuizInput = z.infer<typeof QuizInputSchema>;
export type FloralProfile = z.infer<typeof FloralProfileSchema>;
