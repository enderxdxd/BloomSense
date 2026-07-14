import type { Metadata } from "next";
import { CatalogFilters } from "@/components/shop/CatalogFilters";
import { ProductCard } from "@/components/shop/ProductCard";
import {
  isCategory,
  isSortOption,
  listProducts,
  type CatalogQuery,
} from "@/lib/products";

export const metadata: Metadata = {
  title: "Catalog — BloomSense",
  description: "Browse bouquets, arrangements, stems and wedding packages.",
};

export const dynamic = "force-dynamic";

interface CatalogPageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

function parseQuery(
  searchParams: CatalogPageProps["searchParams"],
): CatalogQuery {
  const query: CatalogQuery = {};

  const category = first(searchParams.category);
  if (category && isCategory(category)) query.category = category;

  const min = toPrice(first(searchParams.min));
  if (min !== undefined) query.minPrice = min;

  const max = toPrice(first(searchParams.max));
  if (max !== undefined) query.maxPrice = max;

  const sort = first(searchParams.sort);
  if (sort && isSortOption(sort)) query.sort = sort;

  return query;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toPrice(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
    return undefined;
  }
  return parsed;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const query = parseQuery(searchParams);
  const products = await listProducts(query);

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-bloom-sage">
            BloomSense
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-bloom-primary sm:text-5xl">
            The catalog
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-bloom-rose">
            Every arrangement is prepared to order by our florists. Filter by
            occasion, style or budget.
          </p>
        </header>

        <CatalogFilters query={query} />

        {products.length === 0 ? (
          <p className="mt-16 text-center text-sm text-bloom-rose">
            No products match these filters — try widening the price range.
          </p>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
