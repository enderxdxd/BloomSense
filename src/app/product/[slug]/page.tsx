import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/shop/AddToCart";
import { ProductImage } from "@/components/shop/ProductImage";
import { CATEGORY_LABELS, getProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: "Product not found — BloomSense" };
  return {
    title: `${product.name} — BloomSense`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const outOfStock = product.stock <= 0;

  return (
    <main className="min-h-screen bg-bloom-cream px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-bloom-rose">
          <Link href="/catalog" className="hover:text-bloom-primary">
            Catalog
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-bloom-primary">{product.name}</span>
        </nav>

        <div className="grid gap-8 overflow-hidden rounded-3xl border border-bloom-gold/30 bg-white shadow-sm lg:grid-cols-2">
          <div className="relative aspect-[4/3] w-full bg-bloom-cream lg:aspect-auto lg:min-h-[480px]">
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>

          <div className="flex flex-col p-6 sm:p-10">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-bloom-sage">
              {CATEGORY_LABELS[product.category]}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-bloom-primary sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 font-serif text-2xl font-semibold text-bloom-primary">
              ${product.price.toFixed(2)}
            </p>

            <p className="mt-5 text-sm leading-[1.8] text-bloom-primary/85">
              {product.description}
            </p>

            <div className="mt-4">
              {outOfStock ? (
                <p className="text-sm font-medium text-bloom-rose">
                  Out of stock — check back soon.
                </p>
              ) : product.stock < 5 ? (
                <p className="text-sm font-medium text-bloom-gold">
                  Only {product.stock} left in stock.
                </p>
              ) : (
                <p className="text-sm text-bloom-sage">In stock.</p>
              )}
            </div>

            <div className="mt-8 border-t border-bloom-cream pt-8">
              <AddToCart
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: product.price,
                  imageUrl: product.imageUrl,
                  stock: product.stock,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
