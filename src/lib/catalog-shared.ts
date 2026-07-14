/**
 * Catalog types/constants safe to import from client components.
 * Server-side queries live in lib/products.ts (which imports Prisma and
 * must never reach the client bundle).
 */

export const CATEGORY_LABELS: Record<string, string> = {
  BOUQUET: "Bouquets",
  ARRANGEMENT: "Arrangements",
  SINGLE_STEM: "Single stems",
  WEDDING_PACKAGE: "Wedding packages",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export const SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value);
}

/** Product shape passed to presentational components. */
export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  description?: string;
}
