"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Autoplay from "embla-carousel-autoplay";
import type { CarouselApi } from "@/components/ui/carousel";
import { CHAT_WELCOME_AUTOPLAY_DELAY_MS } from "../constants/chat-welcome.constants";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getServerReducedMotion = () => true;

export function useChatWelcomeCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getReducedMotion,
    getServerReducedMotion,
  );
  // Own playback here so mouse/focus events cannot undo an explicit pause.
  const [plugins] = useState(() => [Autoplay({
    delay: CHAT_WELCOME_AUTOPLAY_DELAY_MS,
    playOnInit: false,
    stopOnInteraction: true,
    stopOnFocusIn: false,
    stopOnMouseEnter: false,
  })]);

  useEffect(() => {
    const root = carouselRef.current;
    if (!api || !root) return;
    const autoplay = plugins[0];
    let hovered = root.matches(":hover");
    let focused = root.contains(document.activeElement);
    let dragging = false;

    const syncPlayback = () => {
      if (!paused && !reducedMotion && !hovered && !focused && !dragging
        && document.visibilityState === "visible" && api.rootNode().clientWidth > 0
        && api.scrollSnapList().length > 1) {
        autoplay.play();
      } else {
        autoplay.stop();
      }
    };
    const onSelect = () => {
      setSelected(api.selectedScrollSnap());
      autoplay.reset();
    };
    const onMouseEnter = () => { hovered = true; syncPlayback(); };
    const onMouseLeave = () => { hovered = false; syncPlayback(); };
    const onFocusIn = () => { focused = true; syncPlayback(); };
    const onFocusOut = (event: FocusEvent) => {
      focused = event.relatedTarget instanceof Node && root.contains(event.relatedTarget);
      syncPlayback();
    };
    const onPointerDown = () => { dragging = true; syncPlayback(); };
    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      syncPlayback();
    };

    onSelect();
    syncPlayback();
    api.on("select", onSelect).on("reInit", syncPlayback);
    root.addEventListener("mouseenter", onMouseEnter);
    root.addEventListener("mouseleave", onMouseLeave);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      autoplay.stop();
      api.off("select", onSelect).off("reInit", syncPlayback);
      root.removeEventListener("mouseenter", onMouseEnter);
      root.removeEventListener("mouseleave", onMouseLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [api, paused, plugins, reducedMotion]);

  return { api, setApi, selected, paused, setPaused, reducedMotion, carouselRef, plugins };
}
