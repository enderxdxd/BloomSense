import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      /** Vendored design-handoff hero web component (public/vendor/bloom-hero-v2.js). */
      "bloom-hero-v2": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        accent?: string;
        motion?: string;
        dof?: string;
        particles?: string;
      };
    }
  }
}
