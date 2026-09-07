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
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hidden);
}

export function useModalDialog({ dialogRef, onClose }: UseModalDialogOptions) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const initialFocus =
      dialog.querySelector<HTMLElement>("[data-modal-initial-focus]") ??
      getFocusableElements(dialog)[0];
    initialFocus?.focus();

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
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [dialogRef, onClose]);
}
