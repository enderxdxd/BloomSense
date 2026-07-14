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

export const PRODUCT_CATEGORIES = [
  "BOUQUET",
  "ARRANGEMENT",
  "SINGLE_STEM",
  "WEDDING_PACKAGE",
] as const;

const ProductFields = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case letters/digits only"),
  description: z.string().trim().min(10).max(2000),
  price: z.number().positive().max(100_000),
  stock: z.number().int().min(0).max(100_000),
  category: z.enum(PRODUCT_CATEGORIES),
  imageUrl: z.string().trim().min(1).max(500),
  active: z.boolean(),
});

export const ProductCreateSchema = ProductFields.extend({
  active: z.boolean().optional().default(true),
});

// Built from the default-free field set: a defaulted `active` in .partial()
// would silently inject active:true into every stock/price PATCH and
// reactivate soft-deleted products.
export const ProductUpdateSchema = ProductFields.partial().refine(
  (patch) => Object.keys(patch).length > 0,
  { message: "At least one field must be provided" },
);

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const OrderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const OrderCreateSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1).max(60),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
});

export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type QuizInput = z.infer<typeof QuizInputSchema>;
export type FloralProfile = z.infer<typeof FloralProfileSchema>;
export type AIQuizResponse = z.infer<typeof AIQuizResponseSchema>;
export type HeroImageRequest = z.infer<typeof HeroImageRequestSchema>;
export type SceneImageRequest = z.infer<typeof SceneImageRequestSchema>;
