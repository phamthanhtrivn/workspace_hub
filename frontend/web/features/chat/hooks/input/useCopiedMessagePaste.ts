"use client";

import { useLayoutEffect, useRef, useState, type ClipboardEvent } from "react";
import { toast } from "sonner";
import { useAppSelector } from "@/store/store";
import { MESSAGE_CLIPBOARD_MESSAGES, type PastingMessageFile } from "../../types/message-clipboard.types";
import { downloadCopiedMessageFile, insertCopiedText, readCopiedMessage } from "../../utils/message-clipboard";

interface CopiedMessagePasteOptions {
  chatId: string | null | undefined;
  chatType: string | null;
  onInsertText: (value: string, caret: number) => void;
  uploadFiles: (files: File[], signal?: AbortSignal) => Promise<void>;
}

export function useCopiedMessagePaste({ chatId, chatType, onInsertText, uploadFiles }: CopiedMessagePasteOptions) {
  const userId = useAppSelector((state) => state.auth.userId);
  const contextKey = JSON.stringify([userId, chatType, chatId]);
  const [pending, setPending] = useState<{ contextKey: string; files: PastingMessageFile[] } | null>(null);
  const operations = useRef(new Map<string, AbortController>());
  const selectionFrame = useRef<number | null>(null);
  if (pending && pending.contextKey !== contextKey) {
    setPending(null);
  }

  useLayoutEffect(() => {
    const activeOperations = operations.current;
    return () => {
      if (selectionFrame.current !== null) cancelAnimationFrame(selectionFrame.current);
      activeOperations.forEach((controller) => controller.abort());
      activeOperations.clear();
    };
  }, [contextKey]);

  const files = pending?.contextKey === contextKey ? pending.files : [];
  const removeFile = (id: string) => {
    operations.current.get(id)?.abort();
    operations.current.delete(id);
    setPending((previous) => previous ? { ...previous, files: previous.files.filter((file) => file.id !== id) } : null);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>): boolean => {
    const { hasMarker, message } = readCopiedMessage(event.clipboardData, userId);
    if (!hasMarker) return false;
    if (!message || !chatId) {
      // Let native text pasting continue, but never revive stale attachments.
      toast.error(MESSAGE_CLIPBOARD_MESSAGES.expired);
      return false;
    }
    event.preventDefault();
    const textarea = event.currentTarget;
    const inserted = insertCopiedText(textarea.value, message.content, textarea.selectionStart, textarea.selectionEnd);
    onInsertText(inserted.value, inserted.caret);
    selectionFrame.current = requestAnimationFrame(() => {
      if (textarea.isConnected && textarea.value === inserted.value) textarea.setSelectionRange(inserted.caret, inserted.caret);
    });

    const downloads: PastingMessageFile[] = message.medias.map((media) => ({
      id: crypto.randomUUID(), name: media.name, status: "downloading",
    }));
    setPending((previous) => ({ contextKey, files: [...(previous?.contextKey === contextKey ? previous.files : []), ...downloads] }));
    message.medias.forEach((media, index) => {
      const id = downloads[index].id;
      const controller = new AbortController();
      operations.current.set(id, controller);
      void (async () => {
        try {
          const file = await downloadCopiedMessageFile(media, controller.signal);
          if (controller.signal.aborted) return;
          // The existing uploader allocates a new storage key in the destination.
          const upload = uploadFiles([file], controller.signal);
          setPending((previous) => previous?.contextKey === contextKey
            ? { ...previous, files: previous.files.filter((pendingFile) => pendingFile.id !== id) } : previous);
          await upload;
        } catch (error) {
          if (controller.signal.aborted) return;
          toast.error(error instanceof Error && error.message === MESSAGE_CLIPBOARD_MESSAGES.fileTooLarge
            ? MESSAGE_CLIPBOARD_MESSAGES.fileTooLarge : MESSAGE_CLIPBOARD_MESSAGES.fileFailed);
          setPending((previous) => previous?.contextKey === contextKey
            ? { ...previous, files: previous.files.map((file) => file.id === id ? { ...file, status: "error" } : file) } : previous);
        } finally {
          operations.current.delete(id);
        }
      })();
    });
    return true;
  };

  return {
    files,
    removeFile,
    handlePaste,
    isDownloading: files.some((file) => file.status === "downloading"),
    hasFailedDownloads: files.some((file) => file.status === "error"),
  };
}
