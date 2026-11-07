"use client";

import { useEffect, useRef, useState } from "react";
import { MINI_TIMER_DRAG_SETTINGS, type MiniTimerPosition } from "../utils/mini-timer-position";

/** Keep the portaled timer centered under the workspace header until dragged. */
export function useMiniTimerAnchor(visible: boolean) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [anchorPosition, setAnchorPosition] = useState<MiniTimerPosition | null>(null);
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!visible || !anchor) return;
    const measure = () => {
      const bounds = anchor.getBoundingClientRect();
      const next = { x: bounds.left + bounds.width / 2, y: bounds.top + MINI_TIMER_DRAG_SETTINGS.edgeGap };
      setAnchorPosition(previous => previous?.x === next.x && previous?.y === next.y ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    const frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
  }, [visible]);
  return { anchorRef, anchorPosition };
}
