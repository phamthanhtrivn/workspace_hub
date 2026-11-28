"use client";

import { RevealMotion, type RevealMotionProps } from "./reveal-motion";
import type { LandingMotionDirection } from "./motion-config";

const ORIGIN_DIRECTIONS = {
  left: "left",
  right: "right",
  top: "down",
  bottom: "up",
} as const satisfies Record<string, LandingMotionDirection>;

export type SlideInOrigin = keyof typeof ORIGIN_DIRECTIONS;

export interface SlideInProps extends Omit<RevealMotionProps, "direction" | "effect"> {
  from: SlideInOrigin;
}

export function SlideIn({ from, preset = "slide", ...props }: SlideInProps) {
  return <RevealMotion {...props} preset={preset} effect="slide" direction={ORIGIN_DIRECTIONS[from]} />;
}
