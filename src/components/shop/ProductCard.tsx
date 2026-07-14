import Link from "next/link";
import type { CatalogProduct } from "@/lib/products";
import { CATEGORY_LABELS } from "@/lib/products";
import { ProductImage } from "./ProductImage";

interface ProductCardProps {
  product: CatalogProduct;
  matchReason?: string;
}

export function ProductCard({ product, matchReason }: ProductCardProps) {
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock < 5;

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-bloom-gold/30 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-bloom-primary"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-bloom-cream">
        <ProductImage src={product.imageUrl} alt={product.name} />
        {outOfStock && (
          <span className="absolute left-3 top-3 rounded-full bg-bloom-primary/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-bloom-cream">
            Out of stock
          </span>
        )}
        {lowStock && (
          <span className="absolute left-3 top-3 rounded-full bg-bloom-gold/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-bloom-primary">
            Only {product.stock} left
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-bloom-sage">
          {CATEGORY_LABELS[product.category]}
        </p>
        <h3 className="mt-1.5 font-serif text-lg font-semibold leading-snug text-bloom-primary group-hover:text-bloom-rose">
          {product.name}
        </h3>
        {matchReason ? (
          <p className="mt-2 text-xs italic leading-relaxed text-bloom-rose">
            “{matchReason}”
          </p>
        ) : (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-bloom-primary/70">
            {product.description}
          </p>
        )}
        <p className="mt-auto pt-4 font-serif text-xl font-semibold text-bloom-primary">
          ${product.price.toFixed(2)}
        </p>
      </div>
    </Link>
  );
}
