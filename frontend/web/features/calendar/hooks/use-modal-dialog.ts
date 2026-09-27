import { RefObject, useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface UseModalDialogOptions {
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  lockDocumentScroll?: boolean;
}

let modalScrollLockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";
let originalDocumentOverflow = "";

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hidden);
}

function focusWithoutScroll(element: HTMLElement | null | undefined) {
  element?.focus({ preventScroll: true });
}

function lockBackgroundScroll() {
  if (modalScrollLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;
    originalDocumentOverflow = document.documentElement.style.overflow;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  modalScrollLockCount += 1;
}

function unlockBackgroundScroll() {
  modalScrollLockCount = Math.max(0, modalScrollLockCount - 1);
  if (modalScrollLockCount > 0) return;

  document.body.style.overflow = originalBodyOverflow;
  document.body.style.paddingRight = originalBodyPaddingRight;
  document.documentElement.style.overflow = originalDocumentOverflow;
}

export function useModalDialog({
  dialogRef,
  onClose,
  lockDocumentScroll = true,
}: UseModalDialogOptions) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (lockDocumentScroll) {
      lockBackgroundScroll();
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const initialFocus =
      dialog.querySelector<HTMLElement>("[data-modal-initial-focus]") ??
      getFocusableElements(dialog)[0];
    focusWithoutScroll(initialFocus);

    const handleKeyDown = (event: KeyboardEvent) => {
      const openDialogs = document.querySelectorAll<HTMLElement>(
        '[role="dialog"][aria-modal="true"]',
      );
      if (openDialogs[openDialogs.length - 1] !== dialog) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        focusWithoutScroll(last);
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        focusWithoutScroll(first);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lockDocumentScroll) {
        unlockBackgroundScroll();
      }
      if (previouslyFocused && document.contains(previouslyFocused)) {
        focusWithoutScroll(previouslyFocused);
      }
    };
  }, [dialogRef, lockDocumentScroll, onClose]);
}
