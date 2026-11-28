"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import { LANDING_MOTION } from "./motion-config";

enum MotionPreference {
  Pending = -1,
  Desktop = 0,
  Mobile = 1,
  ReducedMotion = 2,
}

interface LandingMotionPreferences {
  ready: boolean;
  mobile: boolean;
  reducedMotion: boolean;
}

const MotionPreferencesContext = createContext<LandingMotionPreferences | null>(null);

function subscribe(onChange: () => void) {
  const queries = [LANDING_MOTION.mobileQuery, LANDING_MOTION.reducedMotionQuery]
    .map((query) => window.matchMedia(query));
  queries.forEach((query) => query.addEventListener("change", onChange));
  return () => queries.forEach((query) => query.removeEventListener("change", onChange));
}

function getSnapshot() {
  return (window.matchMedia(LANDING_MOTION.mobileQuery).matches ? MotionPreference.Mobile : MotionPreference.Desktop)
    | (window.matchMedia(LANDING_MOTION.reducedMotionQuery).matches ? MotionPreference.ReducedMotion : MotionPreference.Desktop);
}

const getServerSnapshot = () => MotionPreference.Pending;

export function LandingMotionProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const preferences = useMemo(() => ({
    ready: snapshot !== MotionPreference.Pending,
    mobile: snapshot !== MotionPreference.Pending && Boolean(snapshot & MotionPreference.Mobile),
    reducedMotion: snapshot === MotionPreference.Pending || Boolean(snapshot & MotionPreference.ReducedMotion),
  }), [snapshot]);

  return (
    <MotionPreferencesContext.Provider value={preferences}>
      <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </MotionPreferencesContext.Provider>
  );
}

export function useLandingMotionPreferences() {
  const preferences = useContext(MotionPreferencesContext);
  if (!preferences) throw new Error("Landing motion components require LandingMotionProvider.");
  return preferences;
}
