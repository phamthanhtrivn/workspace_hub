"use client";

import type { ReactNode } from "react";
import { FadeIn, FadeInStagger } from "./fade-in";
import { SlideIn } from "./slide-in";

interface LandingHeroMotionProps {
  heading: ReactNode;
  description: ReactNode;
  actions: ReactNode;
}

export function LandingHeroMotion({ heading, description, actions }: LandingHeroMotionProps) {
  return (
    <FadeInStagger>
      <SlideIn from="top" preset="hero">{heading}</SlideIn>
      <FadeIn preset="hero">{description}</FadeIn>
      <SlideIn from="bottom" preset="hero">{actions}</SlideIn>
    </FadeInStagger>
  );
}
