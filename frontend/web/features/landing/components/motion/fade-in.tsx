"use client";

import { RevealMotion, type RevealMotionProps } from "./reveal-motion";

export type FadeInProps = Omit<RevealMotionProps, "direction" | "effect">;

export function FadeIn(props: FadeInProps) {
  return <RevealMotion {...props} effect="fade" direction="none" />;
}

export { RevealStagger as FadeInStagger } from "./reveal-motion";
export type { RevealStaggerProps as FadeInStaggerProps } from "./reveal-motion";
