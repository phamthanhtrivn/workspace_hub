export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back when clipboard permissions are unavailable in this browser.
    }
  }

  const focused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const selection =
    focused instanceof HTMLTextAreaElement ||
    focused instanceof HTMLInputElement
      ? {
          start: focused.selectionStart,
          end: focused.selectionEnd,
          direction: focused.selectionDirection,
        }
      : null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("Clipboard copy failed");
  } finally {
    textarea.remove();
    focused?.focus({ preventScroll: true });
    if (
      selection &&
      selection.start !== null &&
      selection.end !== null &&
      (focused instanceof HTMLTextAreaElement ||
        focused instanceof HTMLInputElement)
    ) {
      focused.setSelectionRange(
        selection.start,
        selection.end,
        selection.direction ?? undefined,
      );
    }
  }
}
