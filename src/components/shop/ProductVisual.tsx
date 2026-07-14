"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { ProductImage } from "./ProductImage";

const BouquetViewer = dynamic(
  () => import("@/components/three/BouquetViewer"),
  { ssr: false, loading: () => null },
);

interface ProductVisualProps {
  src: string;
  alt: string;
  /** Featured products get the interactive 3D preview on desktop. */
  featured: boolean;
}

/**
 * Product hero visual: interactive 3D bouquet for featured products on
 * desktop with full motion; the static image everywhere else (mobile,
 * reduced motion, non-featured).
 */
export function ProductVisual({ src, alt, featured }: ProductVisualProps) {
  const reducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    setIsDesktop(query.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const show3D = featured && isDesktop && !reducedMotion;

  if (!show3D) {
    return (
      <ProductImage
        src={src}
        alt={alt}
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-bloom-cream to-white">
      <BouquetViewer />
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-bloom-rose">
        Drag to rotate · 3D preview
      </p>
    </div>
  );
}
