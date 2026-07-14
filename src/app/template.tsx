"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Route transition: a short fade/rise on every navigation. framer-motion's
 * useReducedMotion reads the media query synchronously, so reduced-motion
 * users get an instant swap instead.
 */
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }
      }
    >
      {children}
    </motion.div>
  );
}
