"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { clampMiniTimerPosition, MINI_TIMER_DRAG_SETTINGS, type MiniTimerPosition } from "../utils/mini-timer-position";

// Page-lifetime UI state: route changes keep the position; reloading resets it.
const positions = new Map<string, MiniTimerPosition>();
interface PointerDrag { pointerId: number; startX: number; startY: number; origin: MiniTimerPosition; moved: boolean }

export function useMiniTimerDrag(userId: string, visible: boolean) {
  const timerRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<MiniTimerPosition | null>(() => positions.get(userId) ?? null);
  const positionRef = useRef(position);
  const pointer = useRef<PointerDrag | null>(null);
  const suppressClick = useRef(false);
  const savePosition = useCallback((next: MiniTimerPosition) => {
    if (positionRef.current?.x === next.x && positionRef.current?.y === next.y) return;
    positionRef.current = next;
    positions.set(userId, next);
    setPosition(next);
  }, [userId]);
  const boundPosition = useCallback((next: MiniTimerPosition) => {
    const bounds = timerRef.current?.getBoundingClientRect();
    return bounds ? clampMiniTimerPosition(next, bounds, { width: window.innerWidth, height: window.innerHeight }) : next;
  }, []);

  useEffect(() => {
    const timer = timerRef.current;
    if (!visible || !timer) return;
    const clamp = () => { if (positionRef.current) savePosition(boundPosition(positionRef.current)); };
    const observer = new ResizeObserver(clamp);
    observer.observe(timer);
    window.addEventListener("resize", clamp);
    const frame = requestAnimationFrame(clamp);
    return () => { observer.disconnect(); window.removeEventListener("resize", clamp); cancelAnimationFrame(frame); };
  }, [visible, boundPosition, savePosition]);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const bounds = timerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    suppressClick.current = false;
    pointer.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { x: bounds.left, y: bounds.top }, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < MINI_TIMER_DRAG_SETTINGS.activationDistance) return;
    drag.moved = true;
    suppressClick.current = true;
    event.preventDefault();
    savePosition(boundPosition({ x: drag.origin.x + dx, y: drag.origin.y + dy }));
  };
  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointer.current?.pointerId !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onClickCapture = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 && suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  };
  return { timerRef, position, headerHandlers: { onPointerDown, onPointerMove, onPointerUp: finishDrag, onPointerCancel: finishDrag, onLostPointerCapture: finishDrag, onClickCapture } };
}
