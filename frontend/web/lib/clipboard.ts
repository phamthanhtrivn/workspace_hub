interface ClipboardContent {
  text: string;
  html?: string;
}

export async function copyContentToClipboard({ text, html }: ClipboardContent): Promise<void> {
  if (html !== undefined && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([html], { type: "text/html" }),
      })]);
      return;
    } catch {
      // The copy event below also supports browsers without async HTML writes.
    }
  } else if (html === undefined && navigator.clipboard?.writeText) {
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
  let htmlWritten = false;
  const onCopy = (event: ClipboardEvent) => {
    if (html === undefined || !event.clipboardData) return;
    event.clipboardData.setData("text/plain", text);
    event.clipboardData.setData("text/html", html);
    event.preventDefault();
    htmlWritten = true;
  };
  document.body.appendChild(textarea);
  document.addEventListener("copy", onCopy);
  try {
    textarea.select();
    if (!document.execCommand("copy") || (html !== undefined && !htmlWritten)) {
      throw new Error("Clipboard copy failed");
    }
  } finally {
    document.removeEventListener("copy", onCopy);
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

export async function copyTextToClipboard(text: string): Promise<void> {
  return copyContentToClipboard({ text });
}
