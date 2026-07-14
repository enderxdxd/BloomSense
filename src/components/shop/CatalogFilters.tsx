import Link from "next/link";
import { CATEGORY_LABELS, type CatalogQuery } from "@/lib/products";

interface CatalogFiltersProps {
  query: CatalogQuery;
}

function buildHref(query: CatalogQuery, patch: Partial<CatalogQuery>): string {
  const merged = { ...query, ...patch };
  const params = new URLSearchParams();
  if (merged.category) params.set("category", merged.category);
  if (merged.minPrice !== undefined) params.set("min", String(merged.minPrice));
  if (merged.maxPrice !== undefined) params.set("max", String(merged.maxPrice));
  if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export function CatalogFilters({ query }: CatalogFiltersProps) {
  const categories = Object.entries(CATEGORY_LABELS) as Array<
    [NonNullable<CatalogQuery["category"]>, string]
  >;

  return (
    <div className="space-y-4">
      <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
        <Link
          href={buildHref(query, { category: undefined })}
          aria-current={query.category === undefined ? "page" : undefined}
          className={chipClass(query.category === undefined)}
        >
          All
        </Link>
        {categories.map(([value, label]) => (
          <Link
            key={value}
            href={buildHref(query, { category: value })}
            aria-current={query.category === value ? "page" : undefined}
            className={chipClass(query.category === value)}
          >
            {label}
          </Link>
        ))}
      </nav>

      <form
        method="GET"
        action="/catalog"
        className="flex flex-wrap items-end gap-3"
      >
        {query.category && (
          <input type="hidden" name="category" value={query.category} />
        )}
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-bloom-sage">
            Min price
          </span>
          <input
            type="number"
            name="min"
            min={0}
            step={1}
            defaultValue={query.minPrice ?? ""}
            placeholder="0"
            className="mt-1 block w-28 rounded-lg border border-bloom-gold/40 bg-white px-3 py-2 text-sm text-bloom-primary outline-none focus:border-bloom-primary"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-bloom-sage">
            Max price
          </span>
          <input
            type="number"
            name="max"
            min={0}
            step={1}
            defaultValue={query.maxPrice ?? ""}
            placeholder="500"
            className="mt-1 block w-28 rounded-lg border border-bloom-gold/40 bg-white px-3 py-2 text-sm text-bloom-primary outline-none focus:border-bloom-primary"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-bloom-sage">
            Sort
          </span>
          <select
            name="sort"
            defaultValue={query.sort ?? "newest"}
            className="mt-1 block rounded-lg border border-bloom-gold/40 bg-white px-3 py-2 text-sm text-bloom-primary outline-none focus:border-bloom-primary"
          >
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-bloom-primary px-5 py-2.5 text-sm font-medium text-bloom-cream transition hover:bg-bloom-rose"
        >
          Apply
        </button>
      </form>
    </div>
  );
}

function chipClass(active: boolean): string {
  return `rounded-full border px-4 py-2 text-sm font-medium transition ${
    active
      ? "border-bloom-primary bg-bloom-primary text-bloom-cream"
      : "border-bloom-gold/40 bg-white text-bloom-primary hover:border-bloom-rose hover:bg-bloom-cream"
  }`;
}
