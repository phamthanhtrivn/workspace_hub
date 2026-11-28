"use client";

import { CheckSquare, Paperclip } from "lucide-react";
import type { ChatMessageResponse } from "../../../types/chat.types";
import {
  formatThreadSnippet,
  type ThreadDocumentMetadata,
} from "../../../utils/thread-snippet";

export { formatThreadSnippet } from "../../../utils/thread-snippet";
export type { ThreadSnippet } from "../../../utils/thread-snippet";

export default function ThreadSnippetPreview({
  content,
  message,
  documentMetadata,
  className = "",
}: {
  content: string | undefined | null;
  message?: ChatMessageResponse;
  documentMetadata?: ThreadDocumentMetadata | null;
  className?: string;
}) {
  const snippet = formatThreadSnippet(content, message, documentMetadata);

  if (snippet.isTask) {
    return (
      <span
        className={`flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground bg-info-soft/90 border border-border rounded-lg px-2.5 py-1.5 my-0.5 ${className}`}
      >
        <CheckSquare
          size={13}
          className="text-info-content shrink-0"
          aria-hidden="true"
        />
        <span className="min-w-0 truncate" title={snippet.title}>
          {snippet.title}
        </span>
        {snippet.tag && (
          <span className="ml-auto text-xs font-mono bg-info-soft/90 text-info-content px-1.5 py-0.2 rounded font-semibold shrink-0">
            {snippet.tag}
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`block min-w-0 max-w-full whitespace-normal text-xs text-muted-foreground [overflow-wrap:anywhere] ${className}`}
    >
      {snippet.title !== snippet.attachmentLabel && (
        <span className="block line-clamp-2" title={snippet.title}>
          {snippet.title}
        </span>
      )}
      {snippet.attachmentLabel && (
        <span
          className="flex min-w-0 items-start gap-1.5"
          title={snippet.attachmentLabel}
        >
          <Paperclip size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 line-clamp-2">
            {snippet.attachmentLabel}
          </span>
        </span>
      )}
    </span>
  );
}
