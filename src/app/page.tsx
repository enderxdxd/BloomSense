import type { Metadata } from "next";
import { LandingV2, type LandingProduct } from "@/components/landing/LandingV2";
import { listProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "BloomSense — Boutique Florist",
  description:
    "Arrangements grown, gathered and tied by hand in our atelier — delivered the morning they bloom.",
};

export const dynamic = "force-dynamic";

/** Handoff's static trio — used when the database is unreachable so the
 * landing never 500s over a paused Supabase project. */
const FALLBACK_PRODUCTS: LandingProduct[] = [
  {
    name: "The Dawn Garden",
    price: "$85",
    desc: "Garden roses, white tulips and sage foliage. Our signature.",
    slug: null,
    imageUrl: null,
  },
  {
    name: "Lavender Hour",
    price: "$68",
    desc: "Dried lavender, cream ranunculus and gypsophila.",
    slug: null,
    imageUrl: null,
  },
  {
    name: "Ivory & Ash",
    price: "$95",
    desc: "All-white arrangement with eucalyptus and silk ribbon.",
    slug: null,
    imageUrl: null,
  },
];

async function getFeaturedProducts(): Promise<LandingProduct[]> {
  try {
    const products = await listProducts({ sort: "newest" });
    const featured = products.filter((p) => p.stock > 0).slice(0, 3);
    if (featured.length < 3) return FALLBACK_PRODUCTS;
    return featured.map((p) => ({
      name: p.name,
      price: `$${Math.round(p.price)}`,
      desc:
        p.description.length > 90
          ? `${p.description.slice(0, 87).trimEnd()}…`
          : p.description,
      slug: p.slug,
      imageUrl: p.imageUrl,
    }));
  } catch (err) {
    console.error("[landing] catalog unavailable, using fallback set:", err);
    return FALLBACK_PRODUCTS;
  }
}

export default async function LandingPage() {
  const products = await getFeaturedProducts();
  return <LandingV2 products={products} />;
}
