"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/**
 * Makes every motion/react animation honour prefers-reduced-motion
 * (transform/layout animations are skipped, opacity still fades).
 * Server children pass straight through — wrapping them doesn't make them client components.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
