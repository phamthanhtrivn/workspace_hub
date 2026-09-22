"use client";

import { useCallback, useEffect, useState } from "react";

const PROJECT_SIDEBAR_COLLAPSED_KEY = "projectSidebarCollapsed";
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

export function useProjectSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const storedState = window.localStorage.getItem(
      PROJECT_SIDEBAR_COLLAPSED_KEY,
    );
    if (storedState === null) return;

    const frame = window.requestAnimationFrame(() => {
      setIsCollapsed(storedState === "true");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const desktopMedia = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMobileOpen(false);
    };

    desktopMedia.addEventListener("change", closeDrawerOnDesktop);
    return () =>
      desktopMedia.removeEventListener("change", closeDrawerOnDesktop);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMobileOpen]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((collapsed) => {
      const nextState = !collapsed;
      window.localStorage.setItem(
        PROJECT_SIDEBAR_COLLAPSED_KEY,
        String(nextState),
      );
      return nextState;
    });
  }, []);

  const openMobile = useCallback(() => setIsMobileOpen(true), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  return {
    isCollapsed,
    isMobileOpen,
    toggleCollapsed,
    openMobile,
    closeMobile,
  };
}
