"use client";

import { useEffect, useRef, useState } from "react";

function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function isDialogTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[role="dialog"], [role="alertdialog"]'));
}

export function useFileDropZone(enabled: boolean, onFiles: (files: File[]) => Promise<void>) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previousEnabled, setPreviousEnabled] = useState(enabled);
  const dragCounter = useRef(0);
  if (previousEnabled !== enabled) {
    setPreviousEnabled(enabled);
    if (!enabled) setIsDraggingOver(false);
  }

  useEffect(() => {
    dragCounter.current = 0;
    if (!enabled) return;
    const reset = () => { dragCounter.current = 0; setIsDraggingOver(false); };
    const enter = (event: DragEvent) => {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      if (isDialogTarget(event.target)) { reset(); return; }
      dragCounter.current++;
      setIsDraggingOver(true);
    };
    const leave = (event: DragEvent) => {
      if (!isFileDrag(event) && dragCounter.current === 0) return;
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0 || (!event.relatedTarget && event.target === document.documentElement)) reset();
    };
    const over = (event: DragEvent) => {
      if (isFileDrag(event)) event.preventDefault();
    };
    const drop = (event: DragEvent) => {
      reset();
      if (!isFileDrag(event)) return;
      event.preventDefault();
      if (isDialogTarget(event.target)) return;
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) void onFiles(files);
    };
    const keyDown = (event: KeyboardEvent) => { if (event.key === "Escape") reset(); };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("dragend", reset);
    window.addEventListener("blur", reset);
    window.addEventListener("keydown", keyDown);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      window.removeEventListener("dragend", reset);
      window.removeEventListener("blur", reset);
      window.removeEventListener("keydown", keyDown);
      dragCounter.current = 0;
    };
  }, [enabled, onFiles]);
  return isDraggingOver;
}
