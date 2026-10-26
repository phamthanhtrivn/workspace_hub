"use client";

import { Children, createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { m, useAnimationControls, useInView } from "framer-motion";
import { useLandingMotionPreferences } from "./landing-motion-provider";
import {
  LANDING_MOTION, LANDING_MOTION_PRESETS,
  type LandingMotionDirection, type LandingMotionPreset, type LandingMotionTrigger,
} from "./motion-config";

interface StaggerSettings {
  delay: number;
  trigger: LandingMotionTrigger;
}

const StaggerContext = createContext<StaggerSettings | null>(null);
const VISIBLE = { opacity: 1, x: 0, y: 0 };

function isNavigationTarget(element: HTMLElement) {
  const anchor = document.getElementById(window.location.hash.slice(1));
  return element.contains(document.activeElement)
    || Boolean(anchor && element.contains(anchor));
}

export interface RevealMotionProps {
  children: ReactNode;
  className?: string;
  preset?: LandingMotionPreset;
  direction?: LandingMotionDirection;
  effect?: "fade" | "slide";
  distance?: number;
  duration?: number;
  delay?: number;
  trigger?: LandingMotionTrigger;
  once?: boolean;
}

export function RevealMotion({
  children, className, preset = "reveal", direction = "none", effect = "fade",
  distance, duration, delay, trigger, once = true,
}: RevealMotionProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasPlayed = useRef(false);
  const controls = useAnimationControls();
  const group = useContext(StaggerContext);
  const { ready, mobile, reducedMotion } = useLandingMotionPreferences();
  const inView = useInView(elementRef, {
    once,
    amount: mobile ? LANDING_MOTION.mobileViewportAmount : LANDING_MOTION.viewportAmount,
    margin: mobile ? LANDING_MOTION.mobileViewportMargin : LANDING_MOTION.viewportMargin,
  });
  const resolvedTrigger = trigger ?? group?.trigger ?? "in-view";
  const shouldPlay = resolvedTrigger === "mount" || inView;
  const resolvedDelay = delay ?? group?.delay ?? 0;
  const presetOptions = LANDING_MOTION_PRESETS[preset];
  const resolvedDuration = Math.min(duration ?? presetOptions.duration, mobile ? LANDING_MOTION.mobileDuration : Infinity);
  const opacityDuration = effect === "slide" ? Math.min(resolvedDuration, LANDING_MOTION.slideOpacityDuration) : resolvedDuration;
  const resolvedDistance = Math.min(distance ?? presetOptions.distance, mobile ? LANDING_MOTION.mobileDistance : Infinity);
  const xOffset = direction === "left" ? -resolvedDistance : direction === "right" ? resolvedDistance : 0;
  const yOffset = direction === "up" ? resolvedDistance : direction === "down" ? -resolvedDistance : 0;

  useEffect(() => {
    if (!ready) return;
    const element = elementRef.current;
    if (!element) return;
    const navigationTarget = isNavigationTarget(element);
    if (reducedMotion || resolvedDuration <= 0 || (once && hasPlayed.current) || navigationTarget) {
      controls.set(VISIBLE);
      if (shouldPlay || navigationTarget) hasPlayed.current = true;
      return;
    }

    // SSR remains readable; once hydrated, each group waits for its own viewport entry.
    controls.set({ opacity: 0, x: xOffset, y: yOffset });
    if (!shouldPlay) {
      if (!once) hasPlayed.current = false;
      return;
    }

    // Defer until the next frame so Strict Mode's setup/cleanup does not consume the entrance.
    const frame = window.requestAnimationFrame(() => {
      hasPlayed.current = true;
      const bounds = element.getBoundingClientRect();
      if (isNavigationTarget(element) || bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
        controls.set(VISIBLE);
        return;
      }

      void controls.start({
        opacity: [0, 1], x: [xOffset, 0], y: [yOffset, 0],
        transition: {
          duration: resolvedDuration, delay: resolvedDelay, ease: LANDING_MOTION.ease,
          opacity: { duration: opacityDuration, delay: resolvedDelay, ease: LANDING_MOTION.ease },
        },
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
      controls.stop();
    };
  }, [controls, once, opacityDuration, ready, reducedMotion, resolvedDelay, resolvedDuration, shouldPlay, xOffset, yOffset]);

  return (
    <m.div
      ref={elementRef}
      className={className}
      initial={false}
      animate={controls}
      onFocusCapture={() => {
        hasPlayed.current = true;
        controls.stop();
        controls.set(VISIBLE);
      }}
    >
      {children}
    </m.div>
  );
}

export interface RevealStaggerProps {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  trigger?: LandingMotionTrigger;
}

export function RevealStagger({
  children, stagger = LANDING_MOTION.stagger, delay = 0, trigger = "in-view",
}: RevealStaggerProps) {
  // Context-only grouping preserves the section's existing grid/flex and semantic markup.
  return Children.map(children, (child, index) => (
    <StaggerContext.Provider value={{
      delay: delay + Math.min(index * stagger, LANDING_MOTION.maxStaggerDelay), trigger,
    }}>
      {child}
    </StaggerContext.Provider>
  ));
}
