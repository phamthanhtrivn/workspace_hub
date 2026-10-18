"use client";

import { type FocusEvent as ReactFocusEvent, type RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])", "[href]", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");
const MODAL_SELECTOR = '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]';
const POPUP_SELECTOR = '[data-slot="select-content"], [data-slot="popover-content"], [data-slot="dropdown-menu-content"], [data-slot="combobox-content"], [data-slot="tooltip-content"], .EmojiPickerReact';

interface UseModalDialogOptions {
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  lockDocumentScroll?: boolean;
  enabled?: boolean;
  trapFocus?: boolean;
}

let scrollLockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";
let originalDocumentOverflow = "";

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => element.tabIndex >= 0 && !element.closest("[hidden], [inert]") &&
      !element.matches(":disabled") && element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== "hidden");
}

function focusWithoutScroll(element: HTMLElement | null | undefined) {
  element?.focus({ preventScroll: true });
}

function lockScroll() {
  if (scrollLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;
    originalDocumentOverflow = document.documentElement.style.overflow;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function unlockScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return;
  document.body.style.overflow = originalBodyOverflow;
  document.body.style.paddingRight = originalBodyPaddingRight;
  document.documentElement.style.overflow = originalDocumentOverflow;
}

/** Shared by application dialogs and calendar overlays, including nested dialogs. */
export function useModalDialog({ dialogRef, onClose, lockDocumentScroll = true, enabled = true, trapFocus = true }: UseModalDialogOptions) {
  const closeRef = useRef(onClose);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  // Remember the opener before a child's autoFocus runs during the opening commit.
  useEffect(() => {
    const rememberFocus = (event?: FocusEvent) => {
      const active = document.activeElement;
      if (!dialogRef.current && active instanceof HTMLElement && active !== document.body) {
        const modal = active.closest(MODAL_SELECTOR);
        // React autoFocus fires before the parent dialog ref is attached.
        // Its relatedTarget is the opener, not another dialog field.
        if (modal) {
          if (event?.relatedTarget instanceof HTMLElement && !modal.contains(event.relatedTarget)) {
            returnFocusRef.current = event.relatedTarget;
          }
        } else {
          returnFocusRef.current = active;
        }
      }
    };
    rememberFocus();
    document.addEventListener("focusin", rememberFocus);
    return () => document.removeEventListener("focusin", rememberFocus);
  }, [dialogRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!enabled || !dialog) return;
    const active = document.activeElement as HTMLElement | null;
    const previouslyFocused = active && active !== document.body && !dialog.contains(active) ? active : returnFocusRef.current;
    if (lockDocumentScroll) lockScroll();

    const firstFocus = () => focusableElements(dialog).find(element => element.hasAttribute("data-modal-initial-focus")) ??
      focusableElements(dialog)[0] ?? dialog;
    const isTopmost = () => {
      const dialogs = document.querySelectorAll(MODAL_SELECTOR);
      return trapFocus ? dialogs[dialogs.length - 1] === dialog : dialogs.length === 0;
    };
    if (trapFocus) focusWithoutScroll(firstFocus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmost() || event.defaultPrevented ||
        (event.target instanceof Element && event.target.closest(POPUP_SELECTOR))) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (!trapFocus || event.key !== "Tab") return;
      const elements = focusableElements(dialog);
      if (!elements.length) {
        event.preventDefault();
        focusWithoutScroll(dialog);
        return;
      }
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        focusWithoutScroll(last);
      } else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        focusWithoutScroll(first);
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (trapFocus && isTopmost() && event.target instanceof Element &&
        !dialog.contains(event.target) && !event.target.closest(POPUP_SELECTOR)) {
        focusWithoutScroll(firstFocus());
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      if (lockDocumentScroll) unlockScroll();
      // Wait for portal removal and any nested popup's own focus cleanup.
      requestAnimationFrame(() => {
        const modals = document.querySelectorAll(MODAL_SELECTOR);
        const activeModal = modals[modals.length - 1];
        const closed = !dialog.isConnected || dialog.getAttribute("aria-hidden") === "true";
        if (trapFocus && closed && previouslyFocused?.isConnected &&
          (!activeModal || activeModal.contains(previouslyFocused))) focusWithoutScroll(previouslyFocused);
      });
    };
  }, [dialogRef, lockDocumentScroll, enabled, trapFocus]);

  // A freshly keyed dialog has no closed-state effect history. React's focus
  // event still carries the opener when an autoFocus child mounts in its portal.
  return {
    captureOpener(event: ReactFocusEvent<HTMLElement>) {
      if (!returnFocusRef.current && event.relatedTarget instanceof HTMLElement &&
        event.relatedTarget !== document.body && !event.currentTarget.contains(event.relatedTarget)) {
        returnFocusRef.current = event.relatedTarget;
      }
    },
  };
}
