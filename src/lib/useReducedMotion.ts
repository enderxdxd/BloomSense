"use client";

import { useEffect, useState } from "react";

/**
 * Single source of truth for prefers-reduced-motion across Framer Motion,
 * GSAP and R3F components. Defaults to true (no motion) until the media
 * query resolves on the client, so SSR never flashes animation.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
