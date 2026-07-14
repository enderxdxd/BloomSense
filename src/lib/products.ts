import { prisma } from "@/lib/prisma";
import { Category } from "../../generated/prisma/enums";

/** Product shape safe to pass to client components (Decimal → number). */
export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  category: Category;
  imageUrl: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  BOUQUET: "Bouquets",
  ARRANGEMENT: "Arrangements",
  SINGLE_STEM: "Single stems",
  WEDDING_PACKAGE: "Wedding packages",
};

export const SORT_OPTIONS = ["newest", "price-asc", "price-desc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export interface CatalogQuery {
  category?: Category;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
}

export function isCategory(value: string): value is Category {
  return value in CATEGORY_LABELS;
}

export function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value);
}

export async function listProducts(
  query: CatalogQuery = {},
): Promise<CatalogProduct[]> {
  const { category, minPrice, maxPrice, sort } = query;

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(category ? { category } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),
    },
    orderBy:
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
          ? { price: "desc" }
          : { createdAt: "desc" },
  });

  return products.map(serializeProduct);
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || !product.active) return null;
  return serializeProduct(product);
}

/** Compact catalog snapshot for RAG prompting (active, in-stock only). */
export async function listInStockForPrompt(): Promise<
  Array<{ id: string; name: string; category: Category; price: number; description: string }>
> {
  const products = await prisma.product.findMany({
    where: { active: true, stock: { gt: 0 } },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      description: true,
    },
  });
  return products.map((p) => ({ ...p, price: Number(p.price) }));
}

export async function getProductsByIds(
  ids: string[],
): Promise<CatalogProduct[]> {
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, active: true },
  });
  return products.map(serializeProduct);
}

function serializeProduct(product: {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: unknown;
  stock: number;
  category: Category;
  imageUrl: string;
}): CatalogProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    stock: product.stock,
    category: product.category,
    imageUrl: product.imageUrl,
  };
}
