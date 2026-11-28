"use client";

import { useEffect, useState, type RefObject } from "react";

export function useElementMinWidth(ref: RefObject<HTMLElement | null>, minimum: number) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setMatches(element.clientWidth >= minimum);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, minimum]);
  return matches;
}
