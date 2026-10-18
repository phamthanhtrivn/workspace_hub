"use client";

import * as React from "react";
import type { ComponentProps } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "./dialog";
import { cn } from "@/lib/utils";
import { useModalDialog } from "./use-modal-dialog";

export const Sheet = Dialog;
export const SheetTrigger = DialogTrigger;
export const SheetHeader = DialogHeader;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
export const SheetFooter = DialogFooter;

export function SheetContent({ className, side = "right", ...props }: ComponentProps<typeof DialogContent> & { side?: "left" | "right" }) {
  return <DialogContent data-slot="sheet-content" className={cn("inset-y-0 flex h-dvh max-h-dvh w-full max-w-[min(35rem,100vw)] translate-x-0 translate-y-0 flex-col rounded-none", side === "right" ? "left-auto right-0" : "left-0 right-auto", className)} {...props} />;
}

/** A responsive in-flow panel: keeps container-query layout on desktop and
 * enables modal focus/scroll ownership only when the actual canvas is narrow. */
export function SheetPanel({ open, onClose, modal = false, modalBelow, modalContainerSelector, ref, onFocusCapture, ...props }: ComponentProps<"aside"> & { open: boolean; onClose: () => void; modal?: boolean; modalBelow?: number; modalContainerSelector?: string }) {
  const panelRef = React.useRef<HTMLElement>(null);
  const [compact, setCompact] = React.useState(modal);
  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel || modalBelow === undefined) return;
    const canvas = (modalContainerSelector && panel.closest(modalContainerSelector)) || panel.parentElement;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < modalBelow));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [modalBelow, modalContainerSelector]);
  const isModal = modalBelow === undefined ? modal : compact;
  const { captureOpener } = useModalDialog({ dialogRef: panelRef, onClose, enabled: open, trapFocus: isModal, lockDocumentScroll: isModal });
  return <aside ref={(node) => { panelRef.current = node; if (typeof ref === "function") ref(node); else if (ref) ref.current = node; }}
    data-slot="sheet-panel" role={isModal ? "dialog" : "complementary"} aria-modal={isModal && open ? true : undefined} aria-hidden={!open} inert={!open ? true : undefined} tabIndex={-1} onFocusCapture={(event) => { captureOpener(event); onFocusCapture?.(event); }} {...props} />;
}
