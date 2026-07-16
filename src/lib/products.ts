import { prisma } from "@/lib/prisma";
import { Prisma } from "../../generated/prisma/client";
import { Category } from "../../generated/prisma/enums";
import {
  CATEGORY_LABELS,
  isSortOption,
  SORT_OPTIONS,
  type SortOption,
} from "@/lib/catalog-shared";

export { CATEGORY_LABELS, SORT_OPTIONS, isSortOption };
export type { SortOption };

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

export interface CatalogQuery {
  category?: Category;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
}

export function isCategory(value: string): value is Category {
  return value in CATEGORY_LABELS;
}

export async function listProducts(
  query: CatalogQuery = {},
): Promise<CatalogProduct[]> {
  const { category, minPrice, maxPrice, sort } = query;

  const products = await withCatalogFallback("listProducts", () =>
    prisma.product.findMany({
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
    }),
    [],
  );

  return products.map(serializeProduct);
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  const product = await withCatalogFallback(
    "getProductBySlug",
    () => prisma.product.findUnique({ where: { slug } }),
    null,
  );
  if (!product || !product.active) return null;
  return serializeProduct(product);
}

/** Compact catalog snapshot for RAG prompting (active, in-stock only). */
export async function listInStockForPrompt(): Promise<
  Array<{ id: string; name: string; category: Category; price: number; description: string }>
> {
  const products = await withCatalogFallback("listInStockForPrompt", () =>
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        description: true,
      },
    }),
    [],
  );
  return products.map((p) => ({ ...p, price: Number(p.price) }));
}

export async function getProductsByIds(
  ids: string[],
): Promise<CatalogProduct[]> {
  if (ids.length === 0) return [];
  const products = await withCatalogFallback("getProductsByIds", () =>
    prisma.product.findMany({
      where: { id: { in: ids }, active: true },
    }),
    [],
  );
  return products.map(serializeProduct);
}

async function withCatalogFallback<T>(
  operation: string,
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[products] Database unavailable during ${operation}: ${message}`,
    );
    return fallback;
  }
}

function isDatabaseUnavailable(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001")
  ) {
    return true;
  }

  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();

  return [
    "can't reach database server",
    "connection terminated",
    "econnrefused",
    "enetunreach",
    "enotfound",
    "etimedout",
    "timeout",
  ].some((signal) => message.includes(signal));
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
