"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductImageProps {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
}

const PLACEHOLDER_GRADIENTS = [
  "from-bloom-rose/30 via-bloom-cream to-bloom-gold/30",
  "from-bloom-sage/30 via-bloom-cream to-bloom-rose/25",
  "from-bloom-gold/30 via-bloom-cream to-bloom-sage/30",
  "from-bloom-primary/20 via-bloom-cream to-bloom-gold/25",
];

/**
 * Product image with a branded placeholder fallback: seed data references
 * /images/products/*.jpg which may not exist locally, so a missing file
 * renders as a deliberate gradient tile instead of a broken image.
 */
export function ProductImage({ src, alt, sizes, priority }: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const gradient =
      PLACEHOLDER_GRADIENTS[
        Math.abs(hashCode(alt)) % PLACEHOLDER_GRADIENTS.length
      ];
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
      >
        <span aria-hidden className="font-serif text-5xl text-bloom-primary/40">
          ✿
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
      priority={priority}
      className="object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
