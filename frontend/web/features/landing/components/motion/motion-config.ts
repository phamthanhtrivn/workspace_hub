import type { CSSProperties } from "react";

export const LANDING_MOTION = {
  ease: [0.42, 0, 0.58, 1] as const,
  stagger: 0.18,
  maxStaggerDelay: 0.36,
  faqStagger: 0.12,
  slideOpacityDuration: 0.3,
  feedbackDuration: 0.15,
  accordionDuration: 0.3,
  mobileDuration: 0.7,
  mobileDistance: 14,
  viewportAmount: 0.2,
  mobileViewportAmount: 0.1,
  viewportMargin: "0px 0px -48px 0px",
  mobileViewportMargin: "0px 0px -16px 0px",
  mobileQuery: "(max-width: 767px)",
  reducedMotionQuery: "(prefers-reduced-motion: reduce)",
} as const;

export const LANDING_MOTION_PRESETS = {
  reveal: { duration: 1, distance: 0 },
  slide: { duration: 1, distance: 48 },
  hero: { duration: 1, distance: 32 },
  preview: { duration: 1, distance: 48 },
  workflow: { duration: 0.9, distance: 40 },
  faq: { duration: 0.9, distance: 32 },
  tab: { duration: 0.4, distance: 24 },
  cta: { duration: 0.9, distance: 32 },
} as const;

export type LandingMotionPreset = keyof typeof LANDING_MOTION_PRESETS;
export type LandingMotionTrigger = "mount" | "in-view";
export type LandingMotionDirection = "up" | "down" | "left" | "right" | "none";

export const LANDING_MOTION_STYLE = {
  "--landing-feedback-duration": `${LANDING_MOTION.feedbackDuration}s`,
  "--landing-accordion-duration": `${LANDING_MOTION.accordionDuration}s`,
  "--landing-motion-ease": `cubic-bezier(${LANDING_MOTION.ease.join(",")})`,
} as CSSProperties;
